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
		bus: IRouteModel[];
		trol: IRouteModel[];
		tram: IRouteModel[];
	};
}

interface IRouteModel extends RawRoute {
	name: string;
	isValid: boolean;
	_routes: SlaveRoute[];
	_routesMasters: MasterRoute[];
}

function attachOSMRelation(allRoutes: RoutesQueried, route: IRouteModel) {
	const transport = route.transport === 'trol' ? 'trolleybus' : route.transport;

	if (transport === 'metro') {
		return
	}

	route._routes = allRoutes[transport].routes.filter(x => x.ref === route.routeNum)
	route._routesMasters = allRoutes[transport].masters.filter(x => x.ref === route.routeNum)
}

function validateRoutes(route: IRouteModel, osmStops: StopsQueried) {
	if (!route._routes || !route._routesMasters) {
		return false;
	}

	if (route._routes.length === 0 || route._routesMasters.length !== 1) {
		return false;
	}

	return route._routes.some(r => {
		if (route.stops.length !== r.stops.length) {
			return false;
		}

		return route.stops.every((refMinskTrans, pos) => {
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

	const validRoutes: IRouteModel[] = [];

	let routes: IRouteModel[] = [];
	let prevRoute: IRouteModel | null = null;
	for (let i = 0; i < filteredRoutes.length; i++) {
		const route = filteredRoutes[i] as IRouteModel;

		if (!!prevRoute && route.routeNum === prevRoute.routeNum) {
			route.name = `${transportNames[route.transport]} №${route.routeNum} - ${route.routeName}`;
			routes.push(route);
		} else {
			routes = []

			validRoutes.push(route);

			prevRoute = route;
			route.name = `${transportNames[route.transport]} №${route.routeNum} - ${route.routeName}`;
			routes.push(route);
		}
	}

	const allRoutes = await allRoutesQuery.do();
	const allStops = await allStopsQuery.do();

	for (const route of validRoutes) {
		attachOSMRelation(allRoutes, route);
		route.isValid = validateRoutes(route, allStops);
	}

	return validRoutes.reduce((acc, route) => {
		acc[route.transport] = [...acc[route.transport], route];
		return acc;
	}, {
		bus: [] as IRouteModel[],
		tram: [] as IRouteModel[],
		trol: [] as IRouteModel[],
	});
}

export default async function (): Promise<IRoutesViewModel> {
	return {
		routes: await getRoutes()
	};
}
