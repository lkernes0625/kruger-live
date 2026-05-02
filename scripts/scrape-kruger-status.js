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
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('JSON parse failed: ' + data.substring(0, 200))); }
      });
    }).on('error', reject);
  });
}

function formatName(id) {
  return id
    .replace(/^(camp|gate|road|poi):/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}

function getIcon(type, status) {
  if (status === 'closed')  return '&#x1F6AB;';
  if (status === 'limited') return '&#x1F7E1;';
  if (status === 'open' && type === 'camp') return '&#x1F3D5;';
  if (status === 'open' && type === 'gate') return '&#x1F697;';
  if (status === 'open')    return '&#x1F7E2;';
  return '&#x26AA;';
}

function getStatusLabel(status, lastKnown) {
  if (status === 'open')    return 'Open';
  if (status === 'closed')  return 'Closed';
  if (status === 'limited') return 'Limited access';
  if (status === 'unknown' && lastKnown) return 'Last known: ' + lastKnown;
  return 'Status unknown';
}

async function main() {
  try {
    console.error('Fetching krugerstatus.co.za API...');
    const data = await fetchAPI(API_URL);
    const items = data.items || {};
    const now = new Date().toISOString();
    const results = [];

    Object.entries(items).forEach(function(entry) {
      const id = entry[0];
      const item = entry[1];
      const type = id.split(':')[0];
      const status = item.status || 'unknown';
      const lastKnown = item.lastKnownStatus || '';
      const updatedAt = item.updatedAt || now;
      const totalVotes = item.totalVotes || 0;

      // Only include items with actual reports
      if (status === 'unknown' && totalVotes === 0) return;

      const name = formatName(id);
      const typeLabel = type === 'camp' ? 'Camp' : type === 'gate' ? 'Gate' : 'Road';
      const statusLabel = getStatusLabel(status, lastKnown);
      const votesText = totalVotes > 0 ? ' - ' + totalVotes + ' report' + (totalVotes > 1 ? 's' : '') : '';

      results.push({
        type: 'road',
        tag: 'road',
        icon: getIcon(type, status),
        title: name + ' ' + typeLabel + ' - ' + statusLabel,
        desc: 'Community reports' + votesText + '. Source: krugerstatus.co.za',
        time: updatedAt,
        source: 'Kruger Status'
      });
    });

    console.error('Parsed ' + results.length + ' status items');

    // Sort: closed first, then limited, then open
    results.sort(function(a, b) {
      const order = {'&#x1F6AB;': 0, '&#x1F7E1;': 1, '&#x1F7E2;': 2, '&#x1F3D5;': 3, '&#x1F697;': 4, '&#x26AA;': 5};
      return (order[a.icon] !== undefined ? order[a.icon] : 5) - (order[b.icon] !== undefined ? order[b.icon] : 5);
    });

    if (results.length === 0) {
      results.push({
        type: 'road',
        tag: 'road',
        icon: '&#x1F7E2;',
        title: 'Kruger Status - All areas operational',
        desc: 'No reported closures or restrictions. Source: krugerstatus.co.za',
        time: now,
        source: 'Kruger Status'
      });
    }

    process.stdout.write(JSON.stringify(results, null, 2));
    process.exit(0);

  } catch(err) {
    console.error('Failed: ' + err.message);
    process.exit(0);
  }
}

main();
