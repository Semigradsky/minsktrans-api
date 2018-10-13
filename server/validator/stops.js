import { logger } from './../logs'
import * as stops from './../stops'
import { getValidRoutes } from './routes'
import allStopsQuery from './../overpass/AllStopsQuery';
import allRoutesQuery from './../overpass/AllRoutesQuery';

const transportNames = {
	bus: 'Автобус',
	trol: 'Троллейбус',
	tram: 'Трамвай',
}

function pad(n) { return ("00000000" + n).substr(-8); }
function natural_expand(a) { return a.replace(/\d+/g, pad) }
function natural_compare(a, b) {
    return natural_expand(a).localeCompare(natural_expand(b));
}

const sortFunc = (name) => (a, b) => {
	return natural_compare(a[name] || '', b[name] || '');
}

export async function getValidStops(validRoutes) {
	const s = await stops.getJSON();

	const validStops = [...new Set(validRoutes.reduce((acc, route) => {
		acc = [...acc, ...route.stops];
		return acc;
	}, []))];

	return s.filter((stop) => validStops.includes(stop.id));
}

export default async function () {
	const data = { stops: [] };

	let osmStops = {};

	try {
		osmStops = await allStopsQuery.do();
	} catch (err) {
		logger.error(err);
	}

	const validRoutes = await getValidRoutes();
	const validStops = await getValidStops(validRoutes);
	const allOsmRoutes = await allRoutesQuery.do();

	for (const stop of validStops) {
		const osmStop = osmStops[stop.id];

		let platform = null;
		let stopPosition = null;
		let entrancePass = null;
		let osmRoutes = [];

		if (osmStop) {
			platform = osmStop.platform;
			stopPosition = osmStop.stopPosition;
			entrancePass = osmStop.entrancePass;

			if (osmStop.platform) {
				osmRoutes = [].concat(
					...['bus', 'tram', 'trolleybus'].map(tr =>
						allOsmRoutes[tr].routes.filter(r =>
							r.stops.some(s => s.id === osmStop.platform.id)
						).map(r => ({
							id: r.id,
							ref: r.ref,
							name: r.name,
						}))
					)
				).sort(sortFunc('ref'));
			}
		}

		const routes = validRoutes
			.filter(r => r.stops.includes(stop.id))
			.map(r => ({
				id: r.id,
				routeNum: r.routeNum,
				name: `${transportNames[r.transport]} №${r.routeNum} - ${r.routeName}`,
			})).sort(sortFunc('name'));

		const checkDate = platform ? platform.tags['check_date'] || platform.tags['minsk_PT:checked'] : null;

		data.stops.push({
			osmLink: `https://www.openstreetmap.org/?mlat=${stop.lat}&mlon=${stop.lng}#map=19/${stop.lat + 0.0001}/${stop.lng + 0.0001}`,
			josmLink: `http://127.0.0.1:8111/load_and_zoom?left=${stop.lng - 0.001}&right=${stop.lng + 0.001}&top=${stop.lat + 0.0006}&bottom=${stop.lat - 0.0006}`,
			stop,
			name: stop.name,
			platform,
			stopPosition,
			entrancePass,
			invalid: !platform || !stopPosition || !entrancePass,
			osmRoutes,
			routes,
			checkDate,
		});
	}

	data.stops = data.stops.sort(sortFunc('name'));

	data.countInvalidStops = data.stops.filter(s => s.invalid).length;
	data.percentInvalidStops = Math.ceil((data.countInvalidStops / data.stops.length) * 10000) / 100;

	return data;
}
