// Issue
// https://github.com/winstonjs/winston/issues/1575

export class Container {
	constructor(options: any);
	loggers: any;
	options: any;
	add(id: any, options: any): any;
	close(id: any): any;
	get(id: any, options: any): any;
	has(id: any): any;
}
export class ExceptionHandler {
	constructor(logger: any);
	logger: any;
	handlers: any;
	getAllInfo(err: any): any;
	getOsInfo(): any;
	getProcessInfo(): any;
	getTrace(err: any): any;
	handle(args: any): void;
	unhandle(): void;
}
export const Logger: any;
export class Transport {
	constructor(options: any);
	format: any;
	level: any;
	handleExceptions: any;
	silent: any;
	log: any;
	logv: any;
	close: any;
	addListener(type: any, listener: any): any;
	cork(): void;
	destroy(err: any, cb: any): any;
	emit(type: any, args: any): any;
	end(chunk: any, encoding: any, cb: any): void;
	eventNames(): any;
	getMaxListeners(): any;
	listenerCount(type: any): any;
	listeners(type: any): any;
	off(type: any, listener: any): any;
	on(type: any, listener: any): any;
	once(type: any, listener: any): any;
	pipe(): void;
	prependListener(type: any, listener: any): any;
	prependOnceListener(type: any, listener: any): any;
	rawListeners(type: any): any;
	removeAllListeners(type: any, ...args: any[]): any;
	removeListener(type: any, listener: any): any;
	setDefaultEncoding(encoding: any): any;
	setMaxListeners(n: any): any;
	uncork(): void;
	write(chunk: any, encoding: any, cb: any): any;
}
export function add(args: any): void;
export function addColors(config: any): any;
export function addFilter(): void;
export function addRewriter(): void;
export function clear(args: any): void;
export function cli(): void;
export function clone(): void;
export namespace config {
	function addColors(config: any): any;
	const cli: {
		colors: {
			data: string;
			debug: string;
			error: string;
			help: string;
			info: string;
			input: string;
			prompt: string;
			silly: string;
			verbose: string;
			warn: string;
		};
		levels: {
			data: number;
			debug: number;
			error: number;
			help: number;
			info: number;
			input: number;
			prompt: number;
			silly: number;
			verbose: number;
			warn: number;
		};
	};
	const npm: {
		colors: {
			debug: string;
			error: string;
			http: string;
			info: string;
			silly: string;
			verbose: string;
			warn: string;
		};
		levels: {
			debug: number;
			error: number;
			http: number;
			info: number;
			silly: number;
			verbose: number;
			warn: number;
		};
	};
	const syslog: {
		colors: {
			alert: string;
			crit: string;
			debug: string;
			emerg: string;
			error: string;
			info: string;
			notice: string;
			warning: string;
		};
		levels: {
			alert: number;
			crit: number;
			debug: number;
			emerg: number;
			error: number;
			info: number;
			notice: number;
			warning: number;
		};
	};
}
export function configure(args: any): void;
export function createLogger(opts: any): void;
export function debug(args: any): void;
export default _default;
export const _default: any;
export const emitErrs: any;
export function error(args: any): void;
export const exceptions: any;
export const exitOnError: any;
export function extend(): void;
export function format(formatFn: any): any;
export namespace format {
	const align: any;
	const cli: any;
	const colorize: any;
	const combine: any;
	const json: any;
	const label: any;
	const logstash: any;
	const metadata: any;
	const ms: any;
	const padLevels: any;
	const prettyPrint: any;
	const printf: any;
	const simple: any;
	const splat: any;
	const timestamp: any;
	const uncolorize: any;
}
export function handleExceptions(args: any): void;
export function http(args: any): void;
export function info(args: any): void;
export const level: any;
export const levelLength: any;
export function log(args: any): void;
export const loggers: {
	add: Function;
	close: Function;
	get: Function;
	has: Function;
	loggers: Map;
	options: {};
};
export const padLevels: any;
export function profile(args: any): void;
export function query(args: any): void;
export function remove(args: any): void;
export function silly(args: any): void;
export function startTimer(args: any): void;
export function stream(args: any): void;
export const stripColors: any;
export const transports: {
	Console: any;
	File: any;
	Http: any;
	Stream: any;
};
export function unhandleExceptions(args: any): void;
export function verbose(args: any): void;
export const version: string;
export function warn(args: any): void;
