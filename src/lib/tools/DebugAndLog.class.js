const { sanitize } = require("./utils");
const util = require('util');

/**
 * A simple Debug and Logging class.
 */
class DebugAndLog {

	static #logLevel = -1;
	static #expiration = -1;

	static PROD = "PROD";
	static TEST = "TEST";
	static DEV = "DEV";

	static ENVIRONMENTS = [DebugAndLog.PROD, DebugAndLog.TEST, DebugAndLog.DEV];

	static ERROR = "ERROR"; // 0
	static WARN = "WARN"; // 0
	static LOG = "LOG"; // 0
	static MSG = "MSG"; // 1
	static DIAG = "DIAG"; // 3
	static DEBUG = "DEBUG"; // 5

	constructor() {
	};

	/**
	 * Set the log level.
	 * @param {number} logLevel 0 - 5
	 * @param {*} expiration YYYY-MM-DD HH:MM:SS format. Only set to specified level until this date
	 */
	static setLogLevel(logLevel = -1, expiration = -1) {

		if ( process.env.NODE_ENV === "production" && this.#logLevel > -1 ) {
			DebugAndLog.warn("LogLevel already set, cannot reset. Ignoring call to DebugAndLog.setLogLevel("+logLevel+")");
		} else {
			if ( expiration !== -1 ) {
				let time = new Date( expiration );
				this.#expiration = time.toISOString();
			} else {
				this.#expiration = -1;
			}            
			
			if ( logLevel === -1 || this.nonDefaultLogLevelExpired()) {
				this.#logLevel = this.getDefaultLogLevel();
			} else {
				if ( logLevel > 0 && DebugAndLog.isProduction() ) {
					DebugAndLog.warn("DebugAndLog: Production environment. Cannot set logLevel higher than 0. Ignoring call to DebugAndLog.setLogLevel("+logLevel+"). Default LogLevel override code should be removed before production");
					this.#logLevel = this.getDefaultLogLevel();
				} else {
					this.#logLevel = logLevel;
					DebugAndLog.msg("DebugAndLog: Override of log level default set: "+logLevel+". Default LogLevel override code should be removed before production");
					if ( this.#expiration === -1 ) {
						DebugAndLog.warn("DebugAndLog: Override of log level default set WITHOUT EXPIRATION. An expiration is recommended.");
					}
				}
			} 
		}

	};

	static nonDefaultLogLevelExpired() {
		let r = false;

		if ( this.#expiration !== -1 ) {
			let now = new Date();
			if ( now.toISOString() > this.#expiration ) {
				DebugAndLog.warn("DebugAndLog: Override of log level default expired. Call to DebugAndLog.setLogLevel() should be commented out or removed");
				r = true;
			}
		}

		return r;
	}

	/**
	 * 
	 * @returns {string} The expiration date of the set log level
	 */
	static getExpiration() {
		return this.#expiration;
	}

	/**
	 * 
	 * @returns {number} The current log level
	 */
	static getLogLevel() {
		if ( this.#logLevel === -1 ) {
			this.setLogLevel();
		}

		return this.#logLevel;

	}

	/**
	 * Check process.env for an environment variable named
	 * env, deployEnvironment, environment, or stage. If they
	 * are not set it will return DebugAndLog.PROD which 
	 * is considered safe (most restrictive)
	 * Note: This is the application environment, not the NODE_ENV
	 * @returns {string} The current environment.
	 */
	static getEnv() {
		var possibleVars = ["env", "deployEnvironment", "environment", "stage, deploy_environment"]; // this is the application env, not the NODE_ENV
		var env = (process.env?.NODE_ENV === "development" ? DebugAndLog.DEV : DebugAndLog.PROD); // if env or deployEnvironment not set, fail to safe

		if ( "env" in process ) {
			for (let i in possibleVars) {
				let e = possibleVars[i];
				let uE = possibleVars[i].toUpperCase();
				if (e in process.env && process.env[e] !== "" && process.env[e] !== null) {
					env = process.env[e].toUpperCase();
					break; // break out of the for loop
				} else if (uE in process.env && process.env[uE] !== "" && process.env[uE] !== null) {
					env = process.env[uE].toUpperCase();
					break; // break out of the for loop
				}
			};
		}
		return (DebugAndLog.ENVIRONMENTS.includes(env) ? env : DebugAndLog.PROD);
	};

