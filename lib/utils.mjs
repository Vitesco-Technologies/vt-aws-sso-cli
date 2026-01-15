import axios from "axios";
import chalk from "chalk";
import { ProxyAgent } from 'proxy-agent';

/**
 * Shared proxy agent for HTTP requests
 */
export const agent = new ProxyAgent();

/**
 * Make an HTTP GET request with timeout and error handling
 * @param {string} url - The URL to fetch
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @param {object} options - Additional axios options
 * @returns {Promise<any>} - Response data
 */
export async function httpGet(url, timeout = 10000, options = {}) {
  const config = {
    timeout,
    httpAgent: agent,
    httpsAgent: agent,
    proxy: false,
    ...options
  };
  
  const { data } = await axios.get(url, config);
  return data;
}

/**
 * Log a success message in green
 * @param {string} message - The message to log
 */
export function logSuccess(message) {
  console.log(chalk.green(message));
}

/**
 * Log a warning message in yellow
 * @param {string} message - The message to log
 */
export function logWarning(message) {
  console.log(chalk.yellow(message));
}

/**
 * Log an error message in red
 * @param {string} message - The message to log
 */
export function logError(message) {
  console.log(chalk.red(message));
}

/**
 * Log an info message
 * @param {string} message - The message to log
 */
export function logInfo(message) {
  console.log(message);
}
