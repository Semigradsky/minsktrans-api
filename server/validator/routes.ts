import { logger } from './../logs'
import { getValid, RawRoute } from './../routes'
import allStopsQuery, { StopsQueried } from './../overpass/AllStopsQuery';
import allRoutesQuery, { RoutesQueried, SlaveRoute, MasterRoute } from './../overpass/AllRoutesQuery';

const transportNames = {
	bus: 'Автобус',
	trol: 'Троллейбус',
	tram: 'Трамвай',
}

interface IRoutesViewModel {
	routes: {
		bus: IRouteViewModel[];
		trol: IRouteViewModel[];
		tram: IRouteViewModel[];
	};
}

interface IRouteViewModel {
	routeNum: string;
	routes: IRouteModel[];
	_routes: SlaveRoute[];
	_routesMasters: MasterRoute[];
	isValid: boolean;
	transport: string;
}

interface IRouteModel extends RawRoute {
	name: string;
	isValid: boolean;
}

function attachOSMRelation(allRoutes: RoutesQueried, route: IRouteViewModel) {
	const transport = route.transport === 'trol' ? 'trolleybus' : route.transport;

	if (transport === 'metro') {
		return
	}

	route._routes = allRoutes[transport].routes.filter(x => x.ref === route.routeNum)
	route._routesMasters = allRoutes[transport].masters.filter(x => x.ref === route.routeNum)
}

function validateRoutes(route: IRouteViewModel, stops: string[], osmStops: StopsQueried) {
	if (!route._routes || !route._routesMasters) {
		return false;
	}

	if (route._routes.length === 0 || route._routesMasters.length !== 1) {
		return false;
	}

	return route._routes.some(r => {
		if (stops.length !== r.stops.length) {
			return false;
		}

		return stops.every((refMinskTrans, pos) => {
			if (!osmStops[refMinskTrans]) {
				return false;
			}

			const platformIds = osmStops[refMinskTrans].map(s => (s.platform && s.platform.id));
			return platformIds.includes(r.stops[pos].id);
		});
	});
}


export async function getRoutes() {
	const filteredRoutes = await getValid();

	const validRoutes: IRouteViewModel[] = [];

	let prevRoute: IRouteViewModel | null = null;
	for (let i = 0; i < filteredRoutes.length; i++) {
		const route = filteredRoutes[i] as IRouteModel;
		route.name = `${transportNames[route.transport]} №${route.routeNum} - ${route.routeName}`;

		if (prevRoute && route.routeNum === prevRoute.routeNum && route.transport === prevRoute.transport) {
			prevRoute.routes.push(route);
			continue;
		}

		if (prevRoute) {
			validRoutes.push(prevRoute);
		}

		prevRoute = {
			routeNum: route.routeNum,
			isValid: false,
			routes: [route],
			transport: route.transport,
			_routes: [],
			_routesMasters: [],
		};
	}

	if (prevRoute) {
		validRoutes.push(prevRoute);
	}

	const allRoutes = await allRoutesQuery.do();
	const allStops = await allStopsQuery.do();

	for (const route of validRoutes) {
		attachOSMRelation(allRoutes, route);
		route.routes.forEach(r => {
			r.isValid = validateRoutes(route, r.stops, allStops);
		});

		route.isValid = route.routes.reduce((acc, r) => acc && r.isValid, true)
	}

	['bus', 'tram', 'trolleybus'].map(tr => {
		const transport = tr === 'trolleybus' ? 'trol' : tr;

		allRoutes[tr].routes.forEach(r => {
			if (!r.ref) {
				let unknownRoutesIndex = validRoutes.findIndex(vr => vr.routeNum === '-');
				if (unknownRoutesIndex === -1) {
					validRoutes.unshift({
						_routes: [],
						_routesMasters: [],
						isValid: false,
						routeNum: '-',
						routes: [],
						transport,
					});
					unknownRoutesIndex = 0;
				}
				
				validRoutes[unknownRoutesIndex]._routes.push(r);
				return;
			}

			if (!validRoutes.find(vr => vr.routeNum === r.ref)) {
				validRoutes.push({
					_routes: [r],
					_routesMasters: [],
					isValid: false,
					routeNum: r.ref,
					routes: [],
					transport,
				})
			}
		});

		allRoutes[tr].masters.forEach(m => {
			if (!m.ref) {
				let unknownRoutesIndex = validRoutes.findIndex(vr => vr.routeNum === '-');
				if (unknownRoutesIndex === -1) {
					validRoutes.unshift({
						_routes: [],
						_routesMasters: [],
						isValid: false,
						routeNum: '-',
						routes: [],
						transport,
					});
					unknownRoutesIndex = 0;
				}

				validRoutes[unknownRoutesIndex]._routesMasters.push(m);
				return;
			}

			if (!validRoutes.find(vr => vr.routeNum === m.ref)) {
				validRoutes.push({
					_routes: [],
					_routesMasters: [m],
					isValid: false,
					routeNum: m.ref,
					routes: [],
					transport,
				})
			}
		});
	});

	return validRoutes.reduce((acc, route) => {
		acc[route.transport] = [...acc[route.transport], route];
		return acc;
	}, {
		bus: [] as IRouteViewModel[],
		tram: [] as IRouteViewModel[],
		trol: [] as IRouteViewModel[],
	});
}

export default async function (): Promise<IRoutesViewModel> {
	return {
		routes: await getRoutes()
	};
}