	/**
	 * 
	 * @returns {number} log level
	 */
	static getDefaultLogLevel() {
		var possibleVars = ["detailedLogs", "logLevel"];
		var logLevel = 0;

		if ( DebugAndLog.isNotProduction() ) { // PROD is always at logLevel 0. Always.

			if ( "env" in process ) {
				for (let i in possibleVars) {
					let lev = possibleVars[i];
					let uLEV = possibleVars[i].toUpperCase();
					if (lev in process.env  && !(Number.isNaN(process.env[lev])) && process.env[lev] !== "" && process.env[lev] !== null) {
						logLevel = Number(process.env[lev]);
						break; // break out of the for loop
					} else if (uLEV in process.env && !(Number.isNaN(process.env[uLEV])) && process.env[uLEV] !== "" && process.env[uLEV] !== null) {
						logLevel = Number(process.env[uLEV]);
						break; // break out of the for loop
					}
				};
			}

		}

		return logLevel;
	};

	/**
	 * 
	 * @returns {boolean}
	 */
	static isNotProduction() {
		return ( !DebugAndLog.isProduction() );
	};

	/**
	 * 
	 * @returns {boolean}
	 */
	static isProduction() {
		return ( DebugAndLog.getEnv() === DebugAndLog.PROD );
	};

	/**
	 * 
	 * @returns {boolean}
	 */
	static isDevelopment() {
		return ( DebugAndLog.getEnv() === DebugAndLog.DEV );
	};

	/**
	 * 
	 * @returns {boolean}
	 */
	static isTest() {
		return ( DebugAndLog.getEnv() === DebugAndLog.TEST );
	};

	/**
	 * Write a log entry.
	 * The format used will be "[TAG] message"
	 * @param {string} tag This will appear first in the log in all caps between square brackets ex: [TAG]
	 * @param {string} message The message to be displayed. May also be a delimited log string
	 * @param {object|null} obj An object to include in the log entry
	 */
	static async writeLog(tag, message, obj = null) {

		const logLevels = {
			error: console.error,
			warn: console.warn,
			log: console.log,
			info: console.info,
			debug: console.debug
		};

		const DEFAULT_LEVEL = 'info';
		const FORMAT_WITH_OBJ = '[%s] %s | %s';
		const FORMAT_WITHOUT_OBJ = '[%s] %s';

		// const baseLog = function(level, tag, message, obj = null) {
		// 	// Validate inputs
		// 	if (typeof level !== 'string') {
		// 		throw new TypeError('Log level must be a string');
		// 	}
			
		// 	// Ensure tag and message are strings
		// 	const safeTag = String(tag || '');
		// 	const safeMessage = String(message || '');
			
		// 	// Validate log level is allowed
		// 	if (!Object.prototype.hasOwnProperty.call(logLevels, level)) {
		// 		level = 'info'; // Default to info if invalid level
		// 	}
			
		// 	const logFn = logLevels[level];
			
		// 	try {
		// 		let formattedMessage;
		// 		if (obj !== null) {
		// 			formattedMessage = util.format(
		// 				'[%s] %s | %s',
		// 				safeTag,
		// 				safeMessage,
		// 				util.inspect(sanitize(obj), { depth: null })
		// 			);
		// 		} else {
		// 			formattedMessage = util.format(
		// 				'[%s] %s',
		// 				safeTag,
		// 				safeMessage
		// 			);
		// 		}
		// 		logFn(formattedMessage);
		// 	} catch (error) {
		// 		console.error('Logging failed:', error);
		// 	}
		// };
		const baseLog = function(level, tag, message, obj = null) {
			// Early return for invalid input
			if (typeof level !== 'string') {
				throw new TypeError('Log level must be a string');
			}
		
			// Use logical OR for faster undefined/null checks
			const safeTag = String(tag || '');
			const safeMessage = String(message || '');
			
			// Direct property lookup is faster than hasOwnProperty
			const logFn = logLevels[level] || logLevels[DEFAULT_LEVEL];
			
			try {
				// Single util.format call with conditional arguments
				if (obj !== null) {
					logFn(
						util.format(
							FORMAT_WITH_OBJ,
							safeTag,
							safeMessage,
							util.inspect(sanitize(obj), { depth: null })
						)
					);
				} else {
					logFn(
						util.format(
							FORMAT_WITHOUT_OBJ,
							safeTag,
							safeMessage
						)
					);
				}
			} catch (error) {
				console.error('Logging failed:', error);
			}
		};
		
		// Create individual logging functions using the base function
		const error = (tag, message, obj) => baseLog('error', tag, message, obj);
		const warn = (tag, message, obj) => baseLog('warn', tag, message, obj);
		const log = (tag, message, obj) => baseLog('log', tag, message, obj);
		const info = (tag, message, obj) => baseLog('info', tag, message, obj);
		const debug = (tag, message, obj) => baseLog('debug', tag, message, obj);
		
		let lvl = DebugAndLog.getLogLevel();
		tag = tag.toUpperCase();

		// if ( obj !== null ) {
		// 	let msgObj = obj;
		// 	if ( Array.isArray(msgObj)) { msgObj = { array: msgObj};}
		// 	if ( ""+msgObj === "[object Object]" || ""+msgObj === "[object Array]") {
		// 		msgObj = JSON.stringify(sanitize(msgObj));
		// 	}
		// 	message += " | "+msgObj;
		// }

		switch (tag) {
			case DebugAndLog.ERROR:
				error(tag, message, obj);
				break;
			case DebugAndLog.WARN:
				warn(tag, message, obj);
				break;
			case DebugAndLog.MSG:
				if (lvl >= 1) { info(tag, message, obj); } // 1
				break; 
			case DebugAndLog.DIAG:
				if (lvl >= 3) { debug(tag, message, obj); } //3
				break; 
			case DebugAndLog.DEBUG:
				if (lvl >= 5) { debug(tag, message, obj); } //5
				break; 
			default: // log
				log(tag, message, obj);
				break;
		}

		return true;
	};

