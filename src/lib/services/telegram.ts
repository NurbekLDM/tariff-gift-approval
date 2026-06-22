import { createServiceRoleClient } from '../supabase/service-role';

interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
}

interface BotConfig {
  botToken: string;
  adminChatId: string | null;
}

async function getBotConfig(): Promise<BotConfig | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('telegram_config')
    .select('*')
    .limit(1)
    .single();

  if (error || !data) return null;
  return { botToken: data.bot_token, adminChatId: data.admin_chat_id };
}

export async function setBotToken(token: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('telegram_config').upsert(
    { bot_token: token, is_configured: true },
    { onConflict: 'id' }
  );
  return !error;
}

export async function setAdminChatId(chatId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase
    .from('telegram_config')
    .select('id')
    .limit(1)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('telegram_config')
      .update({ admin_chat_id: chatId, is_configured: true })
      .eq('id', existing.id);
    return !error;
  }
  return false;
}

export async function sendGiftApplicationNotification(
  giftApplicationId: string,
  userName: string,
  userEmail: string,
  tariffName: string,
  tariffPrice: number,
  periodMonths: number
): Promise<{ success: boolean; error?: string }> {
  const config = await getBotConfig();
  if (!config || !config.adminChatId) {
    return { success: false, error: 'Telegram bot not configured' };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const message = `
🎁 *New Gift Application*
━━━━━━━━━━━━━━━
👤 *User:* ${userName}
📧 *Email:* ${userEmail}
📦 *Tariff:* ${tariffName}
💰 *Price:* $${tariffPrice}
📅 *Period:* ${periodMonths} month${periodMonths > 1 ? 's' : ''}
🆔 *App ID:* ${giftApplicationId.slice(0, 8)}...
━━━━━━━━━━━━━━━
*Actions:*
✅ Approve: ${appUrl}/api/telegram/approve?gift_id=${giftApplicationId}
❌ Reject: ${appUrl}/api/telegram/reject?gift_id=${giftApplicationId}
  `.trim();

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${config.botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.adminChatId,
          text: message,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '✅ Approve',
                  callback_data: `approve:${giftApplicationId}`,
                },
                {
                  text: '❌ Reject',
                  callback_data: `reject:${giftApplicationId}`,
                },
              ],
            ],
          },
        }),
      }
    );

    const result = await response.json();
    
    const supabase = createServiceRoleClient();
    
    if (result.ok) {
      await supabase.from('telegram_notifications').insert({
        gift_application_id: giftApplicationId,
        chat_id: config.adminChatId,
        message_id: String(result.result.message_id),
        message,
        status: 'sent',
      });
      return { success: true };
    } else {
      await supabase.from('telegram_notifications').insert({
        gift_application_id: giftApplicationId,
        chat_id: config.adminChatId,
        message,
        status: 'failed',
        error_message: result.description,
      });
      return { success: false, error: result.description };
    }
  } catch (error: any) {
    const supabase = createServiceRoleClient();
    await supabase.from('telegram_notifications').insert({
      gift_application_id: giftApplicationId,
      chat_id: config.adminChatId,
      message,
      status: 'failed',
      error_message: error.message,
    });
    return { success: false, error: error.message };
  }
}

export async function handleTelegramCallback(
  callbackData: string,
  chatId: number,
  messageId: number
): Promise<{ success: boolean; action: string }> {
  const [action, giftId] = callbackData.split(':');
  
  const config = await getBotConfig();
  if (!config) {
    return { success: false, action };
  }

  // Update message to remove buttons
  await fetch(
    `https://api.telegram.org/bot${config.botToken}/editMessageReplyMarkup`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [] },
      }),
    }
  );

  // Log the action
  const supabase = createServiceRoleClient();
  await supabase.from('telegram_notifications').insert({
    gift_application_id: giftId,
    chat_id: String(chatId),
    message_id: String(messageId),
    message: `Action: ${action} on gift ${giftId}`,
    status: action === 'approve' ? 'approved' : 'rejected',
  });

  return { success: true, action };
}

export async function verifyBotToken(token: string): Promise<{ ok: boolean; bot?: TelegramUser }> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/getMe`
    );
    const data = await response.json();
    if (data.ok) {
      return { ok: true, bot: data.result };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}