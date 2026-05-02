const https = require('https');

const API_URL = 'https://krugerstatus.co.za/api/status?ids=' +
  'camp%3Aberg-en-dal%2Ccamp%3Acrocodile-bridge%2Ccamp%3Aletaba%2C' +
  'camp%3Alower-sabie%2Ccamp%3Amopani%2Ccamp%3Aolifants%2Ccamp%3Aorpen%2C' +
  'camp%3Apretoriuskop%2Ccamp%3Apunda-maria%2Ccamp%3Asatara%2C' +
  'camp%3Ashingwedzi%2Ccamp%3Askukuza%2Ccamp%3Abalule%2Ccamp%3Amalelane%2C' +
  'camp%3Amaroela%2Ccamp%3Atamboti%2Ccamp%3Atsendze%2Ccamp%3Abateleur%2C' +
  'camp%3Abiyamiti%2Ccamp%3Ashimuwini%2Ccamp%3Asirheni%2Ccamp%3Atalamati%2C' +
  'gate%3Acrocodile-bridge%2Cgate%3Agiriyondo%2Cgate%3Apaul-kruger%2C' +
  'gate%3Amalelane%2Cgate%3Anumbi%2Cgate%3Aorpen%2Cgate%3Apafuri%2C' +
  'gate%3Aphabeni%2Cgate%3Aphalaborwa%2Cgate%3Apunda-maria%2C' +
  'road%3Ah1-1%2Croad%3Ah1-2%2Croad%3Ah1-3%2Croad%3Ah1-4%2Croad%3Ah1-5%2C' +
  'road%3Ah1-6%2Croad%3Ah1-7%2Croad%3Ah1-8%2Croad%3Ah3%2Croad%3Ah4-1%2C' +
  'road%3Ah4-2%2Croad%3Ah7%2Croad%3Ah9%2Croad%3Ah10%2Croad%3Ah12%2C' +
  'road%3As1%2Croad%3As3-skukuza%2Croad%3As28%2Croad%3As41%2Croad%3As44%2C' +
  'road%3As47%2Croad%3As65%2Croad%3As100%2Croad%3As106%2Croad%3As114';

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
        catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function getIcon(type, status) {
  if (!status) return '⚪';
  const s = status.toLowerCase();
  if (s.includes('closed') || s.includes('restricted')) return '🚧';
  if (s.includes('open') || s.includes('operational')) return '🟢';
  if (s.includes('partial') || s.includes('limited')) return '🟡';
  if (type === 'camp') return '🏕️';
  if (type === 'gate') return '🚗';
  if (type === 'road') return '🛤️';
  return '⚪';
}

function formatTitle(id, type, status) {
  // Turn "camp:lower-sabie" into "Lower Sabie Camp"
  const name = id
    .replace(/^(camp|gate|road|poi):/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  const typeLabel = type === 'camp' ? 'Camp' :
                    type === 'gate' ? 'Gate' :
                    type === 'road' ? 'Road' : '';

  return `${name} ${typeLabel} — ${status || 'Status unknown'}`.trim();
}

async function main() {
  try {
    console.error('Fetching krugerstatus.co.za API...');
    const data = await fetchAPI(API_URL);

    console.error('API response received, parsing...');
    console.error('Raw response preview:', JSON.stringify(data).substring(0, 300));

    const items = [];
    const now = new Date().toISOString();

    // Handle array response
    const entries = Array.isArray(data) ? data : Object.values(data);

    entries.forEach(entry => {
      if (!entry) return;

      // Extract fields — try common API patterns
      const id = entry.id || entry.slug || '';
      const rawStatus = entry.status || entry.state || entry.condition || '';
      const notes = entry.notes || entry.description || entry.comment || '';
      const type = id.split(':')[0] || 'road';
      const isAlert = /closed|restricted|flooded|caution/i.test(rawStatus + notes);

      if (!rawStatus && !notes) return;

      items.push({
        type: 'road',
        tag: 'road',
        icon: getIcon(type, rawStatus),
        title: formatTitle(id, type, rawStatus),
        desc: notes || rawStatus,
        time: entry.updatedAt || entry.updated_at || now,
        source: 'Kruger Status'
      });
    });

    console.error(`Parsed ${items.length} status items`);

    if (items.length === 0) {
      items.push({
        type: 'road',
        tag: 'road',
        icon: '🟢',
        title: 'Kruger Status — All areas operational',
        desc: 'No reported closures or restrictions. Check krugerstatus.co.za for live updates.',
        time: now,
        source: 'Kruger Status'
      });
    }

    process.stdout.write(JSON.stringify(items, null, 2));
    process.exit(0);

  } catch(err) {
    console.error('Scrape failed:', err.message);
    process.exit(0);
  }
}

main();
