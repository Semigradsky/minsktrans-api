import { getRawFile } from './raw'
import { getFileFromCache, saveFileToCache } from './cache'

async function generateCSV () {
	const routes = await getJSON()

	let result = 'ID;RouteNum;Transport;Operator;ValidityPeriods;RouteTag;RouteType;RouteName;Weekdays;RouteStops;Datestart'
	for (const route of routes) {
		const { id, routeNum, transport, operator, validityPeriods, routeTag, routeType, routeName, weekdays, stops, datestart } = route
		result += `\n${id};${routeNum};${transport};${operator};${validityPeriods || ''};${routeTag || ''};${routeType};${routeName};${weekdays || ''};"${stops.join(',')}";${datestart || ''}`
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
			stops: stops ? stops.split(',') : [],
			datestart: datestart || prevDateStart
		})

		prevRouteNum = routeNum || prevRouteNum
		prevTransport = transport || prevTransport
		prevOperator = operator || prevOperator
		prevDateStart = datestart || prevDateStart
	}

	return routes
}

export async function getCSV () {
	try {
		const file = await getFileFromCache('stops.csv')
		return JSON.parse(file)
	} catch (err) {
		const stops = await generateCSV()
		await saveFileToCache('stops.csv', stops)
		return stops
	}
}

export async function getJSON () {
	try {
		const file = await getFileFromCache('routes.json')
		return JSON.parse(file)
	} catch (err) {
		const routes = await generateJSON()
		await saveFileToCache('routes.json', JSON.stringify(routes, null, 4))
		return routes
	}
}
