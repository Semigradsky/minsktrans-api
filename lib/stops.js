import { getRawFile } from './raw'
import { getFileFromCache, saveFileToCache } from './cache'

export async function getStops () {
	try {
		const file = await getFileFromCache('stops.json')
		return JSON.parse(file)
	} catch (err) {
		const file = await getRawFile('stops.txt')
		const lines = file.toString().trim().split('\n').slice(1)

		const places = [];
		let placeName = '';
		for (const line of lines) {
			const [, id, name, lng, lat, stops] = /(.*?);.*?;.*?;.*?;(.*?);.*?;(.*?);(.*?);(.*?);/.exec(line)

			places.push({
				name: name || placeName,
				id,
				lng: lng / 100000,
				lat: lat / 100000,
				stops: stops ? stops.split(',') : []
			})

			placeName = name || placeName
		}

		await saveFileToCache('stops.json', JSON.stringify(places, null, 4))

		return places
	}
}
