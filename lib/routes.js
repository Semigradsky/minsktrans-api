import { getRawFile } from './raw'
import { getFileFromCache, saveFileToCache } from './cache'

export async function getRoutes () {
	try {
		const file = await getFileFromCache('routes.json')
		return JSON.parse(file)
	} catch (err) {
		const file = await getRawFile('routes.txt')
		const lines = file.toString().trim().split('\n').slice(1)

		const routes = []
		let prevRouteNum = ''
		let prevOperator = ''
		for (const line of lines) {
			const [, routeNum, operator, validityPeriods, routeTag, routeType, commercial, routeName, weekdays, id, stops, datestart] =(
				/(.*?);.*?;.*?;.*?;(.*?);(.*?);.*?;(.*?);(.*?);(.*?);(.*?);(.*?);(.*?);.*?;(.*?);.*?;(.*)/.exec(line)
			)

			routes.push({
				id,
				routeNum: routeNum || prevRouteNum,
				operator: operator || prevOperator,
				validityPeriods,
				routeTag,
				routeType,
				commercial,
				routeName,
				weekdays,
				stops: stops ? stops.split(',') : [],
				datestart
			})

			prevRouteNum = routeNum || prevRouteNum
			prevOperator = operator || prevOperator
		}

		await saveFileToCache('routes.json', JSON.stringify(routes, null, 4))

		return routes
	}
}
