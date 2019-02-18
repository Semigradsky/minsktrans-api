import { getRawFile } from './raw'
import { getFileFromCache, saveFileToCache } from './cache'

const isValidRoute = (route) => {
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

const isValidStop = (stopId, pos, stops) => {
	if ([
		'68811', // ДС Лошица-2
		'211138', // РК Брилевичи
		'15858', // ДС Кунцевщина
		'69176', // ДС Серова
		'133395', // ДС Сухарево-5 (посадки-высадки нет)
		'68909', // ДС Ангарская-4
		'204368', // ДС Дружная(техническая)
		'133383', // РК Люцинская (посадки-высадки нет)
		'297191', // Степянка (посадка пассажиров)
		'58376', // ТЦ Ждановичи
	].includes(stopId)) {
		return false;
	}

	if (pos === 0 && [
		'16007', // Красный Бор(посадки нет)
		'133375', // Национальный аэропорт "Минск" (высадка пассажиров)
		'15384', // Степянка (высадка пассажиров)
		'69517', // ДС Запад-3 (посадки нет)
		'72620', // ДС Запад-3 (высадка пассажиров)
		'133386', // Люцинская (высадка пасссажиров)
		'68866', // ДС Чижовка
	].includes(stopId)) {
		return false;
	}

	if (pos === stops.length - 1 && [
		'73752', // Национальный аэропорт "Минск" (посадка пассажиров)
		'15385', // Степянка (посадка пассажиров)
	].includes(stopId)) {
		return false;
	}

	return true;
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

		validRoutes.forEach((route) => {
			route.stops = route.stops.filter(isValidStop);
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
