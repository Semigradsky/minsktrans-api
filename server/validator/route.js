import { logger } from './../logs'
import * as stops from './../stops'
import allStopsQuery from './../overpass/AllStopsQuery';
import allRouteQuery from './../overpass/AllRoutesQuery';
import { getValid as getValidRoutes } from './../routes';

const transportNames = {
	bus: 'Автобус',
	trol: 'Троллейбус',
	tram: 'Трамвай',
}

export default async function routeValidator({ routeId }) {
	const data = {};

	const route = JSON.parse(await getValidRoutes()).find(r => r.id === routeId);
	if (!route) {
		return null;
	}

	const allStops = JSON.parse(await stops.getJSON());

	let osmStops = {};

	try {
		osmStops = await allStopsQuery.do();
	} catch (err) {
		logger.error(err);
	}

	const transport = route.transport === 'trol' ? 'trolleybus' : route.transport;

	data.route = route;
	data.name = `${transportNames[route.transport]} №${route.routeNum} - ${route.routeName}`;

	data.osmRoutes = (await allRouteQuery.do())[transport].routes.filter(r => r.ref === route.routeNum);

	function isEqualRouteNames(a, b) {
		return a.replace(/[^\u0400-\u04FF]/g, '').toLowerCase() === b.replace(/[^\u0400-\u04FF]/g, '').toLowerCase();
	}

	const filteredOsmRoutes = data.osmRoutes.filter(r => isEqualRouteNames(r.tags.name, data.name));

	if (filteredOsmRoutes.length) {
		data.osmRoutes = filteredOsmRoutes;
	}

	data.stops = route.stops.map(s => allStops.find(ss => ss.id === s)).map(stop => {
		const osmStop = (osmStops[stop.id] || [])[0];

		let platform = null;
		let stopPosition = null;
		let entrancePass = null;

		if (osmStop) {
			platform = osmStop.platform;
			stopPosition = osmStop.stopPosition;
			entrancePass = osmStop.entrancePass;
		}

		const checkDate = platform ? platform.tags['check_date'] || platform.tags['minsk_PT:checked'] : null;

		return {
			stop,
			names: {
				platform: platform && (platform.tags['name:ru'] || platform.tags.name),
				stopPosition: stopPosition && (stopPosition.tags['name:ru'] || stopPosition.tags.name),
			},
			platform,
			stopPosition,
			entrancePass,
			invalid: !platform || !stopPosition,
			hasntPass: !entrancePass,
			osmLink: `https://www.openstreetmap.org/?mlat=${stop.lat}&mlon=${stop.lng}#map=19/${stop.lat + 0.0001}/${stop.lng + 0.0001}`,
			josmLink: `http://127.0.0.1:8111/load_and_zoom?left=${stop.lng - 0.001}&right=${stop.lng + 0.001}&top=${stop.lat + 0.0006}&bottom=${stop.lat - 0.0006}`,
			checkDate,
		};
	});
	data.noMappedStops = data.stops.filter(s => !s.platform);

	function isEqualStops(osmStop, stop) {
		return osmStop.tags['ref:minsktrans'] === stop.id;
	}

	function mapStops(osmStops, stops) {
		const stack = [];
		let osmStopsPtr = 0;
		let stopsPtr = 0;

		while (stopsPtr < stops.length) {
			if (osmStopsPtr >= osmStops.length) {
				for (let j = stopsPtr; j < stops.length; j++) {
					stack.push({
						stop: null,
						action: `<<< ${stops[j].stop.name}`,
						title: 'Добавить остановку'
					});
				}
				break;
			}

			if (isEqualStops(osmStops[osmStopsPtr], stops[stopsPtr].stop)) {
				stack.push({
					stop: osmStops[osmStopsPtr],
					action: null,
				});
				osmStopsPtr++;
				stopsPtr++;
				continue;
			}

			let founded = false;
			let i;
			for (i = osmStopsPtr; i < osmStops.length; i++) {
				if (isEqualStops(osmStops[i], stops[stopsPtr].stop)) {
					founded = true;
					break;
				}
			}

			if (founded) {
				for (let j = osmStopsPtr; j < i; j++) {
					stack.push({
						stop: osmStops[j],
						action: 'X   ',
						title: 'Удалить остановку'
					});
				}
				stack.push({
					stop: osmStops[i],
					action: null,
				});
				osmStopsPtr = i;

				osmStopsPtr++;
				stopsPtr++;
			} else {
				stack.push({
					stop: null,
					action: `<<<   ${stops[stopsPtr].stop.name}`,
					title: 'Добавить остановку'
				});
				stopsPtr++;
			}
		}

		if (osmStopsPtr < osmStops.length) {
			for (let i = osmStopsPtr; i < osmStops.length; i++) {
				stack.push({
					stop: osmStops[i],
					action: 'X',
					title: 'Удалить остановку'
				});
			}
		}

		return stack;
	}

	data.osmRoutes = data.osmRoutes.map(r => ({
		relation: r,
		stops: mapStops(r.stops, data.stops),
	}));

	if (!data.noMappedStops.length) {
		data.generateOSMLink = generateOSMLink(data.name, transport, route.routeNum, data.stops)
	}

	return data;
}

function generateOSMLink(routeName, transport, ref, stops) {
	const relationId = -Math.ceil((Math.random() * 100000));

	const osmData = `<?xml version='1.0' encoding='UTF-8'?>
<osm version='0.6' generator='JOSM'>
	<relation id='${relationId}' action='modify' visible='true'>` + (stops.map((s, i) => {
		const isFirst = i === 0;
		const isLast = i === stops.length - 1;
		const stopRole = isFirst ? 'stop_entry_only' : isLast ? 'stop_exit_only' : 'stop';
		const platformRole = isFirst ? 'platform_entry_only' : isLast ? 'platform_exit_only' : 'platform';

		return (
			(s.stopPosition ? `<member type='node' ref='${s.stopPosition.id}' role='${stopRole}' />\n` : '') +
			`<member type='${s.platform.type}' ref='${s.platform.id}' role='${platformRole}' />`
		);
	})) + `
		<tag k='name' v='${routeName}' />
		<tag k='route' v='${transport}' />
		<tag k='type' v='route' />
		<tag k='public_transport:version' v='2' />
		<tag k='operator' v='ГП &quot;Минсктранс&quot;' />
		<tag k='ref' v='${ref}' />
	</relation>
</osm>`;

	return `http://127.0.0.1:8111/load_data?new_layer=false&data=${encodeURIComponent(osmData)}`;
}
