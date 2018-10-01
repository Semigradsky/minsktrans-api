import fs from 'fs-extra'
import path from 'path'
import { logger } from './logs'
import os from 'os'
import config from './../config';

export async function getFileFromCache (fileName, cacheTime = config.cache.default) {
	const fsName = path.resolve(os.tmpdir(), fileName)
	const fstat = await fs.stat(fsName)

	if (+fstat.mtime + cacheTime < Date.now()) {
		logger.info(`${fileName} is old, need getting new file`)
		throw new Error('TOO OLD')
	}

	const file = await fs.readFile(fsName)
	logger.info(`GET ${fileName} FROM CACHE`)
	return file
}

export async function saveFileToCache (fileName, file) {
	const fsName = path.resolve(os.tmpdir(), fileName)

	try {
		await fs.writeFile(fsName, file)
		logger.info(`${fileName} saved to cache`)
	} catch (err) {
		logger.error(`${fsName} failed for save to cache`)
	}
}
