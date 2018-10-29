import { logger } from './../logs'
import { getValid } from './../routes'
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

	try {
		allRoutes = await allRoutesQuery.do();
	} catch (err) {
		logger.error(err);
	}

	validRoutes.map(route => attachOSMRelation(allRoutes, route))

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
