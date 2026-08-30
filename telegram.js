const { BOT_TOKEN } = require('./config');

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function callApi(method, payload) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error(`Telegram API error [${method}]:`, JSON.stringify(data));
  }
  return data;
}

const sendMessage = (chat_id, text, reply_markup) =>
  callApi('sendMessage', {
    chat_id,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup,
  });

const editMessageText = (chat_id, message_id, text, reply_markup) =>
  callApi('editMessageText', {
    chat_id,
    message_id,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup,
  });

const answerCallbackQuery = (callback_query_id, text, show_alert = false) =>
  callApi('answerCallbackQuery', { callback_query_id, text, show_alert });

// Real membership check — no fake/placeholder logic.
const getChatMember = (chat_id, user_id) => callApi('getChatMember', { chat_id, user_id });

const setWebhook = (url, secret_token) =>
  callApi('setWebhook', {
    url,
    secret_token,
    allowed_updates: ['message', 'callback_query'],
  });

const getWebhookInfo = () => callApi('getWebhookInfo', {});

module.exports = {
  sendMessage,
  editMessageText,
  answerCallbackQuery,
  getChatMember,
  setWebhook,
  getWebhookInfo,
};
