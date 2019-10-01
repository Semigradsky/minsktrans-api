import * as fs from 'fs-extra'
import * as path from 'path'
import { logger } from './logs'
import * as os from 'os'
import config from './config';

export async function getMTime (fileName: string): Promise<number> {
	const fsName = path.resolve(os.tmpdir(), fileName)
	const fstat = await fs.stat(fsName)
	return +fstat.mtime;
}

export async function notExpired (fileName: string, cacheTime: number): Promise<boolean> {
	try {
		const mtime = await getMTime(fileName)
		return mtime + cacheTime > Date.now();
	} catch (err) {
		return false;
	}
}

export async function getFileFromCache (fileName: string, cacheTime: number = config.cache.default): Promise<string> {
	const fsName = path.resolve(os.tmpdir(), fileName)
	const fstat = await fs.stat(fsName)

	if (+fstat.mtime + cacheTime < Date.now()) {
		logger.info(`${fileName} is old, need getting new file`)
		throw new Error('TOO OLD')
	}

	const file = await fs.readFile(fsName, 'utf8')
	logger.info(`GET ${fileName} FROM CACHE`)
	return file
}

export async function saveFileToCache (fileName: string, file: string): Promise<void> {
	const fsName = path.resolve(os.tmpdir(), fileName)

	try {
		await fs.writeFile(fsName, file)
		logger.info(`${fileName} saved to cache`)
	} catch (err) {
		logger.error(`${fsName} failed for save to cache`)
	}
}
