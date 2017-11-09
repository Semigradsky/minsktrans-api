import fs from 'fs-extra'
import path from 'path'
import { logger } from './logs'
import os from 'os'

export async function getFileFromCache (fileName) {
	const fsName = path.resolve(os.tmpdir(), fileName)
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
