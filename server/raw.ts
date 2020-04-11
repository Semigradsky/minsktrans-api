import * as url from 'url'
import * as request from 'request-promise'
import { logger } from './logs'
import { getFileFromCache, saveFileToCache } from './cache'
import config from './config'

const BASE_URL = 'http://www.minsktrans.by/city/minsk/'

async function getLiveFile (fileName: string): Promise<string> {
	const fullPath = url.resolve(BASE_URL, fileName)
	logger.info(`GET ${fullPath}`)

	const file: string = await request(fullPath)
	await saveFileToCache(fileName, file)
	return file
}

export async function getRawFile (fileName: string): Promise<string> {
	try {
		return await getFileFromCache(fileName, config.cache.overpass.default)
	} catch (err) {
		return await getLiveFile(fileName)
	}
}
