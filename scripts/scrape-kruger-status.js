const https = require('https');

const API_URL = 'https://krugerstatus.co.za/api/status?ids=' +
  'camp%3Askukuza%2Ccamp%3Alower-sabie%2Ccamp%3Asatara%2C' +
  'gate%3Apaul-kruger%2Cgate%3Amalelane%2C' +
  'road%3Ah1-1%2Croad%3Ah4-1%2Croad%3As100';

function fetchAPI(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KrugerFieldGuide/1.0)',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('JSON parse failed: ' + data.substring(0, 500))); }
      });
    }).on('error', reject);
  });
}

async function main() {
  try {
    console.error('Fetching API...');
    const data = await fetchAPI(API_URL);

    // Log the FULL raw response so we can see the structure
    console.error('=== RAW API RESPONSE ===');
    console.error(JSON.stringify(data, null, 2));
    console.error('=== END RAW RESPONSE ===');

    // For now just output a placeholder so the file saves
    const items = [{
      type: 'road',
      tag: 'road',
      icon: '🟢',
      title: 'Kruger Status — Debug run complete',
      desc: 'Check Actions logs for raw API structure.',
      time: new Date().toISOString(),
      source: 'Kruger Status'
    }];

    process.stdout.write(JSON.stringify(items, null, 2));
    process.exit(0);

  } catch(err) {
    console.error('Failed:', err.message);
    process.exit(0);
  }
}

main();
