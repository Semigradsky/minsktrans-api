import Mustache from 'mustache';
import { send } from 'micro'
import { router, get } from 'microrouter'
import fs from 'fs-extra'
import etag from 'etag';

const path = require('path');

import { getFileFromCache, saveFileToCache, getMTime, notExpired } from './cache'
import config from './config';

import { logger } from './logs'
import { getRawFile } from './raw'
import * as stops from './stops'
import * as routes from './routes'
import { getStopsKML } from './kml'
import * as gtfs from './gtfs'

import routesValidator from './validator/routes';
import routeValidator from './validator/route';
import stopsValidator from './validator/stops';

async function serveWithCache(req, res, cacheKey, dataAsyncGetter, contentType = 'text/plain', cacheTime = config.cache.default) {
	if (await notExpired(cacheKey, cacheTime)) {
		const e = etag(String(await getMTime(cacheKey)));
		res.setHeader('ETag', e);

		if (req.headers['if-none-match'] === e) {
			send(res, 304);
			return;
		}
	}

	res.setHeader('Content-Type', `${contentType}; charset=utf-8`);

	try {
		const data = await getFileFromCache(cacheKey, cacheTime);
		res.setHeader('ETag', etag(String(await getMTime(cacheKey))));
		res.end(data);
	} catch (e) {
		try {
			const data = await dataAsyncGetter(req.params);
			await saveFileToCache(cacheKey, data);
			res.setHeader('ETag', etag(String(await getMTime(cacheKey))));
			res.end(data);
		} catch (err) {
			logger.error(err)
			send(res, 500, 'Server error')
		}
	}
}

async function serveFile (req, res, fileGetter, cacheKey, contentType = 'text/plain', cacheTime = config.cache.overpass.default) {
	return serveWithCache(req, res, cacheKey, async () => {
		return (await fileGetter()).toString();
	}, contentType, cacheTime);
}

async function serveHTML (req, res, dataAsyncGetter, fileName, cacheKey, cacheTime = config.cache.overpass.default) {
	return serveWithCache(req, res, cacheKey, async (params) => {
		const document = path.join(__dirname, '/../client', fileName);
		const template = await fs.readFile(document, 'utf8');
		const data = await dataAsyncGetter(params);
		return Mustache.render(template, data);
	}, 'text/html', cacheTime);
}

export default router(
	get('/routes', (req, res) => serveHTML(req, res, routesValidator, '/routes/index.html', 'routes.html')),
	get('/route/:routeId', (req, res) => serveHTML(req, res, routeValidator, '/route/index.html', `route-${req.params.routeId}.html`)),
	get('/stops', (req, res) => serveHTML(req, res, stopsValidator, '/stops/index.html', 'stops.html', 1)),

	get('/:file.txt', (req, res) => serveFile(req, res, () => getRawFile(`${req.params.file}.txt`), `${req.params.file}.txt`, 'text/plain')),

	get('/routes.json', (req, res) => serveFile(req, res, () => routes.getJSON(), 'routes.json', 'application/json')),
	get('/routes/valid.json', (req, res) => serveFile(req, res, () => routes.getValid(), 'routes-valid.json', 'application/json')),
	get('/routes.csv', (req, res) => serveFile(req, res, () => routes.getCSV(), 'routes.csv', 'text/csv')),

	get('/stops.json', (req, res) => serveFile(req, res, () => stops.getJSON(), 'stops.json', 'application/json')),
	get('/stops/valid.json', (req, res) => serveFile(req, res, () => stops.getValid(), 'stops-valid.json', 'application/json')),
	get('/stops.csv', (req, res) => serveFile(req, res, () => stops.getCSV(), 'stops.csv', 'text/csv')),

	get('/stops.kml', (req, res) => serveFile(req, res, () => getStopsKML(), 'stops.kml', 'application/vnd.google-earth.kml+xml')),

	get('/gtfs/agency.txt', (req, res) => serveFile(req, res, () => gtfs.getAgency(), 'agency.txt', 'text/plain')),
	get('/gtfs/stops.txt', (req, res) => serveFile(req, res, () => gtfs.getStops(), 'stops.txt', 'text/plain')),
	get('/gtfs/routes.txt', (req, res) => serveFile(req, res, () => gtfs.getRoutes(), 'routes.txt', 'text/plain')),
	get('/gtfs/trips.txt', (req, res) => serveFile(req, res, () => gtfs.getTrips(), 'trips.txt', 'text/plain')),
	get('/gtfs/stop_times.txt', (req, res) => serveFile(req, res, () => gtfs.getStopTimes(), 'stop_times.txt', 'text/plain')),
	get('/gtfs/calendar.txt', (req, res) => serveFile(req, res, () => gtfs.getCalendar(), 'calendar.txt', 'text/plain')),

	get('*', (req, res) => send(res, 404, 'Not found')),
)
