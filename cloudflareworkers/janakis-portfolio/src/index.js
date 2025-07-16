/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { DurableObject } from "cloudflare:workers";

/**
 * @typedef {Object} Env
 */

export default {
	/**
	 * @param {Request} request
	 * @param {Env} env
	 * @param {ExecutionContext} ctx
	 * @returns {Promise<Response>}
	 */
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		console.log(`Hello ${navigator.userAgent} at path ${url.pathname}!`);

		return await fetchAllStocks();
	},
	async scheduled(event, env, ctx) {
		var prices = await fetchAllStocks();
	},
};

async function fetchAllStocks() {
	const tickers = ['ARKF'];
	// FBGRX does not work.
	// const tickers = ['ADYEY', 'NET', 'DDOG', 'FBGRX', 'MELI', 'ARKF', 'FSMEX', 'CRWD', 'AFRM', 'FRSH', 'DASH', 'TTD', 'HIMS']
	var ticker = 'GOOG';
	const today = new Date();
	const yesterday = new Date(today);
	if (today.getDay() == 1) { // Monday
		yesterday.setDate(today.getDate() - 3);
	} else {
		yesterday.setDate(today.getDate() - 1);
	}

	var date = yesterday.toISOString().split("T")[0];
	var results = [];
	for (const ticker of tickers) {
		// TODO: handle NOT_FOUND for holidays
		results.push(await fetchPrice(ticker, date));
		await sleep(10000); // sleep for 10seconds to avoid 429
	}
	return Response.json(results);
}
async function fetchPrice(ticker, date) {
	var stockurl = `https://api.polygon.io/v1/open-close/${ticker}/${date}?adjusted=true&apiKey=4oF5iKiOq2RPMp_IMEFdOp9kz02lsw7D`;
	const init = {
		headers: {
		  "content-type": "application/json;charset=UTF-8",
		},
	  };
	const response = await fetchWithRetry(stockurl, init);
	return await response.json();
}

async function fetchWithRetry(url, options = {}, retries = 3, delay = 10000) {
	for (let i = 0; i < retries; i++) {
	  try {
		const response = await fetch(url, options);
		if (response.ok) {
		  return response;
		} else {
		  console.warn(`Fetch failed with status ${response.status}. Retrying...`);
		}
	  } catch (error) {
		console.error(`Fetch failed: ${error.message}. Retrying...`);
	  }
	  await sleep(delay); // Exponential backoff
	}
	throw new Error(`Fetch failed after ${retries} attempts.`);
  }

/**
 * @param {number} ms
 */
async function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export class StockInformation extends DurableObject {
	constructor(ctx, env) {
		// Required, as we're extending the base class.
		super(ctx, env);
	}

	async sayHello() {
		let result = this.ctx.storage.sql
		  .exec("SELECT 'Hello, World!' as greeting")
		  .one();
		return result.greeting;
	}

	async getValue(ticker) {
	  let value = (await this.ctx.storage.get(ticker)) || 0;
	  return value;
	}

	// You do not have to worry about a concurrent request having modified the value in storage.
	// "input gates" will automatically protect against unwanted concurrency.
	// Read-modify-write is safe.
	async saveValue(ticker, value) {
	  await this.ctx.storage.put(ticker, value);
	  return value;
	}
  }

