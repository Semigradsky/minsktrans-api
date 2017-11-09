import { send } from 'micro'
import { router, get } from 'microrouter'
import { logger } from './logs'
import { getRawFile } from './raw'
import { getStops } from './stops'
import { getStopsKML } from './kml'

async function serveFile (req, res, fileGetter, contentType = 'text/plain') {
	try {
		const file = await fileGetter()
		res.setHeader('Content-Type', contentType)

		let result = ''
		if (contentType === 'application/json') {
			result = JSON.stringify(file, null, 4);
		} else {
			result = file.toString()
		}

		send(res, 200, result)
	} catch (err) {
		logger.error(err.message)
		send(res, 400, 'Not found')
	}
}

export default router(
	get('/routes', (req, res) => serveFile(req, res, () => getRawFile('routes.txt'))),

	get('/shapes', (req, res) => serveFile(req, res, () => getRawFile('shapes.txt'))),

	get('/stops.json', (req, res) => serveFile(req, res, () => getStops(), 'application/json')),
	get('/stops', (req, res) => serveFile(req, res, () => getRawFile('stops.txt'))),
	get('/stops.kml', (req, res) => serveFile(req, res, () => getStopsKML(), 'application/vnd.google-earth.kml+xml')),

	get('/times', (req, res) => serveFile(req, res, () => getRawFile('times.txt'))),

	get('/wtf/:id', (req, res) => serveFile(req, res, () => getRawFile(`${req.params.id}.txt`))),
)
