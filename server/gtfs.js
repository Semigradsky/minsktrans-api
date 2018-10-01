import { getJSON as getStopsJSON } from './stops'
import { getJSON as getRoutesJSON } from './routes'

const TRANSPORT_TYPES = {
	bus: 3,
	metro: 1,
	tram: 0,
	trol: 0,
};

export async function getAgency() {
	let result = 'agency_id,agency_name,agency_url,agency_timezone,agency_lang\n'
	result += 'minsktrans,Минсктранс,http://www.minsktrans.by,Europe/Minsk,ru'
	return result
}

export async function getStops() {
	let result = 'stop_id,stop_code,stop_name,stop_lat,stop_lon\n'

	const stops = await getStopsJSON()

	for (const stop of stops) {
		const { id, name, lng, lat } = stop
		result += [
			id,
			'', // TODO: set stop code from OSM
			name,
			lat,
			lng
		].join(',') + '\n'
	}

	return result
}

export async function getRoutes() {
	let result = 'route_id,route_short_name,route_long_name,route_type\n'

	const routes = await getRoutesJSON()

	for (const route of routes) {
		const { id, routeNum, transport, routeName } = route
		result += [
			id,
			routeNum,
			routeName,
			TRANSPORT_TYPES[transport]
		].join(',') + '\n'
	}

	/*
	route_color
	route_text_color
    "bus": "#dc3131"
    "trol": "#0073ac"
	"tram": "#444444"
	"metro": "#ff0000"
}
	*/

	return result
}

export async function getTrips() {
	// TODO get shape from OSM
	let result = 'route_id,service_id,trip_id\n'
	return result
}

export async function getStopTimes() {
	// TODO
	let result = 'trip_id,arrival_time,departure_time,stop_id,stop_sequence\n'
	return result
}

export async function getCalendar() {
	// TODO
	let result = 'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\n'
	return result
}
