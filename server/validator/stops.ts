import { logger } from './../logs'
import { getValid as getValidStops, RawStop } from './../stops'
import { getValid as getValidRoutes } from './../routes'
import allStopsQuery from './../overpass/AllStopsQuery';
import allRoutesQuery from './../overpass/AllRoutesQuery';
import { PT_Stop, PT_EntrancePass } from '../overpass/BaseQuery';

const transportNames = {
	bus: 'Автобус',
	trol: 'Троллейбус',
	tram: 'Трамвай',
}

interface IStopsViewModel {
	stops: IStopInfo[];
	countInvalidStops: number;
	percentInvalidStops: number;
	countHasntPassStops: number;
	percentHasntPassStops: number;
}

interface IStopInfo {
	osmLink: string;
	josmLink: string;
	stop: RawStop;
	name: string;
	names: {
		platform: string | null;
		stopPosition: string | null;
	}
	platform: PT_Stop | null;
	stopPosition: PT_Stop | null;
	entrancePass: PT_EntrancePass | null;
	invalid: boolean;
	hasntPass: boolean;
	osmRoutes: IRouteInfo[];
	routes: Array<{
		id: string;
		routeNum: string;
		name: string;
	}>

	checkDate: string | null;
}

interface IRouteInfo {
	id: string;
	ref: string;
	name: string;
}

function pad(n) { return ("00000000" + n).substr(-8); }
function natural_expand(a) { return a.replace(/\d+/g, pad) }
function natural_compare(a, b) {
    return natural_expand(a).localeCompare(natural_expand(b));
}

const sortFunc = (name) => (a, b) => {
	return natural_compare(a[name] || '', b[name] || '');
}

export default async function () {
	const data = { stops: [] as IStopInfo[] } as IStopsViewModel;

	const osmStops = await allStopsQuery.do();
	const validRoutes = await getValidRoutes();
	const validStops = await getValidStops();
	const allOsmRoutes = await allRoutesQuery.do();

	for (const stop of validStops) {
		const osmStop = (osmStops[stop.id] || [])[0];

		let platform: PT_Stop | null = null;
		let stopPosition: PT_Stop | null = null;
		let entrancePass: PT_EntrancePass | null = null;
		let osmRoutes: IRouteInfo[] = [];

		if (osmStop) {
			platform = osmStop.platform || null;
			stopPosition = osmStop.stopPosition || null;
			entrancePass = osmStop.entrancePass || null;

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
			names: {
				platform: platform && (platform.tags['name:ru'] || platform.tags.name),
				stopPosition: stopPosition && (stopPosition.tags['name:ru'] || stopPosition.tags.name),
			},
			platform,
			stopPosition,
			entrancePass,
			invalid: !platform || !stopPosition,
			hasntPass: !entrancePass,
			osmRoutes,
			routes,
			checkDate,
		});
	}

	data.stops = data.stops.sort(sortFunc('name'));

	data.countInvalidStops = data.stops.filter(s => s.invalid).length;
	data.percentInvalidStops = Math.ceil((data.countInvalidStops / data.stops.length) * 10000) / 100;

	data.countHasntPassStops = data.stops.filter(s => s.hasntPass).length;
	data.percentHasntPassStops = Math.ceil((data.countHasntPassStops / data.stops.length) * 10000) / 100;

	return data;
}
