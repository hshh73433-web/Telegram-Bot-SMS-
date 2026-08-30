const { CHANNELS, BOT_USERNAME, REFERRAL_TARGET } = require('./config');

function step1Text(missing) {
  let text =
    `📢 <b>Required Channels</b>\n\n` +
    `বট ব্যবহার করার আগে নিচের সবগুলো Channel-এ Join করুন।\n\n` +
    `⚠️ Join করার পরে Channel Admin-এর approval প্রয়োজন হলে approval হওয়া পর্যন্ত অপেক্ষা করুন।\n\n` +
    `সবগুলো Channel-এ Join হওয়ার পরে ✅ Verify চাপুন।`;

  if (missing && missing.length) {
    const lines = missing.map((i) => `❌ Channel ${i}-এ এখনো Join করা হয়নি।`).join('\n');
    text += `\n\n❌ <b>আপনার সবগুলো Required Channel-এ Join করা হয়নি।</b>\n\n${lines}`;
  }

  return text;
}

function step1Keyboard(retry) {
  const rows = CHANNELS.map((c, i) => [{ text: `📢 Join Channel ${i + 1}`, url: c.link }]);
  rows.push([{ text: retry ? '🔄 Verify' : '✅ Verify', callback_data: 'verify_channels' }]);
  return { inline_keyboard: rows };
}

function step2Text() {
  return (
    `✅ <b>Verified!</b>\n\n` +
    `সব Required Channel-এর membership পাওয়া গেছে।\n\n` +
    `👥 এখন ${REFERRAL_TARGET} জন নতুন User Refer করুন।\n\n` +
    `নিচের Referral Link আপনার বন্ধুদের পাঠান।\n\n` +
    `${REFERRAL_TARGET} জন নতুন User আপনার Referral Link ব্যবহার করে Bot-এ প্রথমবার Start করলে Referral সম্পূর্ণ হবে।`
  );
}

function buildReferralLink(userId) {
  return `https://t.me/${BOT_USERNAME}?start=${userId}`;
}

function step2Keyboard(userId, referralCount) {
  const referralLink = buildReferralLink(userId);
  const shareText =
    `🎁 এই Bot-এ Join করুন এবং প্রয়োজনীয় কাজ সম্পূর্ণ করুন।\n\nReferral Link:\n${referralLink}`;
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`;

  const rows = [
    [{ text: '🔗 Referral Link', callback_data: 'referral_link' }],
    [{ text: '📤 Refer Now', url: shareUrl }],
    [{ text: '📊 My Referrals', callback_data: 'my_referrals' }],
  ];

  if (referralCount >= REFERRAL_TARGET) {
    rows.push([{ text: `🔓 VIP Unlock — ${REFERRAL_TARGET}`, callback_data: 'vip_unlock' }]);
  }

  return { inline_keyboard: rows };
}

module.exports = {
  step1Text,
  step1Keyboard,
  step2Text,
  step2Keyboard,
  buildReferralLink,
};
