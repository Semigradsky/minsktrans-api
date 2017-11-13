import { getRawFile } from './raw'
import { getFileFromCache, saveFileToCache } from './cache'

async function getCSV () {
	try {
		const file = await getFileFromCache('stops.csv')
		return JSON.parse(file)
	} catch (err) {
		const stops = await generateCSV()
		await saveFileToCache('stops.csv', stops)
		return stops
	}
}

async function generateCSV () {
	const routes = await getJSON()

	let result = 'ID;RouteNum;Operator;ValidityPeriods;RouteTag;RouteType;RouteName;Weekdays;RouteStops;Datestart'
	for (const route of routes) {
		const { id, routeNum, operator, validityPeriods, routeTag, routeType, routeName, weekdays, stops, datestart } = route
		result += `\n${id};${routeNum};${operator};${validityPeriods || ''};${routeTag || ''};${routeType};${routeName};${weekdays || ''};"${stops.join(',')}";${datestart || ''}`
	}

	return result
}

async function getJSON () {
	try {
		const file = await getFileFromCache('routes.json')
		return JSON.parse(file)
	} catch (err) {
		const routes = await generateJSON()
		await saveFileToCache('routes.json', JSON.stringify(routes, null, 4))
		return routes
	}
}

async function generateJSON () {
	const file = await getRawFile('routes.txt')
	const lines = file.toString().trim().split('\n').slice(1)

	const routes = []
	let prevRouteNum = ''
	let prevOperator = ''
	for (const line of lines) {
		const [, routeNum, operator, validityPeriods, routeTag, routeType, routeName, weekdays, id, stops, datestart] =(
			/(.*?);.*?;.*?;.*?;(.*?);(.*?);.*?;(.*?);(.*?);.*?;(.*?);(.*?);(.*?);.*?;(.*?);.*?;(.*)/.exec(line)
		)

		routes.push({
			id,
			routeNum: routeNum || prevRouteNum,
			operator: operator || prevOperator,
			validityPeriods: validityPeriods === '' ? undefined : validityPeriods,
			routeTag: routeTag === '' ? undefined : Number(routeTag),
			routeType,
			routeName,
			weekdays: weekdays === '' ? undefined : weekdays,
			stops: stops ? stops.split(',') : [],
			datestart: datestart === '' ? undefined : datestart
		})

		prevRouteNum = routeNum || prevRouteNum
		prevOperator = operator || prevOperator
	}

	return routes
}

export async function getRoutes (type) {
	switch (type) {
		case 'json':
			return await getJSON()
		case 'csv':
			return await getCSV()
		default:
			throw Error(`Unknow type for 'routes': ${type}`)
	}
}
