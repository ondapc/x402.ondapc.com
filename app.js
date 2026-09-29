import dotenv from "dotenv"; dotenv.config();
import { Hono } from "hono";
import { cors } from "hono/cors";
import { html } from 'hono/html';
import { serve } from "@hono/node-server";
import { paymentMiddleware, x402ResourceServer } from "@x402-avm/hono";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ExactAvmScheme } from "@x402-avm/avm/exact/server";
import { ALGORAND_MAINNET_CAIP2 } from "@x402-avm/avm";
import { avmPaywall } from "@x402-avm/paywall";
import { bazaarResourceServerExtension, declareDiscoveryExtension } from "@x402-avm/extensions";
import { readFile } from 'fs/promises';
import mysql from 'mysql';
import util from 'util';
import fs from 'node:fs/promises';
// X402 FACILITATOR
const facilitator = new HTTPFacilitatorClient();
const resourceServer = new x402ResourceServer([facilitator]);
resourceServer.register(ALGORAND_MAINNET_CAIP2, new ExactAvmScheme());

// BAZAAR DISCOVERY EXTENSION
resourceServer.registerExtension(bazaarResourceServerExtension);

// DISCOVERY META DATA
const payDiscovery = declareDiscoveryExtension({
  input: { id: "12345" },
  inputSchema: {
    properties: {
      id: {
        type: "string",
        description: "Numeric product ID to purchase a file.",
      },
    },
    required: ["id"],
  },
  output: {
    example: {
      downloadUrl: "/download/<one-time-token>",
      expiresInSeconds: 300,
    },
    schema: {
      properties: {
        downloadUrl: { type: "string" },
        expiresInSeconds: { type: "number" },
      },
    },
  },
});

const horoscopeDiscovery = declareDiscoveryExtension({
  input: {  },
  inputSchema: {
    properties: {},
    required: [],
  },
  output: {
    example: {
      ID: "12345",
      DATE: "YYYY-MM-DD",
      IDZODIAC: "1-12",
      EN: "Aquarius, Pisces, Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn ",
      ES: "Acuario, Piscis, Aries, Tauro, Géminis, Cáncer, Leo, Virgo, Libra, Escorpio, Sagitario, Capricornio ",
      HOROSCOPE_EN: "English horoscope for the 12 months", 
      HOROSCOPE_ES: "El horoscope de los 12 meses en Español",
      DATE_EN: "Jan 20 - Feb 18",    
      DATE_ES: "Ene 20 - Feb 18",                                 
    },
    schema: {
      properties: {
        ID: { type: "number" },
        DATE: { type: "string" },
        IDZODIAC: { type: "number" },
        EN: { type: "string" },
        ES: { type: "string" },
        HOROSCOPE_EN: { type: "string" }, 
        HOROSCOPE_ES: { type: "string" }, 
        DATE_EN: { type: "string" }, 
        DATE_ES: { type: "string" }, 
      },
    },
  },
});
 
const weatherDiscovery = declareDiscoveryExtension({
  input: { lat: "40.730610", lon: "-73.935242" },
  inputSchema: {
    properties: {
      lat: {
        type: "string",
        description: "Latitude of the location, decimal degrees",
      },
      lon: {
        type: "string",
        description: "Longitude of the location, decimal degrees",
      },
    },
    required: ["lat", "lon"],
  },
  output: {
    example: {
      lat: 40.73061,
      lon: -73.935242,
      current: {
        temp: 24.6,
        feels_like: 25.1,
        humidity: 58,
        conditions: "Partly cloudy",
      },
      hourly: [
        { time: "2026-08-11T13:00:00Z", temp: 25.0, precipProb: 10 },
      ],
      daily: [
        { date: "2026-08-11", tempMin: 19.0, tempMax: 27.0 },
      ],
    },
    schema: {
      properties: {
        lat: { type: "number" },
        lon: { type: "number" },
        current: { type: "object" },
        hourly: { type: "array" },
        daily: { type: "array" },
      },
      description: "Full response includes extended hourly/daily arrays and additional fields beyond this truncated example.",
    },
  },
});

const qrcodeDiscovery = declareDiscoveryExtension({
  input: { token: "token or secret string" },
  inputSchema: {
    properties: {
      token: {
        type: "string",
        description: "A string that will be converted to a QR image",
      },
    },
    required: ["token"],
  },
});

