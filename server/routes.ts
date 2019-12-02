import { getRawFile } from './raw'
import { getFileFromCache, saveFileToCache } from './cache'
import { getAll as getAllStops, RawStop } from './stops';

export type RawRoute = {
	id: string;
	transport: RawTransports;
	routeNum: string;
	operator: string;
	routeTag?: number;
	validityPeriods?: ValidityPeriods;
	routeType: string;
	routeName: string;
	weekdays?: string;
	stops: string[];
	datestart: string;
}

type RawTransports = 'bus' | 'tram' | 'trol' | 'metro';

type ValidityPeriods = {
	from: number;
	to?: number;
}

function isStartStop(name: string): boolean {
	return name.includes('(посадка пассажиров)') || name.includes('(посадка)') || name.includes('(посадка пасс.)')
}

function isEndStop(name: string): boolean {
	return name.includes('(посадки нет)') || name.includes('(высадка пассажиров)') || name.includes('(высадка пасс.)')
}

function isValidRoute(route: RawRoute): boolean {
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

function isValidStop(allStops: RawStop[], stopId: string, pos: number, stops: string[]) {
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
		if (isEndStop(stop.name)) {
			return false;
		}

		if ([
			'68866', // ДС Чижовка
		].includes(stopId)) {
			return false;
		}
	}

	if (pos === stops.length - 1) {
		if (isStartStop(stop.name)) {
			return false;
		}

		if ([
			'15385', // Степянка
		].includes(stopId)) {
			return false;
		}
	}

	return true;
}

function fixStops(allStops: RawStop[], stops: string[]): string[] {
	const stopsWithNames = stops.map(stop => ({
		id: stop,
		name: allStops.find(x => x.id === stop)!.name,
	}));

	const startStop = stopsWithNames.findIndex(stop => isStartStop(stop.name));
	const endStop = stopsWithNames.findIndex(stop => isEndStop(stop.name));

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

async function generateCSV (): Promise<string> {
	const routes: RawRoute[] = JSON.parse(await getJSON())

	let result = 'ID;RouteNum;Transport;Operator;ValidityPeriodsFrom;ValidityPeriodsFromTo;RouteTag;RouteType;RouteName;Weekdays;RouteStops;Datestart'
	for (const route of routes) {
		let { id, routeNum, transport, operator, validityPeriods, routeTag, routeType, routeName, weekdays, stops, datestart } = route

		const validityPeriodsFrom = validityPeriods && validityPeriods.from || ''
		const validityPeriodsTo = validityPeriods && validityPeriods.to || ''
		const routeTagStr = routeTag || ''
		weekdays = weekdays || ''
		const stopsStr = `"${stops.join(',')}"`
		datestart = datestart || ''

		result += `\n${id};${routeNum};${transport};${operator};${validityPeriodsFrom};${validityPeriodsTo};${routeTagStr};${routeType};${routeName};${weekdays};${stopsStr};${datestart}`
	}

	return result
}

function formatValidityPeriods(validityPeriods: string): ValidityPeriods {
	const periods = validityPeriods.split(',')

	return {
		from: +periods[0],
		to: !periods[1] ? undefined : (+periods[0] + +periods[1]),
	};
}

const formatId = (id: string): string => {
	const synonims = {
		'133119': '16060',
		'191178': '15999',
		'193108': '15501',
		'133204': '14619',
		'133205': '14622',
		'193111': '15540',
		'294505': '73866', // Каменная Горка-5
		'297273': '69517', // ДС ''Запад-3''
		'297262': '297265', // Боровлянская школа №3
		'298016': '15562', // ДС ''Одоевского''
		'294624': '133183', // ТЦ "Ждановичи" (высадка пассажиров)
	};

	if (id in synonims) {
		return synonims[id];
	}

	return id;
}

async function generateJSON (): Promise<RawRoute[]> {
	const file = await getRawFile('routes.txt')
	const lines = file.toString().trim().split('\n').slice(1)

	const routes: RawRoute[] = []
	let prevRouteNum = ''
	let prevTransport = ''
	let prevOperator = ''
	let prevDateStart: string | undefined = undefined
	for (const line of lines) {
		const [, routeNum, transport, operator, validityPeriods, routeTag, routeType, routeName, weekdays, id, stops, datestart] =(
			/(.*?);.*?;.*?;(.*?);(.*?);(.*?);.*?;(.*?);(.*?);.*?;(.*?);(.*?);(.*?);.*?;(.*?);.*?;(.*)/.exec(line)!
		)

		routes.push({
			id,
			transport: (transport || prevTransport) as RawTransports,
			routeNum: routeNum || prevRouteNum,
			operator: operator || prevOperator,
			validityPeriods: !validityPeriods ? undefined : formatValidityPeriods(validityPeriods),
			routeTag: routeTag === '' ? undefined : Number(routeTag),
			routeType,
			routeName,
			weekdays: weekdays === '' ? undefined : weekdays,
			stops: stops ? stops.split(',').map(formatId) : [],
			datestart: datestart || prevDateStart!
		})

		prevRouteNum = routeNum || prevRouteNum
		prevTransport = transport || prevTransport
		prevOperator = operator || prevOperator
		prevDateStart = datestart || prevDateStart
	}

	return routes
}

export async function getValid(): Promise<RawRoute[]> {
	try {
		return JSON.parse(await getFileFromCache('routes-valid.json'));
	} catch (err) {
		const validRoutes = await generateValid()

		const validRoutesStr = JSON.stringify(validRoutes, null, 4)
		await saveFileToCache('routes-valid.json', validRoutesStr)
		return validRoutes
	}
}

export async function getValidAsString(): Promise<string> {
	try {
		return await getFileFromCache('routes-valid.json')
	} catch (err) {
		const validRoutes = await generateValid()

		const validRoutesStr = JSON.stringify(validRoutes, null, 4)
		await saveFileToCache('routes-valid.json', validRoutesStr)
		return validRoutesStr
	}
}

async function generateValid(): Promise<RawRoute[]> {
	let validRoutes: RawRoute[] = JSON.parse(await getJSON()).filter(isValidRoute).filter((route: RawRoute, pos: number, validRoutes: RawRoute[]) => {
		const stopsStr = route.stops.join(',');
		return validRoutes.findIndex((r) => stopsStr === r.stops.join(',') && r.routeNum === route.routeNum) === pos;
	});

	const allStops = await getAllStops();

	validRoutes.forEach((route) => {
		route.stops = fixStops(allStops, route.stops.filter((stopId, pos, stops) => isValidStop(allStops, stopId, pos, stops)));
	});

	return validRoutes;
}

export async function getCSV (): Promise<string> {
	try {
		return await getFileFromCache('stops.csv')
	} catch (err) {
		const stops = await generateCSV()
		await saveFileToCache('stops.csv', stops)
		return stops
	}
}

export async function getJSON (): Promise<string> {
	try {
		return await getFileFromCache('routes.json')
	} catch (err) {
		const routes = JSON.stringify(await generateJSON(), null, 4)
		await saveFileToCache('routes.json', routes)
		return routes
	}
}
