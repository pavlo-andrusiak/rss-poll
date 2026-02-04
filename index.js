import 'dotenv/config.js';
import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

// Configuration
// You can configure via environment variables:
//   RSS_URL        - URL of the RSS feed to poll (required)
//   POLL_INTERVAL  - Poll interval in milliseconds (default: 60000 = 1 minute)
//
// Example:
//   RSS_URL="https://example.com/feed.xml" POLL_INTERVAL=30000 node index.js

const RSS_URL = process.env.RSS_URL;
const POLL_INTERVAL =
  Number.parseInt(process.env.POLL_INTERVAL, 10) || 60_000; // default 1 minute

if (!RSS_URL) {
  console.error(
    'Missing RSS_URL environment variable. Example:\n' +
      'RSS_URL="https://example.com/feed.xml" node index.js',
  );
  process.exit(1);
}

console.log(`Starting RSS poller`);
console.log(`Feed URL: ${RSS_URL}`);
console.log(`Poll interval: ${POLL_INTERVAL} ms`);

async function fetchRss() {
  try {
    const res = await fetch(RSS_URL, {
      headers: {
        'User-Agent': 'rss-poll/1.0 (+https://example.com)',
        Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
      },
    });

    if (!res.ok) {
      console.error(`Failed to fetch RSS: HTTP ${res.status} ${res.statusText}`);
      return;
    }

    const xml = await res.text();

    const parsed = await parseStringPromise(xml, {
      explicitArray: false,
      trim: true,
    });

    // Try to support both RSS 2.0 and Atom by checking common structures
    const channel = parsed.rss?.channel;
    const items =
      channel?.item ||
      parsed.feed?.entry || // Atom
      [];

    const normalizedItems = Array.isArray(items) ? items : [items];

    console.log(
      `Fetched ${normalizedItems.filter(Boolean).length} items at ${new Date().toISOString()}`,
    );

    // For demo purposes: log titles of latest items (up to 5)
    normalizedItems
      .filter(Boolean)
      .slice(0, 5)
      .forEach((item, index) => {
        const title = item.title?._ || item.title || '(no title)';
        const link = item.link?._ || item.link?.href || item.link || '(no link)';
        console.log(`#${index + 1}: ${title} - ${link}`);
      });
  } catch (err) {
    console.error('Error while fetching/parsing RSS:', err.message || err);
  }
}

// Initial fetch immediately, then on interval
fetchRss();
setInterval(fetchRss, POLL_INTERVAL);