const markdownDiscovery = declareDiscoveryExtension({
  input: { url: "A valid URL will be downloaded and converted to markdown" },
  inputSchema: {
    properties: {
      url: {
        type: "string",
        description: "HTML will be converted to markdown.",
      },
    },
    required: ["url"],
  },
});

const fundMyAgentDiscovery = declareDiscoveryExtension({
  input: { algo: "A valid Algorand address will be sent USDC" },
  inputSchema: {
    properties: {
      algo: {
        type: "string",
        description: "The Algorand address, with USDC enabled will be funded USDC.",
      },
    },
    required: ["algo"],
  },
});

const DOsearchDiscovery = declareDiscoveryExtension({
  input: { query: "A text input query that Deepseek + OpenAI will return different results for the same query" },
  inputSchema: {
    properties: {
      query: {
        type: "string",
        description: "Using two AI's to determine if their responses are better, more accurate, or even related.",
      },
    },
    required: ["query"],
  },
});

const marketDiscovery = declareDiscoveryExtension({
  input: { query: "Given a crypto pair get a predictive json price for your AI agents to use." },
  inputSchema: {
    properties: {
      query: {
        type: "string",
        description: "This service takes a crypto + stablecoin and generates using AI prediction algorithm taking multiple time frames and signal indicators to generate JSON resultset",
      },
    },
    required: ["query"],
  },
});

const img2asciiDiscovery = declareDiscoveryExtension({
  input: { url: "Given a valid image the server generates a colored ascii version." },
  inputSchema: {
    properties: {
      image: {
        type: "file",
        description: "Image will be converted to ascii",
      },
    },
    required: ["image"],
  },
});

const gigCreateDiscovery = declareDiscoveryExtension({
  input: { query: "Given a valid string, the payer is allowed to add a gig on the system for all to bid or contract." },
  inputSchema: {
    properties: {
      token: {
        type: "string",
        description: "In the GIG economy, many players and agents will provide or seek services.",
      },
    },
    required: ["token"],
  },
});

const gigBidDiscovery = declareDiscoveryExtension({
  input: { query: "Given a valid string, the payer is allowed to bid on a given gig." },
  inputSchema: {
    properties: {
      token: {
        type: "string",
        description: "In the GIG economy, many players and agents will provide their services for a given price.",
      },
    },
    required: ["token"],
  },
});

const gigContactDiscovery = declareDiscoveryExtension({
  input: { query: "Given a valid string, the payer is allowed to view contact the creator of the gig or other valid bidders." },
  inputSchema: {
    properties: {
      token: {
        type: "string",
        description: "In the GIG economy, many players and agents will provide or seek services.",
      },
    },
    required: ["token"],
  },
});


// TOKEN GENERATION FOR FILE DOWNLOADS
import crypto from 'crypto';
const token = crypto.randomBytes(32).toString('hex');
const downloadTokens = new Map();

const app = new Hono();

// ADD X402 MIDDLEWARE FOR AGENTS
app.get('/.well-known/x402', (c) => {
  const manifest = {
    x402Version: 2,
    kind: "resource-server",
    name: "x402.ondapc.com",
    resources: [
		{ "url": "https://x402.ondapc.com/gig" },    
		{ "url": "https://crypto-prediction.ondapc.com" },
		{ "url": "https://x402.ondapc.com/do_search" },
		{ "url": "https://fundmyagent.ondapc.com/" }, 
		{ "url": "https://x402.ondapc.com/horoscope" }, 
		{ "url": "https://x402.ondapc.com/weather" }, 
		{ "url": "https://x402.ondapc.com/qrcode" },     
		{ "url": "https://x402.ondapc.com/markdown" },  
		{ "url": "https://x402.ondapc.com/img2ascii" },  		
    ]
  };
  return c.json(manifest);
});

// ADD CORS MIDDLEWARE WITH X402 PAYMENT HEADERS EXPOSED
app.use(
  cors({
    origin: "*", // or specify your frontend domain
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "PAYMENT-REQUIRED", // x402 payment request
    ],
    exposeHeaders: [
      "PAYMENT-REQUIRED", // Expose payment challenge
      "PAYMENT-RESPONSE", // Expose payment response
      "X-Payment-Scheme",
      "X-Payment-Price",
      "X-Payment-Network",
      "X-Payment-Address",
    ],
    credentials: true,
  })
);

