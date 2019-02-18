import { logger } from './../logs'
import { getValid } from './../routes'
import allStopsQuery from './../overpass/AllStopsQuery';
import allRoutesQuery from './../overpass/AllRoutesQuery';

const transportNames = {
	bus: 'Автобус',
	trol: 'Троллейбус',
	tram: 'Трамвай',
}

function attachOSMRelation(allRoutes, route) {
	const transport = route.transport === 'trol' ? 'trolleybus' : route.transport;

	if (transport === 'metro') {
		return
	}

	route._routes = allRoutes[transport].routes.filter(x => x.ref === route.routeNum)
	route._routesMasters = allRoutes[transport].masters.filter(x => x.ref === route.routeNum)
}

function validateRoutes(route, osmStops) {
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
	const filteredRoutes = JSON.parse(await getValid());

	const validRoutes = [];

	let routes = [];
	let prevRoute = {};
	for (let i = 0; i < filteredRoutes.length; i++) {
		const route = filteredRoutes[i];

		if (route.routeNum === prevRoute.routeNum) {
			route.name = `${transportNames[route.transport]} №${route.routeNum} - ${route.routeName}`;
			routes.push(route);
		} else {
			prevRoute.routes = routes;
			routes = []

			validRoutes.push(route);

			prevRoute = route;
			route.name = `${transportNames[route.transport]} №${route.routeNum} - ${route.routeName}`;
			routes.push(route);
		}
	}
	prevRoute.routes = routes;

	let allRoutes = [];
	let allStops = [];

	try {
		allRoutes = await allRoutesQuery.do();
		allStops = await allStopsQuery.do();
	} catch (err) {
		logger.error(err);
	}

	for (const route of validRoutes) {
		attachOSMRelation(allRoutes, route);
		route.isValid = validateRoutes(route, allStops);
	}

	return validRoutes.reduce((acc, route) => {
		acc[route.transport] = [...acc[route.transport], route];
		return acc;
	}, {
		bus: [],
		tram: [],
		trol: [],
	});
}

export default async function () {
	const data = {};

	data.routes = await getRoutes();

	return data;
}
