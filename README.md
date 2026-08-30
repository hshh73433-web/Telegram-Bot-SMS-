# Telegram Referral Bot — Netlify Deployment Guide

## 📁 Project Structure

```
/
├── index.html
├── netlify.toml
├── package.json
├── .env.example
└── netlify/
    └── functions/
        ├── webhook.js          ← Telegram webhook receiver (main bot logic)
        ├── verify.js           ← Admin endpoint: auto-sets up the webhook
        └── lib/
            ├── config.js       ← reads all environment variables
            ├── telegram.js     ← Telegram Bot API wrapper
            ├── db.js           ← Firestore (database) helper + atomic referral logic
            └── messages.js     ← all bot text + inline keyboards
```

---

## 1) Telegram Bot বানানো

1. [@BotFather](https://t.me/BotFather)-এ গিয়ে `/newbot` দিয়ে বট বানান, **BOT_TOKEN** কপি করুন।
2. আপনার বটের username (যেমন `MyReferralBot`) কপি করুন → এটাই **BOT_USERNAME** (@ ছাড়া)।

## 2) ৩টি Private Channel প্রস্তুত করা

প্রতিটি Channel-এর জন্য:

1. Channel বানান (Private রাখুন)।
2. **আপনার Bot-কে Channel-এ Admin হিসেবে Add করুন** — এটা must, নাহলে `getChatMember` কাজ করবে না।
3. Channel-এর Numeric ID বের করুন (উদাহরণ: `-1001234567890`)। সহজ উপায়: Channel-এ একটা message forward করুন `@userinfobot`-এ, অথবা `getUpdates`/`getChat` API দিয়ে বের করুন।
4. একটি Invite Link বানান (Channel Info → Invite Links)। Channel private হওয়ায় চাইলে "Request to Join" approval-সহ Link ব্যবহার করতে পারেন — bot শুধু membership status check করে, approval process পুরোপুরি Telegram নিজে হ্যান্ডেল করে।

এই তথ্যগুলো `CHANNEL_1_ID`, `CHANNEL_1_INVITE_LINK` ইত্যাদি হিসেবে env-এ বসবে।

## 3) Firebase Firestore বানানো (Database)

1. [Firebase Console](https://console.firebase.google.com) → নতুন Project বানান।
2. Build → Firestore Database → Create database (production mode)।
3. Project Settings → Service Accounts → **Generate New Private Key** → একটি `.json` ফাইল ডাউনলোড হবে।
4. এই পুরো JSON ফাইলের content-কে **এক লাইনে** convert করে `FIREBASE_SERVICE_ACCOUNT` env variable-এ বসাবেন (নিচের command দিয়ে সহজে করতে পারেন):

   ```bash
   node -e "console.log(JSON.stringify(require('./serviceAccountKey.json')))"
   ```

   Output-টা কপি করে সরাসরি env variable-এর value হিসেবে বসিয়ে দিন। এই key কখনো frontend-এ বা git repo-তে commit করবেন না।

## 4) Netlify-তে Deploy করা

1. এই পুরো project GitHub repo-তে push করুন।
2. Netlify → **Add new site → Import an existing project** → repo select করুন।
3. Build settings এমনিতেই `netlify.toml` থেকে চলে আসবে (`npm install`, functions directory ঠিক থাকবে)।
4. Deploy করুন।

### Netlify Environment Variables (Site configuration → Environment variables)

| Key | মান |
|---|---|
| `BOT_TOKEN` | BotFather থেকে পাওয়া token |
| `BOT_USERNAME` | বটের username (@ ছাড়া) |
| `CHANNEL_1_ID` | Channel 1-এর numeric ID |
| `CHANNEL_1_INVITE_LINK` | Channel 1-এর invite link |
| `CHANNEL_2_ID` | Channel 2-এর numeric ID |
| `CHANNEL_2_INVITE_LINK` | Channel 2-এর invite link |
| `CHANNEL_3_ID` | Channel 3-এর numeric ID |
| `CHANNEL_3_INVITE_LINK` | Channel 3-এর invite link |
| `REFERRAL_TARGET` | `3` |
| `VIP_URL` | VIP unlock হলে যে লিংক/মেসেজ পাঠাবে |
| `ADMIN_ID` | আপনার নিজের Telegram numeric user ID |
| `WEBHOOK_SECRET` | নিজে বানানো একটা লম্বা random string |
| `FIREBASE_SERVICE_ACCOUNT` | ধাপ ৩-এ বানানো JSON, এক লাইনে |

সব বসানোর পর **Redeploy** করুন যাতে function-গুলো নতুন env variable নিয়ে চালু হয়।

## 5) Webhook Setup (Automatic)

Deploy হওয়ার পর নিচের URL-টা একবার browser-এ visit করুন (নিজের site URL আর WEBHOOK_SECRET বসিয়ে):

```
https://YOUR_SITE.netlify.app/.netlify/functions/verify?key=YOUR_WEBHOOK_SECRET
```

এটা automatically `setWebhook` কল করে দেবে। Status check করতে চাইলে:

```
https://YOUR_SITE.netlify.app/.netlify/functions/verify?key=YOUR_WEBHOOK_SECRET&action=info
```

---

## ✅ Complete Testing Checklist

1. [ ] Telegram-এ গিয়ে বটে `/start` পাঠান।
2. [ ] ৩টি Channel Join বাটন দেখা যাচ্ছে কিনা check করুন।
3. [ ] ৩টি Channel-এ Join করুন (private হলে approval-এর জন্য অপেক্ষা করুন)।
4. [ ] ✅ Verify চাপুন → membership confirm হচ্ছে কিনা দেখুন।
5. [ ] কোনো একটা Channel বাদ রেখে Verify করলে সঠিক Channel number missing হিসেবে দেখাচ্ছে কিনা যাচাই করুন।
6. [ ] সব Channel Join-এর পর Verify করলে Referral System (Step 2) দেখা যাচ্ছে কিনা দেখুন।
7. [ ] 🔗 Referral Link চেপে নিজের personal link ও 0/3 count দেখুন।
8. [ ] 📤 Refer Now চাপুন → Telegram-এর native Share/Forward screen খুলছে কিনা দেখুন।
9. [ ] একটা দ্বিতীয় Telegram account দিয়ে সেই Referral Link ব্যবহার করে বটে প্রথমবার `/start` করুন।
10. [ ] প্রথম User-এর 📊 My Referrals চাপলে 1/3 দেখাচ্ছে কিনা verify করুন।
11. [ ] একই দ্বিতীয় User আবার `/start` করলে count না বাড়ে সেটা যাচাই করুন (duplicate protection)।
12. [ ] আরও দুইজন নতুন User দিয়ে referral 2/3 → 3/3 করুন।
13. [ ] 3/3 হওয়ার পর 🔓 VIP Unlock বাটন দেখা যাচ্ছে কিনা দেখুন।
14. [ ] VIP Unlock চাপলে `VIP_URL` সঠিকভাবে পাঠানো হচ্ছে কিনা দেখুন।
15. [ ] নিজের নিজের Referral Link দিয়ে নিজেকে refer করা যাচ্ছে না — সেটা যাচাই করুন (self-referral block)।

---

## 🔒 Security Notes

- `BOT_TOKEN` এবং `FIREBASE_SERVICE_ACCOUNT` শুধু Netlify server-side function-এর মধ্যেই থাকে — `index.html`-এ কখনো এক্সপোজ হয় না।
- `webhook.js` প্রতিটি request-এর `X-Telegram-Bot-Api-Secret-Token` header check করে; না মিললে reject করে।
- `verify.js` admin endpoint `WEBHOOK_SECRET` ছাড়া কল করা যায় না।
- Referral counting Firestore transaction দিয়ে atomic — race condition বা duplicate count হওয়ার সুযোগ নেই।