/* CONSOLE LOG REQUESTS */
app.use('*', async (c, next) => {
  console.log(
    '>>> REQUEST',
    c.req.method,
    c.req.url,
    'path=',
    c.req.path
  );

  console.log(
    '>>> PAYMENT HEADER:',
    c.req.header('PAYMENT-SIGNATURE')
      ? 'PRESENT'
      : 'ABSENT'
  );

  await next();

  console.log(
    '<<< RESPONSE',
    c.req.method,
    c.req.path,
    c.res.status
  );
});


// MYSQL DATABASE CONFIGURATION
let con = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});
con.connect(function (err) {
  if (err) throw err;
  console.log('✅ MySQL Connected!');
});

const query = util.promisify(con.query).bind(con);

// SIMPLE CACHE SO WE'RE NOT HITTING MYSQL EVERY REQUEST
const productCache = new Map();
const CACHE_TTL_MS = 60_000;

// GET PRODUCT DATA FOR SERVICES FROM DB
async function getProductConfig(id) {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId < 0) return null;

  const cached = productCache.get(numId);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return cached.data;
  }

  const result = await query('SELECT * FROM products WHERE id = ?', [numId]);
  const product = result[0];
  if (!product) return null;

  const data = {
    network: ALGORAND_MAINNET_CAIP2,
    payTo: product.avm_address,
    price: product.avm_price,
    description: product.avm_description,
    filePath: product.file_path,
    fileName: product.file_name,
    mimeType: product.file_mime, 
  };

  productCache.set(numId, { data, time: Date.now() });
  return data;
}

// GIG PROJECT CREATE VALID
async function getGigConfig(id) {
    console.log('getGigConfig called with:', id, typeof id);
	if (typeof id !== 'string') return null;
	const token = id.trim();
	if (!/^[a-zA-Z0-9]{32}$/.test(token)) return null;

	const cached = productCache.get(token);
	if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
		return cached.data;
	}

	const result = await query('SELECT * FROM gigs WHERE token = ?', [token]);
	const gig = result[0];
	if (!gig) return null;

	const data = {
	  payTo: gig.gig_algo_addr,
	  price: gig.amount,
	  description: gig.gig_prompt,
	  category: gig.category,
	  subcategory: gig.subcategory,
	  family: gig.family,
	  email: gig.email,
	  token: gig.token,
	  status: gig.status,
	};
	return JSON.stringify(data);
}

// PAWALL STATIC CONFIGURATION
const paywallConfig = {
  currentUrl: "https://x402.ondapc.com",
  testnet: false,
  appName: "x402 Digital Payment App",
  appLogo: "https://x402.ondapc.com/logo.png"
};

// HOME
app.get('/', async (c) => {
  console.log('⚙️  X402 Server running at /');
  const fileContent = await fs.readFile('html/home.html', 'utf-8');
  return c.html(fileContent);
});

// PAY WITH REQ ID
app.get('/api/pay', async (c, next) => {
      
  // 1. Trim and validate first
  const id = c.req.query('id')?.trim() || 10101;
  
  // 2. Check if empty after trim
  if (!id) {
    return c.json({ error: "ID is required 🙁" }, 400);
  }
  
  // 3. Validate format (depending on your ID type)
  const numericId = parseInt(id, 10);
  if (isNaN(numericId) || numericId < 1) {
    return c.json({ error: "Invalid ID format 🙁" }, 400);
  }
  
  // 4. Now fetch safely
  const config = await getProductConfig(numericId);
  if (!config) {
    return c.json({ error: "Product not found 🙁" }, 404);
  }  
  
  const cfg = config;
  const routes = {
    'GET /api/pay': {
      accepts: {
        scheme: 'exact',
        network: ALGORAND_MAINNET_CAIP2,
        payTo: cfg.payTo,
        price: cfg.price,
        extra: {
          tag: 'x402-global-challenge',
          query: 'Product ID: ' + id
        },
      },
      description: cfg.description,
      mimeType: cfg.mimeType || 'application/octet-stream',
      extensions: payDiscovery,
    },
  };
  const payment = paymentMiddleware(routes, resourceServer, paywallConfig, avmPaywall);
  return payment(c, next);

});

