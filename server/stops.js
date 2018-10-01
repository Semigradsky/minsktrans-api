import { getRawFile } from './raw'
import { getFileFromCache, saveFileToCache } from './cache'

async function generateCSV () {
	const stops = await getJSON()

	let result = 'ID;Name;Lng;Lat;Stops'
	for (const stop of stops) {
		const { id, name, lng, lat, street, stops } = stop
		result += `\n${id};${name};${lng};${lat};${street},"${stops.join(',')}"`
	}

	return result
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
			id,
			name: normalizedName,
			lng: lng / 100000,
			lat: lat / 100000,
			street: !street || street === '0' ? null : street,
			stops: stops ? stops.split(',') : []
		})
	}

	return places
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
		const file = await getFileFromCache('stops.json')
		return JSON.parse(file)
	} catch (err) {
		const stops = await generateJSON()
		await saveFileToCache('stops.json', JSON.stringify(stops, null, 4))
		return stops
	}
}
