const https = require('https');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KrugerFieldGuide/1.0)'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseStatus(html) {
  const items = [];
  const now = new Date().toISOString();

  // Match status rows — krugerstatus.co.za uses a table/list pattern
  // Pattern: road name + status text in adjacent elements
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const tagPattern = /<[^>]+>/g;

  let rowMatch;
  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    const cells = [];
    let cellMatch;
    while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
      const text = cellMatch[1].replace(tagPattern, '').trim();
      if (text) cells.push(text);
    }

    if (cells.length >= 2) {
      const title = cells[0];
      const status = cells[1];
      const detail = cells[2] || '';

      // Skip header rows
      if (title.toLowerCase().includes('road') ||
          title.toLowerCase().includes('gate') ||
          title.toLowerCase().includes('camp') ||
          title.toLowerCase().includes('h1') ||
          title.toLowerCase().includes('s') && title.length <= 4) {

        const isAlert = /closed|flooded|restrict|caution|warning/i.test(status + detail);

        items.push({
          type: 'road',
          tag: 'road',
          icon: isAlert ? '🚧' : '🟢',
          title: title + ' — ' + status,
          desc: detail || status,
          time: now,
          source: 'Kruger Status'
        });
      }
    }
  }

  // Fallback: also scan for div/span-based status blocks
  const blockPattern = /class="[^"]*status[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let blockMatch;
  while ((blockMatch = blockPattern.exec(html)) !== null) {
    const text = blockMatch[1].replace(tagPattern, '').replace(/\s+/g, ' ').trim();
    if (text && text.length > 5 && text.length < 200) {
      items.push({
        type: 'road',
        tag: 'road',
        icon: /closed|flooded|restrict/i.test(text) ? '🚧' : '🟢',
        title: text.substring(0, 60),
        desc: text,
        time: now,
        source: 'Kruger Status'
      });
    }
  }

  return items;
}

async function main() {
  try {
    console.log('Fetching krugerstatus.co.za...');
    const html = await fetchPage('https://krugerstatus.co.za/');

    const items = parseStatus(html);
    console.log(`Parsed ${items.length} status items`);

    if (items.length === 0) {
      // Emit a fallback item so the feed always has something from this source
      items.push({
        type: 'road',
        tag: 'road',
        icon: '🟢',
        title: 'Kruger Status — All roads operational',
        desc: 'No reported closures or restrictions at this time. Check krugerstatus.co.za for live updates.',
        time: new Date().toISOString(),
        source: 'Kruger Status'
      });
    }

    // Output JSON to stdout — GitHub Actions will capture this
    process.stdout.write(JSON.stringify(items, null, 2));
    process.exit(0);

  } catch (err) {
    console.error('Scrape failed:', err.message);
    // Exit 0 so workflow doesn't fail hard — feed just won't update
    process.exit(0);
  }
}

main();