app.get('/api/pay', async (c) => {
  console.log('=== 💲  DATABASE PAYMENT MADE ===');
  // 1. Trim and validate first
  const id = c.req.query('id')?.trim() || 10101;
  
  // 2. Check if empty after trim
  if (!id) {
    return c.json({ error: "ID is required" }, 400);
  }
  
  // 3. Validate format (depending on your ID type)
  const numericId = parseInt(id, 10);
  if (isNaN(numericId) || numericId < 1) {
    return c.json({ error: "Invalid ID format 🙁" }, 400);
  }
  
  // 4. Now fetch safely
  const config = await getProductConfig(numericId);
  if (!config) {
    return c.json({ error: "Product not found 🙁" }, 404);
  }  

  // generate a one-time token instead of returning the file directly
  const token = crypto.randomBytes(32).toString('hex');
  downloadTokens.set(token, {
    filePath: config.filePath,
    fileName: config.fileName,
    mimeType: config.mimeType,
    expires: Date.now() + 5 * 60_000, // 5 min
  });

  // return JSON — the paywall's blob flow handles this fine
  return c.html(`
    <div style="font-family: sans-serif; text-align: center; margin-top: 90px;">
      <h2>Payment Confirmed ✅</h2>
      <p>To save the file click on: <a href="/download/${token}" style="font-size: 1.2em;"> Download Now</a></p>
      <p><i>Link will expire in 5 minutes or after downloading once.</i></p>
    </div>
  `);  
});

