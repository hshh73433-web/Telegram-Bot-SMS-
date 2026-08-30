// Central place for all environment variables.
// NEVER hardcode secrets here — everything comes from Netlify Environment Variables.

const REFERRAL_TARGET = parseInt(process.env.REFERRAL_TARGET || '3', 10);

module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  BOT_USERNAME: process.env.BOT_USERNAME, // without @
  ADMIN_ID: process.env.ADMIN_ID,
  VIP_URL: process.env.VIP_URL,
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET, // random string, also used as ?key= for /verify
  REFERRAL_TARGET,
  SITE_URL: process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.SITE_URL,

  CHANNELS: [
    { id: process.env.CHANNEL_1_ID, link: process.env.CHANNEL_1_INVITE_LINK },
    { id: process.env.CHANNEL_2_ID, link: process.env.CHANNEL_2_INVITE_LINK },
    { id: process.env.CHANNEL_3_ID, link: process.env.CHANNEL_3_INVITE_LINK },
  ],

  FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT, // full JSON as a single string
};
