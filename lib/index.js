import { send } from 'micro'
import { router, get } from 'microrouter'
import { logger } from './logs'
import { getRawFile } from './raw'
import { getStops } from './stops'
import { getRoutes } from './routes'
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
	get('/:file.txt', (req, res) => serveFile(req, res, () => getRawFile(`${req.params.file}.txt`), 'text/plain')),

	get('/routes(.json)', (req, res) => serveFile(req, res, () => getRoutes('json'), 'application/json')),
	get('/routes.csv', (req, res) => serveFile(req, res, () => getRoutes('csv'), 'text/csv')),

	get('/stops(.json)', (req, res) => serveFile(req, res, () => getStops('json'), 'application/json')),
	get('/stops.csv', (req, res) => serveFile(req, res, () => getStops('csv'), 'text/csv')),

	get('/stops.kml', (req, res) => serveFile(req, res, () => getStopsKML(), 'application/vnd.google-earth.kml+xml'))
)