	/**
	 * Level 5 - Verbose Values and Calculations and Stack Traces
	 * @param {string} message 
	 * @param {object} obj 
	 */
	static async debug(message, obj = null) {
		return DebugAndLog.writeLog(DebugAndLog.DEBUG, message, obj);
	};

	/**
	 * Level 3 - Verbose timing and counts
	 * @param {string} message 
	 * @param {object} obj 
	 */
	static async diag(message, obj = null) {
		return DebugAndLog.writeLog(DebugAndLog.DIAG, message, obj);      
	};

	/**
	 * Level 1 - Short messages and status
	 * @param {string} message 
	 * @param {object} obj 
	 */
	static async msg(message, obj = null) {
		return DebugAndLog.writeLog(DebugAndLog.MSG, message, obj);
	};

	/**
	 * Level 1 - Short messages and status
	 * (same as DebugAndLog.msg() )
	 * @param {string} message 
	 * @param {object} obj 
	 */
	static async message(message, obj = null) {
		return DebugAndLog.msg(message, obj);
	};

	/**
	 * Level 0 - Production worthy log entries that are not errors or warnings
	 * These should be formatted in a consistent manner and typically only
	 * one entry produced per invocation. (Usually produced at the end of a 
	 * script's execution)
	 * @param {string} message The message, either a text string or fields separated by | or another character you can use to parse your logs
	 * @param {string} tag Optional. The tag that appears at the start of the log. Default is LOG. In logs it will appear at the start within square brackets '[LOG] message' You can use this to filter when parsing log reports
	 * @param {object} obj 
	 */
	static async log(message, tag = DebugAndLog.LOG, obj = null) {
		return DebugAndLog.writeLog(tag, message, obj);
	};

	/**
	 * Level 0 - Warnings
	 * Errors are handled and execution continues.
	 * ClientRequest validation should be done first, and if we received an invalid
	 * request, then a warning, not an error, should be logged even though an 
	 * error is returned to the client (error is on client side, not here, 
	 * but we want to keep track of client errors). 
	 * Requests should be validated first before all other processing.
	 * @param {string} message 
	 * @param {object} obj 
	 */
	static async warn(message, obj = null) {
		DebugAndLog.writeLog(DebugAndLog.WARN, message, obj);
	};

	/**
	 * Level 0 - Warnings
	 * (same as DebugAndLog.warn() )
	 * @param {string} message 
	 * @param {object} obj 
	 */
	static async warning(message, obj = null) {
		DebugAndLog.warn(message, obj);
	};

	/**
	 * Level 0 - Errors
	 * Errors cannot be handled in a way that will allow continued execution.
	 * An error will be passed back to the client. If a client sent a bad
	 * request, send a warning instead.
	 * @param {string} message 
	 * @param {object} obj 
	 */
	static async error(message, obj = null) {
		DebugAndLog.writeLog(DebugAndLog.ERROR, message, obj);
	};

};

module.exports = DebugAndLog;