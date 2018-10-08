const request = require('request')
const querystring = require('querystring')

import { getFileFromCache, saveFileToCache } from './../cache'
import { logger } from './../logs'
import config from './../config';

export default class BaseQuery {
	execute(query, callback) {
		return new Promise((resolve, reject) => {
			logger.info(`Go to: "${query}"`);

			request.post('http://overpass-api.de/api/interpreter', {
				headers: {
					'content-type': 'application/x-www-form-urlencoded'
				},
				body: querystring.stringify({ data: query })
			}, (error, response, body) => {
				if (!error && response.statusCode === 200) {
					const elements = JSON.parse(body).elements;
					resolve(callback(elements));
				} else {
					reject(error ? error : response ? response.statusCode : 'unknow error');
				}
			});
		});
	}

	async fetch(queryName, callback) {
		const cacheTime = config.cache.overpass[queryName] || config.cache.overpass.default;
		const fileName = `${queryName}.json`;

		try {
			const file = await getFileFromCache(fileName, cacheTime);
			return JSON.parse(file);
		} catch (err) {
			const result = await callback();
			await saveFileToCache(fileName, JSON.stringify(result, null, 4));
			return result;
		}
	}
}
