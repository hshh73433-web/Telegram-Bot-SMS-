// Admin-only utility endpoint.
//
// Visit once after deploy to auto-register the webhook with Telegram:
//   https://YOUR_SITE.netlify.app/.netlify/functions/verify?key=YOUR_WEBHOOK_SECRET
//
// Check current webhook status:
//   https://YOUR_SITE.netlify.app/.netlify/functions/verify?key=YOUR_WEBHOOK_SECRET&action=info

const { WEBHOOK_SECRET, SITE_URL } = require('./lib/config');
const tg = require('./lib/telegram');

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};

  if (!WEBHOOK_SECRET || params.key !== WEBHOOK_SECRET) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  if (params.action === 'info') {
    const info = await tg.getWebhookInfo();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(info, null, 2),
    };
  }

  if (!SITE_URL) {
    return {
      statusCode: 500,
      body: 'SITE_URL could not be determined. Set the SITE_URL env var manually, or rely on Netlify\'s built-in URL variable.',
    };
  }

  const webhookUrl = `${SITE_URL}/.netlify/functions/webhook`;
  const result = await tg.setWebhook(webhookUrl, WEBHOOK_SECRET);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ webhookUrl, result }, null, 2),
  };
};
