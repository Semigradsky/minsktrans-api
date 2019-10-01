import { logger } from './../logs'
import * as stops from './../stops'
import allStopsQuery, { StopsQueried } from './../overpass/AllStopsQuery';
import allRouteQuery, { SlaveRoute } from './../overpass/AllRoutesQuery';
import { getValid as getValidRoutes, RawRoute } from './../routes';
import { PT_Platform, PT_Stop, PT_EntrancePass } from '../overpass/BaseQuery';

const transportNames = {
	bus: 'Автобус',
	trol: 'Троллейбус',
	tram: 'Трамвай',
}

interface IRouteViewModel {
	name: string;
	route: RawRoute;
	osmRoutes: Array<{
		relation: SlaveRoute;
		stops: IRouteStopInfo[];
	}>;
	stops: IStopInfo[];
	noMappedStops: IStopInfo[];
	generateOSMLink?: string;
}

interface IRouteStopInfo {
	stop: PT_Stop | null;
	action: string | null;
	title: string | null;
}

interface IStopInfo {
	stop: stops.RawStop;
	names: {
		platform: string | null;
		stopPosition: string | null;
	};
	platform: PT_Platform;
	stopPosition: PT_Stop | null;
	entrancePass: PT_EntrancePass | null;
	invalid: boolean;
	hasntPass: boolean;
	osmLink: string;
	josmLink: string;
	checkDate: string | null;
}

export default async function routeValidator({ routeId }: { routeId: string }) {
	const data = {} as IRouteViewModel;

	const route = (await getValidRoutes()).find(r => r.id === routeId);
	if (!route) {
		return null;
	}

	const allStops = await stops.getValid();

	let osmStops = {} as StopsQueried;

	try {
		osmStops = await allStopsQuery.do();
	} catch (err) {
		logger.error(err);
	}

	const transport = route.transport === 'trol' ? 'trolleybus' : route.transport;

	data.route = route;
	data.name = `${transportNames[route.transport]} №${route.routeNum} - ${route.routeName}`;

	const osmRoutes = ((await allRouteQuery.do())[transport].routes as SlaveRoute[]).filter(r => r.ref === route.routeNum);

	function isEqualRouteNames(a, b) {
		return a.replace(/[^\u0400-\u04FF]/g, '').toLowerCase() === b.replace(/[^\u0400-\u04FF]/g, '').toLowerCase();
	}

	let filteredOsmRoutes = osmRoutes.filter(r => isEqualRouteNames(r.tags.name, data.name));

	if (!filteredOsmRoutes.length) {
		filteredOsmRoutes = osmRoutes;
	}

	data.stops = route.stops.map(s => allStops.find(ss => ss.id === s)).map((stop: stops.RawStop) => {
		const osmStop = (osmStops[stop.id] || [])[0];

		const platform = osmStop && osmStop.platform || null;
		const stopPosition = osmStop && osmStop.stopPosition || null;
		const entrancePass = osmStop && osmStop.entrancePass || null;

		const checkDate = platform && (platform.tags['check_date'] || platform.tags['minsk_PT:checked']) || null;

		return {
			stop,
			names: {
				platform: platform && (platform.tags['name:ru'] || platform.tags.name) || null,
				stopPosition: stopPosition && (stopPosition.tags['name:ru'] || stopPosition.tags.name) || null,
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

	function isEqualStops(osmStop: PT_Stop, stop: stops.RawStop): boolean {
		return osmStop.tags['ref:minsktrans'] === stop.id;
	}

	function mapStops(osmStops: PT_Stop[], stops: IStopInfo[]): IRouteStopInfo[] {
		const stack: IRouteStopInfo[] = [];
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
					title: null,
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
					title: null,
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

	data.osmRoutes = filteredOsmRoutes.map(r => ({
		relation: r,
		stops: mapStops(r.stops, data.stops),
	}));

	if (!data.noMappedStops.length) {
		data.generateOSMLink = generateOSMLink(data.name, transport, route.routeNum, data.stops)
	}

	return data;
}

function generateOSMLink(routeName: string, transport: string, ref: string, stops: IStopInfo[]): string {
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
