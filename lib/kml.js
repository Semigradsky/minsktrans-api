import { getFileFromCache, saveFileToCache } from './cache'
import { getStops } from './stops'

const createPlace = ({id, name, lng, lat}) => (
`  <Placemark>
    <name>(${id}) ${name}</name>
    <description></description>
    <Point>
      <coordinates>${lng},${lat},0</coordinates>
    </Point>
  </Placemark>`
)

const createKML = places => (
`<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://earth.google.com/kml/2.2">
${places.filter((place) => place.lat !== 0 && place.lng !== 0).map(createPlace)}
</kml>`
)

export async function getStopsKML () {
	try {
		return await getFileFromCache('stops.kml')
	} catch (err) {
		const stops = await getStops()
		const result = createKML(stops)
		await saveFileToCache('stops.kml', result)
		return result
	}
}
