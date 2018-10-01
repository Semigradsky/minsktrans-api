import Mustache from 'mustache';
import { send } from 'micro'
import { router, get } from 'microrouter'

const fs = require('fs');
const path = require('path');

import { logger } from './logs'
import { getRawFile } from './raw'
import * as stops from './stops'
import * as routes from './routes'
import { getStopsKML } from './kml'
import * as gtfs from './gtfs'

import routesValidator from './validator/routes';
import routeValidator from './validator/route';
import stopsValidator from './validator/stops';

async function serveFile (req, res, fileGetter, contentType = 'text/plain') {
	try {
		const file = await fileGetter()
		res.setHeader('Content-Type', `${contentType}; charset=utf-8`)

		let result = ''
		if (contentType === 'application/json') {
			result = JSON.stringify(file, null, 4);
		} else {
			result = file.toString()
		}

		send(res, 200, result)
	} catch (err) {
		logger.error(err.message)
		send(res, 404, 'Not found')
	}
}

async function serveHTML (req, res, dataAsyncGetter, fileName) {
	const document = path.join(__dirname, '/../client', fileName);

	try {
		const template = fs.readFileSync(document, 'utf8');
		const data = await dataAsyncGetter(req.params);
		const html = Mustache.render(template, data);
		res.end(html);
	} catch (err) {
		logger.error(err)
		send(res, 500, 'Server error')
	}
}

export default router(
	get('/routes', (req, res) => serveHTML(req, res, routesValidator, '/routes/index.html'), 'text/plain'),
	get('/route/:routeId', (req, res) => serveHTML(req, res, routeValidator, '/route/index.html'), 'text/plain'),
	get('/stops', (req, res) => serveHTML(req, res, stopsValidator, '/stops/index.html'), 'text/plain'),

	get('/:file.txt', (req, res) => serveFile(req, res, () => getRawFile(`${req.params.file}.txt`), 'text/plain')),

	get('/routes.json', (req, res) => serveFile(req, res, () => routes.getJSON(), 'application/json')),
	// get('/routes.csv', (req, res) => serveFile(req, res, () => routes.getCSV(), 'text/csv')),

	get('/stops.json', (req, res) => serveFile(req, res, () => stops.getJSON(), 'application/json')),
	// get('/stops.csv', (req, res) => serveFile(req, res, () => stops.getCSV(), 'text/csv')),

	get('/stops.kml', (req, res) => serveFile(req, res, () => getStopsKML(), 'application/vnd.google-earth.kml+xml')),

	get('/gtfs/agency.txt', (req, res) => serveFile(req, res, () => gtfs.getAgency(), 'text/plain')),
	get('/gtfs/stops.txt', (req, res) => serveFile(req, res, () => gtfs.getStops(), 'text/plain')),
	get('/gtfs/routes.txt', (req, res) => serveFile(req, res, () => gtfs.getRoutes(), 'text/plain')),
	get('/gtfs/trips.txt', (req, res) => serveFile(req, res, () => gtfs.getTrips(), 'text/plain')),
	get('/gtfs/stop_times.txt', (req, res) => serveFile(req, res, () => gtfs.getStopTimes(), 'text/plain')),
	get('/gtfs/calendar.txt', (req, res) => serveFile(req, res, () => gtfs.getCalendar(), 'text/plain')),
)
