const { CHANNELS, REFERRAL_TARGET, WEBHOOK_SECRET, VIP_URL } = require('./lib/config');
const tg = require('./lib/telegram');
const dbLib = require('./lib/db');
const msg = require('./lib/messages');

// Checks real membership in all 3 required channels via Telegram's getChatMember.
// No placeholder / fake verification — this is a live API call per channel.
async function checkAllChannels(userId) {
  const results = await Promise.all(
    CHANNELS.map((c) => tg.getChatMember(c.id, userId))
  );

  const missing = [];
  results.forEach((r, i) => {
    const status = r.ok ? r.result.status : 'left';
    const isMember = ['member', 'administrator', 'creator'].includes(status);
    if (!isMember) missing.push(i + 1);
  });

  return { allJoined: missing.length === 0, missing };
}

async function sendCurrentStep(chatId, userId) {
  const user = await dbLib.getUser(userId);
  if (user && user.is_verified) {
    await tg.sendMessage(chatId, msg.step2Text(), msg.step2Keyboard(userId, user.referral_count));
  } else {
    await tg.sendMessage(chatId, msg.step1Text(), msg.step1Keyboard(false));
  }
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = message.text || '';

  if (!text.startsWith('/start')) {
    await sendCurrentStep(chatId, userId);
    return;
  }

  const parts = text.trim().split(/\s+/);
  const payload = parts[1];
  const referrerId = payload && /^\d+$/.test(payload) ? payload : null;

  const { isNew } = await dbLib.createUserIfNotExists(userId, {
    first_name: message.from.first_name,
    username: message.from.username,
    referrer_id: referrerId,
  });

  // IMPORTANT: referral is NOT counted at /start. The referred user must
  // complete all 3 required-channel checks first.
  // The pending referrer_id is stored on the new user's record.

  await sendCurrentStep(chatId, userId);
}

async function handleCallback(cq) {
  const userId = cq.from.id;
  const chatId = cq.message.chat.id;
  const messageId = cq.message.message_id;
  const data = cq.data;

  if (data === 'verify_channels') {
    const { allJoined, missing } = await checkAllChannels(userId);

    if (allJoined) {
      await dbLib.setVerified(userId);

      // If this user came through another user's referral link, only NOW
      // count the referral because the user has completed channel verification.
      let user = await dbLib.getUser(userId);
      if (user && user.referrer_id) {
        await dbLib.registerReferral(user.referrer_id, userId);
        user = await dbLib.getUser(userId);
      }

      await tg.answerCallbackQuery(cq.id, '✅ Verified!');
      await tg.editMessageText(
        chatId,
        messageId,
        msg.step2Text(),
        msg.step2Keyboard(userId, user.referral_count)
      );
    } else {
      await tg.answerCallbackQuery(cq.id, '❌ সব Channel Join করা হয়নি', true);
      await tg.editMessageText(chatId, messageId, msg.step1Text(missing), msg.step1Keyboard(true));
    }
    return;
  }

  const user = await dbLib.getUser(userId);
  if (!user || !user.is_verified) {
    await tg.answerCallbackQuery(cq.id, 'প্রথমে সবগুলো Channel Verify করুন।', true);
    return;
  }

  if (data === 'referral_link') {
    await tg.answerCallbackQuery(cq.id);
    await tg.sendMessage(
      chatId,
      `🔗 <b>আপনার Referral Link:</b>\n\n${msg.buildReferralLink(userId)}\n\n` +
        `👥 Successful Referrals: ${user.referral_count}/${REFERRAL_TARGET}`
    );
    return;
  }

  if (data === 'my_referrals') {
    await tg.answerCallbackQuery(cq.id);
    if (user.referral_count >= REFERRAL_TARGET) {
      await tg.sendMessage(
        chatId,
        `🎉 <b>Referral Completed!</b>\n\n` +
          `Successful Referrals: ${user.referral_count}/${REFERRAL_TARGET}\n\n` +
          `আপনি এখন VIP Unlock করতে পারবেন।`
      );
    } else {
      const remaining = REFERRAL_TARGET - user.referral_count;
      await tg.sendMessage(
        chatId,
        `📊 <b>Referral Status</b>\n\n` +
          `Successful Referrals: ${user.referral_count}/${REFERRAL_TARGET}\n\n` +
          `আর মাত্র ${remaining} জন নতুন User Refer করুন।`
      );
    }
    return;
  }

  if (data === 'vip_unlock') {
    if (user.referral_count < REFERRAL_TARGET) {
      await tg.answerCallbackQuery(cq.id, `আরও ${REFERRAL_TARGET - user.referral_count} জন Refer করুন।`, true);
      return;
    }
    await dbLib.setVipUnlocked(userId);
    await tg.answerCallbackQuery(cq.id, '🔓 VIP Unlocked!');
    await tg.sendMessage(chatId, `🔓 <b>VIP Unlocked!</b>\n\n${VIP_URL}`);
    return;
  }

  await tg.answerCallbackQuery(cq.id);
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 200, body: 'OK' };
    }

    // Reject anything not coming from Telegram (secret_token set via setWebhook in verify.js)
    if (WEBHOOK_SECRET) {
      const incoming = event.headers['x-telegram-bot-api-secret-token'];
      if (incoming !== WEBHOOK_SECRET) {
        return { statusCode: 401, body: 'Unauthorized' };
      }
    }

    const update = JSON.parse(event.body || '{}');

    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallback(update.callback_query);
    }

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('Webhook error:', err);
    // Always return 200 so Telegram doesn't hammer retries on a transient error.
    return { statusCode: 200, body: 'OK' };
  }
};
