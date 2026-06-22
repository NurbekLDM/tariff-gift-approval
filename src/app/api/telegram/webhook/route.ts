import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendActivationCodeEmail, generateActivationCode } from '@/lib/services/email'
import { handleTelegramCallback, setAdminChatId } from '@/lib/services/telegram'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Handle callback queries (button clicks)
    if (body.callback_query) {
      const { data, from, message } = body.callback_query
      
      if (data) {
        const result = await handleTelegramCallback(
          data,
          message.chat.id,
          message.message_id
        )

        const [action, giftId] = data.split(':')

        if (action === 'approve' || action === 'reject') {
          // Process the action via server logic
          const serviceRole = createServiceRoleClient()
          const { data: giftApp } = await serviceRole
            .from('gift_applications')
            .select('*, profiles(*), tariffs(*)')
            .eq('id', giftId)
            .single()

          if (giftApp && giftApp.status === 'pending') {
            if (action === 'approve') {
              const activationCode = generateActivationCode()
              const tariff = giftApp.tariffs as any
              const userProfile = giftApp.profiles as any

              await serviceRole
                .from('gift_applications')
                .update({
                  status: 'approved',
                  activation_code: activationCode,
                  reviewed_at: new Date().toISOString(),
                })
                .eq('id', giftId)

              await serviceRole.from('activation_log').insert({
                gift_application_id: giftId,
                activation_code: activationCode,
                sent_to_email: userProfile.email || '',
                email_status: 'pending',
              })

              sendActivationCodeEmail(
                userProfile.email || '',
                activationCode,
                tariff.name,
                tariff.period_months
              ).catch(() => {})

              // Answer callback
              await fetch(
                `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    callback_query_id: body.callback_query.id,
                    text: '✅ Gift approved! Activation code sent.',
                  }),
                }
              )

              // Update message text
              await fetch(
                `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/editMessageText`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: message.chat.id,
                    message_id: message.message_id,
                    text: `✅ *Gift Approved*\n\nUser: ${userProfile?.full_name || 'Unknown'}\nTariff: ${tariff.name}\nCode sent to: ${userProfile?.email || 'N/A'}`,
                    parse_mode: 'Markdown',
                  }),
                }
              )
            } else if (action === 'reject') {
              await serviceRole
                .from('gift_applications')
                .update({
                  status: 'rejected',
                  reviewed_at: new Date().toISOString(),
                })
                .eq('id', giftId)

              await fetch(
                `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    callback_query_id: body.callback_query.id,
                    text: '❌ Gift rejected.',
                  }),
                }
              )

              await fetch(
                `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/editMessageText`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: message.chat.id,
                    message_id: message.message_id,
                    text: `❌ *Gift Rejected*`,
                    parse_mode: 'Markdown',
                  }),
                }
              )
            }
          }
        }
      }

      return NextResponse.json({ ok: true })
    }

    // Handle /start command
    if (body.message?.text === '/start') {
      const chatId = body.message.chat.id
      const userId = body.message.from?.id

      // Save admin chat ID
      await setAdminChatId(String(chatId))

      await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `👋 *Welcome!*\n\nYou have been registered as the Tariff Gift Approval admin.\nYou will receive notifications when users apply for gifts.\n\nUse the buttons to Approve ✅ or Reject ❌ gift applications directly.`,
            parse_mode: 'Markdown',
          }),
        }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ ok: true }) // Always return 200 to Telegram
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: 'Telegram webhook endpoint' })
}