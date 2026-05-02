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
        catch(e) { reject(new Error('JSON parse failed: ' + data.substring(0, 200))); }
      });
    }).on('error', reject);
  });
}

function formatName(id) {
  return id
    .replace(/^(camp|gate|road|poi):/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function getIcon(type, status) {
  if (status === 'open')    return type === 'camp' ? '🏕️' : type === 'gate' ? '🚗' : '🟢';
  if (status === 'closed')  return '🚫';
  if (status === 'limited') return '🟡';
  return '⚪';
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

    Object.entries(items).forEach(([id, entry]) => {
      const type = id.split(':')[0];
      const status = entry.status || 'unknown';
      const lastKnown = entry.lastKnownStatus || '';
      const confidence = entry.confidence || 'low';
      const updatedAt = entry.updatedAt || now;
      const totalVotes = entry.totalVotes || 0;

      // Only include items that have actual data — skip unknown with 0 votes
      if (status === 'unknown' && totalVotes === 0) return;

      const name = formatName(id);
      const typeLabel = type === 'camp' ? 'Camp' : type === 'gate' ? 'Gate' : 'Road';
      const statusLabel = getStatusLabel(status, lastKnown);
      const votesText = totalVotes > 0 ? ` · ${totalVotes} report${totalVotes > 1 ? 's' : ''}` : '';
      const confidenceText = confidence === 'high' ? ' · High confidence' : '';

      results.push({
        type: 'road',
        tag: 'road',
        icon: getIcon(type, status),
        title: `${name} ${typeLabel} — ${statusLabel}`,
        desc: `Community reports${votesText}${confidenceText}. Source: krugerstatus.co.za`,
        time: updatedAt,
        source: 'Kruger Status'
      });
    });

    console.error(`Parsed ${results.length} status items`);

    // Sort: closed first, then limited, then open
    results.sort((a, b) => {
      const order = { '🚫': 0, '🟡': 1, '🟢': 2, '🏕️': 3, '🚗': 4, '⚪': 5 };
      return (order[a.icon] ?? 5) - (order[b.icon] ?? 5);
    });

    if (results.length === 0) {
      results.push({
        type: 'road',
        tag: 'road',
        icon: '🟢',
        title: 'Kruger Status —
