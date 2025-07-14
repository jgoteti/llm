import welcome from "welcome.html";

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

		if (url.pathname === "/api") {
			// You could also call a third party API here
			const data = await import("./data.js");
			return Response.json(data);
		}
		if (url.pathname === "/quote") {
			const tickers = ['ADYEY', 'NET', 'DDOG', 'FBGRX'];
			// const tickers = ['ADYEY', 'NET', 'DDOG', 'FBGRX', 'MELI', 'ARKF', 'FSMEX', 'CRWD', 'AFRM', 'FRSH', 'DASH', 'TTD', 'HIMS']
			var ticker = 'GOOG';
			const today = new Date();
			const yesterday = new Date(today);
			yesterday.setDate(today.getDate() - 1);

			var date = yesterday.toISOString().split("T")[0];
			var results = [];
			for (const ticker of tickers) {
				results.push(await fetchPrice(ticker, date));
			}
			return Response.json(results);
		}
		return new Response(welcome, {
			headers: {
				"content-type": "text/html",
			},
		});
	},
};

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

async function fetchWithRetry(url, options = {}, retries = 3, delay = 60000) {
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
