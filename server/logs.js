import * as winston from 'winston'

export const logger = winston.createLogger({
	transports: [
		new winston.transports.Console()
	],
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.prettyPrint()
	)
})

logger.exitOnError = false
