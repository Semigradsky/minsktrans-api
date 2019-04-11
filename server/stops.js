import { getRawFile } from './raw'
import { getFileFromCache, saveFileToCache } from './cache'
import { getValid as getValidRoutes } from './routes'

async function generateCSV () {
	const stops = JSON.parse(await getJSON())

	let result = 'ID;Name;Lng;Lat;Street;Stops'
	for (const stop of stops) {
		let { id, name, lng, lat, street, stops } = stop

		street = street ? `"${street}"` : ''
		stops = `"${stops.join(',')}"`

		result += `\n${id};${name};${lng};${lat};${street};${stops}`
	}

	return result
}

const formatId = (id) => {
	const synonims = {
		'133119': '16060'
	};

	if (id in synonims) {
		return synonims[id];
	}

	return id;
}

async function generateJSON () {
	const file = await getRawFile('stops.txt')
	const lines = file.toString().trim().split('\n').slice(1)

	const places = []
	let prevName = ''
	for (const line of lines) {
		const [, id, street, name, lng, lat, stops] = (
			/(.*?);.*?;.*?;(.*?);(.*?);.*?;(.*?);(.*?);(.*?);/.exec(line)
		)

		if (lng === '0' || lat === '0') {
			continue
		}

		const normalizedName = name ? name.replace(/~/g, ' ').trim() : prevName
		prevName = normalizedName

		places.push({
			id: formatId(id),
			name: normalizedName,
			lng: lng / 100000,
			lat: lat / 100000,
			street: !street || street === '0' ? null : street,
			stops: stops ? stops.split(',') : []
		})
	}

	return places
}

export async function getAll () {
	return JSON.parse(await getJSON());
}

export async function getValid () {
	try {
		return await getFileFromCache('stops-valid.json')
	} catch (err) {
		const allStops = JSON.parse(await getJSON());

		let validStops = [...new Set(JSON.parse(await getValidRoutes()).reduce((acc, route) => {
			acc = [...acc, ...route.stops];
			return acc;
		}, []))];

		validStops = JSON.stringify(
			allStops.filter((stop) => validStops.includes(stop.id)),
			null,
			4
		);

		await saveFileToCache('stops-valid.json', validStops)
		return validStops
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
		return await getFileFromCache('stops.json')
	} catch (err) {
		const stops = JSON.stringify(await generateJSON(), null, 4)
		await saveFileToCache('stops.json', stops)
		return stops
	}
}