app.get('/download/:token', async (c) => {
  const token = c.req.param('token');
  const entry = downloadTokens.get(token);

  if (!entry || Date.now() > entry.expires) {
    return c.html(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 90px;">
        <h2>Link expired or invalid 😔</h2>
        <p>Once you download the link, the file session expires.</p>
        <p><i>You should have the filed saved to your <b>downloads</i> folder.</p>
      </div>
    `);     
  }

  downloadTokens.delete(token); // one-time use token expiration

  const fileBuffer = await readFile(entry.filePath);
  c.header('Content-Type', entry.mimeType);
  c.header('Content-Disposition', `attachment; filename="${entry.fileName}"`);
  return c.body(fileBuffer);
});

/*--------------------------------------------------------------------------------- END PAYMENT MODULE */

app.get('/horoscope', async (c) => {
  const fileContent = await fs.readFile('html/horoscope.html', 'utf-8');
  return c.html(fileContent);
});

app.get('/horoscope/pay', async (c, next) => {

  const id = 12357;
  const config = id ? await getProductConfig(id) : null;
  const cfg = config;
  const routes = {
    'GET /horoscope/pay': {
      accepts: {
        scheme: 'exact',
        network: ALGORAND_MAINNET_CAIP2,
        payTo: cfg.payTo,
        price: cfg.price,
        extra: {
          tag: 'x402-global-challenge',
          query: `Daily horoscopes for all 12 signs for ${new Date().toISOString().slice(0, 10)}`,
        },
      },
      description: cfg.description,
      mimeType: cfg.mimeType || 'application/json',
      extensions: horoscopeDiscovery,
    },
  };
  const payment = paymentMiddleware(routes, resourceServer, paywallConfig, avmPaywall);
  return payment(c, next);

});

app.get('/horoscope/pay', async (c) => {
  console.log('=== 💲  HOROSCOPE PAYMENT MADE ===');
  const url = process.env.URL_HOROSCOPE;
  // Make an HTTP GET request
  const response = await fetch(url);
  // Always check the HTTP status before parsing the response fetch only rejects on network errors, not on 4xx / 5xx
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  // Parse the response body as JSON
  const data = await response.json();
  return c.json(data);  
});

/*--------------------------------------------------------------------------------- END HOROSCOPE MODULE */

app.get('/weather', async (c) => {
  const fileContent = await fs.readFile('html/weather.html', 'utf-8');
  return c.html(fileContent);
});

app.get('/weather/pay', async (c, next) => {
  const id = 12358;	
  const lat = c.req.query('lat') || "40.730610";
  const lon = c.req.query('lon') || "-73.935242";
  const config = id ? await getProductConfig(id) : null;
  const cfg = config;
  const routes = {
    'GET /weather/pay': {
      accepts: {
        scheme: 'exact',
        network: ALGORAND_MAINNET_CAIP2,
        payTo: cfg.payTo,
        price: cfg.price,
        extra: {
          tag: 'x402-global-challenge',
          query: 'lat:' + lat + ' lon:' + lon,
        },
      },
      description: cfg.description,
      mimeType: cfg.mimeType || 'application/json',
      extensions: weatherDiscovery,
    },
  };
  const payment = paymentMiddleware(routes, resourceServer, paywallConfig, avmPaywall);
  return payment(c, next);

});

app.get('/weather/pay', async (c) => {
  console.log('=== 💲  WEATHER PAYMENT MADE ===');

  const lat = parseFloat(c.req.query('lat')) || 40.730610;
  const lon = parseFloat(c.req.query('lon')) || -73.935242;
  
  const url = new URL(process.env.URL_WEATHER);
  url.searchParams.set('lat', lat.toString());
  url.searchParams.set('lon', lon.toString());
 
  // Make an HTTP GET request
  const response = await fetch(url);
  // Always check the HTTP status before parsing the response fetch only rejects on network errors, not on 4xx / 5xx
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  // Parse the response body as JSON
  const data = await response.json();
  return c.json(data);  
});

/*--------------------------------------------------------------------------------- END WEATHER MODULE */

app.get('/qrcode', async (c) => {
  const fileContent = await fs.readFile('html/qrcode.html', 'utf-8');
  return c.html(fileContent);
});

app.get('/qrcode/pay', async (c, next) => {
  const id = 12359;	
  const token = c.req.query('token') || "QR Token Code";

  const config = id ? await getProductConfig(id) : null;
  const cfg = config;
  const routes = {
    'GET /qrcode/pay': {
      accepts: {
        scheme: 'exact',
        network: ALGORAND_MAINNET_CAIP2,
        payTo: cfg.payTo,
        price: cfg.price,
        extra: {
          tag: 'x402-global-challenge',
          query: 'QR Code: ' + token,
        },
      },
      description: cfg.description,
      mimeType: cfg.mimeType || 'text/html',
      extensions: qrcodeDiscovery,
    },
  };
  const payment = paymentMiddleware(routes, resourceServer, paywallConfig, avmPaywall);
  return payment(c, next);

});

app.get('/qrcode/pay', async (c) => {
  console.log('=== 💲  QR CODE PAYMENT MADE ===');
  const token = c.req.query('token') || "QR Token Code Service";
  const url = new URL(process.env.URL_QRCODE);
  url.searchParams.set('token', token);
  const response = await fetch(url);

  // Always check the HTTP status before parsing the response fetch only rejects on network errors, not on 4xx / 5xx
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const response_html = await response.text();
  return c.html(response_html);  
});

/*--------------------------------------------------------------------------------- END QR CODE MODULE */

// URL VALIDATION 
function isValidAndSafeUrl(input) {
  try {
    const url = new URL(input);
    // Only allow http and https protocols for security
    return ['http:', 'https:'].includes(url.protocol);
  } catch (_) {
    return false;
  }
}

app.get('/markdown', async (c) => {
  const fileContent = await fs.readFile('html/markdown.html', 'utf-8');
  return c.html(fileContent);
});

app.get('/markdown/pay', async (c, next) => {
  const id = 12360;	
  const url = c.req.query('url');

  const config = id ? await getProductConfig(id) : null;
  const cfg = config;
  
  // VALIDATE THE URL BEFORE USING IT
  if (!url || !isValidAndSafeUrl(url)) {
    // Handle invalid URL - return error response
    c.status(400);
    return c.json({ 
      error: 'Invalid or unsafe URL provided ☹️',
      message: 'URL must be a valid http or https address'
    });
  }  
    
  const routes = {
    'GET /markdown/pay': {
      accepts: {
        scheme: 'exact',
        network: ALGORAND_MAINNET_CAIP2,
        payTo: cfg.payTo,
        price: cfg.price,
        extra: {
          tag: 'x402-global-challenge',
          query: 'Markdown URL: ' + url,
        },
      },
      description: cfg.description,
      description: `${cfg.description} -- ${url}`, // ✅ Append query to description
      mimeType: cfg.mimeType || 'text/plain',
      extensions: markdownDiscovery,
    },
  };
  const payment = paymentMiddleware(routes, resourceServer, paywallConfig, avmPaywall);
  return payment(c, next);

});

app.get('/markdown/pay', async (c) => {
  console.log('=== 💲  MARKDOWN SERVICE PAYMENT MADE ===');
  const html_url = c.req.query('url');
  const url = process.env.URL_MARKDOWN + html_url;
  // Make an HTTP GET request
  const response = await fetch(url);
  // Always check the HTTP status before parsing the response fetch only rejects on network errors, not on 4xx / 5xx
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const response_html = await response.text();
  return c.html(response_html);  
});

/*--------------------------------------------------------------------------------- END MARKDOWN MODULE */

app.get('/fundmyagent', async (c) => {
  const fileContent = await fs.readFile('html/fund_my_agent.html', 'utf-8');
  return c.html(fileContent);
});

app.get('/fundmyagent/pay', async (c, next) => {
  const id = 12361;	
  const algo = c.req.query('algo') || "HVIQFXXUHJYHQH4TXLHOXVOXQPWJRDETOSBWIHSSL5BMMH56AKOIAQL7RM";

  const config = id ? await getProductConfig(id) : null;
  const cfg = config;
  const routes = {
    'GET /fundmyagent/pay': {
      accepts: {
        scheme: 'exact',
        network: ALGORAND_MAINNET_CAIP2,
        payTo: algo,
        price: cfg.price,
        extra: {
          tag: 'x402-global-challenge',
          query: 'Agent Funding Address: ' + algo,
        },
      },
      description: `${cfg.description}   ${algo}`, // ✅ Append algorand to description
      mimeType: cfg.mimeType || 'text/html',
      extensions: fundMyAgentDiscovery,
    },
  };
  const payment = paymentMiddleware(routes, resourceServer, paywallConfig, avmPaywall);
  return payment(c, next);

});

app.get('/fundmyagent/pay', async (c) => {
  console.log('=== 💲  FUND MY AGENT SERVICE PAYMENT MADE ===');
  const algo = c.req.query('algo') || "HVIQFXXUHJYHQH4TXLHOXVOXQPWJRDETOSBWIHSSL5BMMH56AKOIAQL7RM";
  return c.html(`
    <div style="font-family: sans-serif; text-align: center; margin-top: 90px;">
      <h2>Payment Confirmed ✅</h2>
      <p>The following address was sent a payment of USDC to their Algorand address. </p>
      <p><i>You can confirm the link using the explorer <a href="https://explorer.perawallet.app/address/`+algo+`/">Algorand Pera Explorer</a></i></p>
    </div>
  `);  
});

/*--------------------------------------------------------------------------------- END MARKDOWN MODULE */

app.get('/do_search', async (c) => {
  const fileContent = await fs.readFile('html/deepseek_openai_search.html', 'utf-8');
  return c.html(fileContent);
});

app.get('/do_search/pay', async (c, next) => {
  const id = 12362;	
  const q = c.req.query('q') || "hello";
  const config = id ? await getProductConfig(id) : null;
  const cfg = config;
  const routes = {
    'GET /do_search/pay': {
      accepts: {
        scheme: 'exact',
        network: ALGORAND_MAINNET_CAIP2,
        payTo: cfg.payTo,
        price: cfg.price,
        extra: {
          tag: 'x402-global-challenge',
          query: 'deepseek+openai query= ' + q,  // ✅ Pass the symbol to middleware
        },
      },
      description: cfg.description,
      mimeType: cfg.mimeType || 'application/json',
      extensions: DOsearchDiscovery,
    },
  };
  const payment = paymentMiddleware(routes, resourceServer, paywallConfig, avmPaywall);
  return payment(c, next);

});

app.get('/do_search/pay', async (c) => {
  console.log('=== 💲  DEEPSEEK + OPENAI PAYMENT MADE ===');
  
  const q = c.req.query('query') || "hello";
  const url = new URL(process.env.URL_DOSEARCH);
  url.searchParams.set('query', q);
  const response = await fetch(url);

  // Always check the HTTP status before parsing the response fetch only rejects on network errors, not on 4xx / 5xx
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  // Parse the response body as JSON
  const data = await response.json();
  return c.json(data);  
});

/*--------------------------------------------------------------------------------- END DEEPSEEK + OPENAI MODULE */


app.get('/market', async (c) => {
  const fileContent = await fs.readFile('html/market_prediction.html', 'utf-8');
  return c.html(fileContent);
});

app.get('/market/pay', async (c, next) => {
  const id = 12363;	
  const q = c.req.query('query') || "btcusdt";
  const config = id ? await getProductConfig(id) : null;
  const cfg = config;
  const routes = {
    'GET /market/pay': {
      accepts: {
        scheme: 'exact',
        network: ALGORAND_MAINNET_CAIP2,
        payTo: cfg.payTo,
        price: cfg.price,
        extra: {
          tag: 'x402-global-challenge',
          query: 'Crypto Prediction for ' + q,
        },
      },
      description: `${cfg.description} ${q.toUpperCase()}`, // ✅ Append query to description
      mimeType: cfg.mimeType || 'application/json',
      extensions: marketDiscovery,
    },
  };
  const payment = paymentMiddleware(routes, resourceServer, paywallConfig, avmPaywall);
  return payment(c, next);

});

app.get('/market/pay', async (c) => {
  console.log('=== 💲  MARKET PREDICTION SERVICE PAYMENT MADE ===');
  const token = c.req.query('query') || "btcusdt";
  const url = process.env.URL_CRYPTO_PREDICTION + token;
  // Make an HTTP GET request
  const response = await fetch(url);
  // Always check the HTTP status before parsing the response fetch only rejects on network errors, not on 4xx / 5xx
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  // ✅ Make it downloadable
  // ✅ Use c.body() instead of c.json() to keep custom headers
  c.header('Content-Disposition', `attachment; filename="${token}_prediction.json"`);
  c.header('Content-Type', 'application/json');
  return c.body(JSON.stringify(data));
});

/*--------------------------------------------------------------------------------- END MARKETDATA PREDICTION ALGORITHM */

app.get('/img2ascii', async (c) => {
  const fileContent = await fs.readFile('html/image2ascii.html', 'utf-8');
  return c.html(fileContent);
});

app.post('/img2ascii/pay', async (c) => {

  // 1.) LETS GET THE IMAGE AND PROCESS
  const formData = await c.req.formData();
  const imageFile = formData.get('image'); // FormData file from client
  const url = process.env.URL_IMG2ASCII;
  
  // create formdata to send to php
  const phpFormData = new FormData();
  phpFormData.append('image', imageFile); // Add the image file
  phpFormData.append('sent', '');
   
  // Make HTTP POST request with the image
  const response = await fetch(url, {
    method: 'POST',
    body: phpFormData
  });
  // Always check the HTTP status before parsing the response fetch only rejects on network errors, not on 4xx / 5xx
  if (!response.ok) {
    return c.json({ error: 'Invalid Image Request' }, 400);
  }
  // Parse the response body as text
  const data = await response.text();
  return c.html(data);
});

/*--------------------------------------------------------------------------------- END IMG2ASCII ( FREE ) */

// VALIDATE GIG TOKEN
function validateGigToken(token) {
  if (typeof token !== 'string') return false;
  if (token.length !== 32) return false;
  if (!/^[a-zA-Z0-9]+$/.test(token)) return false;
  return true;
}

// VALIDATE A BID ON GIG
function validateNumberID(id) {
  return typeof id === 'string' && /^[1-9]\d*$/.test(id);
}

// ADD A GIG
app.get('/gig', async (c) => {
  const fileContent = await fs.readFile('html/gigs.html', 'utf-8');
  return c.html(fileContent);
});

app.get('/gig/pay', async (c, next) => {
  const id = 12367;	
  const token = c.req.query('token');
  if (!validateGigToken(token)) {
    return c.json({ error: 'Invalid token format' }, 400);
  }  

  const config = id ? await getProductConfig(id) : null;
  const cfg = config;
  const routes = {
    'GET /gig/pay': {
      accepts: {
        scheme: 'exact',
        network: ALGORAND_MAINNET_CAIP2,
        payTo: cfg.payTo,
        price: cfg.price,
        extra: {
          tag: 'x402-global-challenge',
          query: 'Create a gig with token: ' + token,
        },
      },
      description: `${cfg.description}`, // ✅ Append query to description
      mimeType: cfg.mimeType || 'text/json',
      extensions: gigCreateDiscovery,
    },
  };
  const payment = paymentMiddleware(routes, resourceServer, paywallConfig, avmPaywall);
  return payment(c, next);
});

app.get('/gig/pay', async (c) => {
  console.log('=== 💲  GIG CONTACT PAYMENT MADE ===');
  const token = c.req.query('token');
  if (!validateGigToken(token)) {
    return c.json({ error: 'Invalid token format' }, 400);
  }  
  const result = await query('UPDATE gigs SET status = "1" WHERE token = ?', [token]); 
  const [row] =  await query('SELECT * FROM gigs WHERE token = ?', [token] );
  c.header('Content-Disposition', `attachment; filename="${token}_gig.json"`);
  c.header('Content-Type', 'application/json');
  return c.json(row);
});

// BID ON A GIG
app.get('/gig/bid/pay', async (c, next) => {
  const id = 12366;	
  const idBid = c.req.query('idBid');
  if (!validateNumberID(idBid)) {
    return c.json({ error: 'Invalid token format' }, 400);
  }  
  const config = id ? await getProductConfig(id) : null;
  const cfg = config;
  const routes = {
    'GET /gig/bid/pay': {
      accepts: {
        scheme: 'exact',
        network: ALGORAND_MAINNET_CAIP2,
        payTo: cfg.payTo,
        price: cfg.price,
        extra: {
          tag: 'x402-global-challenge',
          query: 'Bid on a gig with ID: ' + idBid,
        },
      },
      description: `${cfg.description}`, // ✅ Append query to description
      mimeType: cfg.mimeType || 'text/json',
      extensions: gigBidDiscovery,
    },
  };
  const payment = paymentMiddleware(routes, resourceServer, paywallConfig, avmPaywall);
  return payment(c, next);
});

app.get('/gig/bid/pay', async (c) => {
  console.log('=== 💲  GIG CONTACT PAYMENT MADE ===');
  const idBid = c.req.query('idBid');
  if (!validateNumberID(idBid)) {
    return c.json({ error: 'Invalid id for bid' }, 400);
  }  
  const result = await query('UPDATE gig_bids SET status = "1" WHERE idBid = ?', [idBid]); 
  const [row] =  await query('SELECT * FROM gig_bids WHERE idBid = ?', [idBid] );

  c.header('Content-Disposition', `attachment; filename="${idBid}_gig.json"`);
  c.header('Content-Type', 'application/json');
  return c.json(row);
});

// CONTACT GIG+
app.get('/gig/contact/pay', async (c, next) => {
  const id = 12365;	
  const idContact = c.req.query('idContact');
  if (!validateNumberID(idContact)) {
    return c.json({ error: 'Invalid id sent' }, 400);
  }  

  const config = id ? await getProductConfig(id) : null;
  const cfg = config;
  const routes = {
    'GET /gig/contact/pay': {
      accepts: {
        scheme: 'exact',
        network: ALGORAND_MAINNET_CAIP2,
        payTo: cfg.payTo,
        price: cfg.price,
        extra: {
          tag: 'x402-global-challenge',
          query: 'Contact gig creator with ID: ' + idContact,
        },
      },
      description: `${cfg.description}`, // ✅ Append query to description
      mimeType: cfg.mimeType || 'text/json',
      extensions: gigContactDiscovery,
    },
  };
  const payment = paymentMiddleware(routes, resourceServer, paywallConfig, avmPaywall);
  return payment(c, next);
});

app.get('/gig/contact/pay', async (c) => {
  console.log('=== 💲  GIG CONTACT PAYMENT MADE ===');
  const idContact = c.req.query('idContact');
  if (!validateNumberID(idContact)) {
    return c.json({ error: 'Invalid id sent' }, 400);
  }

  const result = await query('UPDATE gig_contacts SET status = "1" WHERE idContact = ?', [idContact]); 
  const [row] =  await query('SELECT * FROM gig_contacts WHERE idContact = ?', [idContact] );
  if (!row) return res.status(404).json({ error: 'Not found' });
  
  const token = row.token;
  const [contacts] =  await query('SELECT * FROM gig_contacts WHERE status = "1" AND token = ?', [token] );  
  const [bids] =  await query('SELECT * FROM gig_bids WHERE status = "1" AND token = ?', [token] );
  const [gig] =  await query('SELECT * FROM gigs WHERE token = ?', [token] );
    
  // ALTERNATIVE MIGHT BE TO SEND CONTACT EMAIL SERVICE
  const combined = {
  ...gig,      // copies id, token, category, amount
  bids,        // shorthand → bids: bids
  contacts,    // shorthand → contacts: contacts
  };

  c.header('Content-Disposition', `attachment; filename="${token}_gig.json"`);
  c.header('Content-Type', 'application/json');
  return c.json(combined);

});

/*--------------------------------------------------------------------------------- END GIG ECONOMY */

serve({
  fetch: app.fetch,
  port: 3000,
});
console.log('X402 Server Started');
