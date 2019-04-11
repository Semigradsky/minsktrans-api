import { getRawFile } from './raw'
import { getFileFromCache, saveFileToCache } from './cache'
import { getAll as getAllStops } from './stops';

function isValidRoute(route) {
	if (route.transport === 'metro') {
		return false;
	}

	if (!['A>B', 'B>A'].includes(route.routeType)) {
		return false;
	}

	if (route.stops.length <= 2) {
		return false;
	}

	if (!route.validityPeriods) {
		return true;
	}

	const now = Date.now() / (1000 * 60 * 60 * 24);
	const from = route.validityPeriods.from;
	const to = route.validityPeriods.to;

	if (from > now) {
		return false; // start in future
	}

	if (to && to < now) {
		return false; // ended
	}

	return true;
}

function isValidStop(allStops, stopId, pos, stops) {
	const stop = allStops.find(stop => stop.id === stopId);
	if (!stop || stop.name.includes('(посадки-высадки нет)') || stop.name.includes('(техническая)')) {
		return false;
	}

	if ([
		'68811', // ДС Лошица-2
		'211138', // РК Брилевичи
		'15858', // ДС Кунцевщина
		'69176', // ДС Серова
		'68909', // ДС Ангарская-4
		'297191', // Степянка (посадка пассажиров)
		'58376', // ТЦ Ждановичи
	].includes(stopId)) {
		return false;
	}

	if (pos === 0) {
		if (stop.name.includes('(посадки нет)') || stop.name.includes('(высадка пассажиров)')) {
			return false;
		}

		if ([
			'68866', // ДС Чижовка
		].includes(stopId)) {
			return false;
		}
	}

	if (pos === stops.length - 1) {
		if (stop.name.includes('(посадка пассажиров)') || stop.name.includes('(посадка)'))

		if ([
			'15385', // Степянка
		].includes(stopId)) {
			return false;
		}
	}

	return true;
}

function fixStops(allStops, stops) {
	const stopsWithNames = stops.map(stop => ({
		id: stop,
		name: allStops.find(x => x.id === stop).name,
	}));

	const startStop = stopsWithNames.findIndex(stop => stop.name.includes('(посадка пассажиров)') || stop.name.includes('(посадка)'));
	const endStop = stopsWithNames.findIndex(stop => stop.name.includes('(высадка пассажиров)'));

	if (endStop > 0 && endStop < startStop) {
		return stops.slice(0, endStop + 1);
	}

	if (startStop === 1) {
		return stops.slice(startStop);
	}

	if (endStop === stops.length - 2) {
		return stops.slice(0, -1);
	}

	return stops;
}

async function generateCSV () {
	const routes = JSON.parse(await getJSON())

	let result = 'ID;RouteNum;Transport;Operator;ValidityPeriodsFrom;ValidityPeriodsFromTo;RouteTag;RouteType;RouteName;Weekdays;RouteStops;Datestart'
	for (const route of routes) {
		let { id, routeNum, transport, operator, validityPeriods, routeTag, routeType, routeName, weekdays, stops, datestart } = route

		const validityPeriodsFrom = validityPeriods && validityPeriods.from || ''
		const validityPeriodsTo = validityPeriods && validityPeriods.to || ''
		routeTag = routeTag || ''
		weekdays = weekdays || ''
		stops = `"${stops.join(',')}"`
		datestart = datestart || ''

		result += `\n${id};${routeNum};${transport};${operator};${validityPeriodsFrom};${validityPeriodsTo};${routeTag};${routeType};${routeName};${weekdays};${stops};${datestart}`
	}

	return result
}

function formatValidityPeriods(validityPeriods) {
	const periods = validityPeriods.split(',')

	return {
		from: +periods[0],
		to: !periods[1] ? undefined : (+periods[0] + periods[1]),
	};
}

const formatId = (id) => {
	const synonims = {
		'133119': '16060',
		'191178': '15999',
		'193108': '15501',
		'133204': '14619',
		'133205': '14622',
		'193111': '15540',
		'294505': '73866', // Каменная Горка-5
	};

	if (id in synonims) {
		return synonims[id];
	}

	return id;
}

async function generateJSON () {
	const file = await getRawFile('routes.txt')
	const lines = file.toString().trim().split('\n').slice(1)

	const routes = []
	let prevRouteNum = ''
	let prevTransport = ''
	let prevOperator = ''
	let prevDateStart = undefined
	for (const line of lines) {
		const [, routeNum, transport, operator, validityPeriods, routeTag, routeType, routeName, weekdays, id, stops, datestart] =(
			/(.*?);.*?;.*?;(.*?);(.*?);(.*?);.*?;(.*?);(.*?);.*?;(.*?);(.*?);(.*?);.*?;(.*?);.*?;(.*)/.exec(line)
		)

		routes.push({
			id,
			transport: transport || prevTransport,
			routeNum: routeNum || prevRouteNum,
			operator: operator || prevOperator,
			validityPeriods: !validityPeriods ? undefined : formatValidityPeriods(validityPeriods),
			routeTag: routeTag === '' ? undefined : Number(routeTag),
			routeType,
			routeName,
			weekdays: weekdays === '' ? undefined : weekdays,
			stops: stops ? stops.split(',').map(formatId) : [],
			datestart: datestart || prevDateStart
		})

		prevRouteNum = routeNum || prevRouteNum
		prevTransport = transport || prevTransport
		prevOperator = operator || prevOperator
		prevDateStart = datestart || prevDateStart
	}

	return routes
}

export async function getValid() {
	try {
		return await getFileFromCache('routes-valid.json')
	} catch (err) {
		let validRoutes = JSON.parse(await getJSON()).filter(isValidRoute).filter((route, pos, validRoutes) => {
			const stopsStr = route.stops.join(',');
			return validRoutes.findIndex((r) => stopsStr === r.stops.join(',') && r.routeNum === route.routeNum) === pos;
		});

		const allStops = await getAllStops();

		validRoutes.forEach((route) => {
			route.stops = fixStops(allStops, route.stops.filter((stopId, pos, stops) => isValidStop(allStops, stopId, pos, stops)));
		});

		validRoutes = JSON.stringify(validRoutes, null, 4)

		await saveFileToCache('routes-valid.json', validRoutes)
		return validRoutes
	}
}

export async function getCSV () {
	try {
		return await getFileFromCache('stops.csv')
	} catch (err) {
		const stops = await generateCSV()
		await saveFileToCache('stops.csv', stops)
		return stops
	}
}

export async function getJSON () {
	try {
		return await getFileFromCache('routes.json')
	} catch (err) {
		const routes = JSON.stringify(await generateJSON(), null, 4)
		await saveFileToCache('routes.json', routes)
		return routes
	}
}
