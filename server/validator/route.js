import { logger } from './../logs'
import * as stops from './../stops'
import allStopsQuery from './../overpass/AllStopsQuery';
import routeQuery from './../overpass/RouteQuery';
import { getValidRoutes } from './routes';

const transportNames = {
	bus: 'Автобус',
	trol: 'Троллейбус',
	tram: 'Трамвай',
}

export default async function routeValidator({ routeId }) {
	const data = {};

	const route = (await getValidRoutes()).find(r => r.id === routeId);
	if (!route) {
		return null;
	}

	const allStops = await stops.getJSON();

	let osmStops = {};

	try {
		osmStops = await allStopsQuery.do();
	} catch (err) {
		logger.error(err);
	}

	const transport = route.transport === 'trol' ? 'trolleybus' : route.transport;

	data.route = route;
	data.name = `${transportNames[route.transport]} №${route.routeNum} - ${route.routeName}`;

	data.osmRoutes = (await routeQuery.do(route.routeNum, transport)).map(r => ({
		relation: r.relation,
		stops: r.stops.filter(s => s.tags.highway === 'bus_stop' || s.tags.railway === 'tram_stop')
	}));

	function isEqualRouteNames(a, b) {
		return a.replace(/[^\u0400-\u04FF]/g, '').toLowerCase() === b.replace(/[^\u0400-\u04FF]/g, '').toLowerCase();
	}

	const filteredOsmRoutes = data.osmRoutes.filter(r => isEqualRouteNames(r.relation.tags.name, data.name));

	if (filteredOsmRoutes.length) {
		data.osmRoutes = filteredOsmRoutes;
	}

	data.stops = route.stops.map(s => allStops.find(ss => ss.id === s)).map(stop => {
		const osmStop = osmStops[stop.id];

		let platform = null;
		let stopPosition = null;
		let entrancePass = null;

		if (osmStop) {
			platform = osmStop.platform;
			stopPosition = osmStop.stopPosition;
			entrancePass = osmStop.entrancePass;
		}

		return {
			stop,
			platform,
			stopPosition,
			entrancePass,
			invalid: !platform || !stopPosition || !entrancePass,
			osmLink: `https://www.openstreetmap.org/?mlat=${stop.lat}&mlon=${stop.lng}#map=19/${stop.lat + 0.0001}/${stop.lng + 0.0001}`,
			josmLink: `http://127.0.0.1:8111/load_and_zoom?left=${stop.lng - 0.001}&right=${stop.lng + 0.001}&top=${stop.lat + 0.0006}&bottom=${stop.lat - 0.0006}`,
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
		relation: r.relation,
		stops: mapStops(r.stops, data.stops),
	}));

	return data;
}
