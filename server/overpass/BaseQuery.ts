import * as request from 'request'
import * as querystring from 'querystring'

import { getFileFromCache, saveFileToCache } from './../cache'
import { logger } from './../logs'
import config from './../config';

export type OsmElement = OsmNode | OsmWay | OsmRelation;

export type PT_Stop = OsmNode | OsmWay;
export type PT_Platform = OsmNode | OsmWay;
export type PT_EntrancePass = OsmWay;

export type OsmTags = {
	[tagName: string]: string;
}

export type OsmNode = {
	type: 'node';
	id: number;
	lat: number;
	lon: number;
	tags: OsmTags;
}

export type OsmWay = {
	type: 'way';
	id: number;
	nodes: number[];
	tags: OsmTags;
}

export type OsmRelation = {
	type: 'relation';
	id: number;
	members: Array<{
		type: 'node' | 'way' | 'relation';
		ref: number;
		role: string;
	}>;
	tags: OsmTags;
}

export default class BaseQuery<T> {
	execute(query: string, callback: (elements: OsmElement[]) => T): Promise<T> {
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

	async fetch(queryName: string, callback: () => Promise<T>): Promise<T> {
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
