'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminTelegram() {
  const [botToken, setBotToken] = useState('')
  const [savedToken, setSavedToken] = useState('')
  const [isConfigured, setIsConfigured] = useState(false)
  const [adminChatId, setAdminChatId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ ok: boolean; bot?: any } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchConfig = async () => {
      const { data: config } = await supabase
        .from('telegram_config')
        .select('*')
        .limit(1)
        .single()

      if (config) {
        setSavedToken(config.bot_token)
        setBotToken(config.bot_token)
        setIsConfigured(config.is_configured)
        setAdminChatId(config.admin_chat_id)
      }

      const { data: notifs } = await supabase
        .from('telegram_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (notifs) setNotifications(notifs)

      setLoading(false)
    }

    fetchConfig()
  }, [])

  const handleSaveToken = async () => {
    setSaving(true)
    const res = await fetch('/api/admin/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken }),
    })
    const data = await res.json()
    setSaving(false)

    if (data.success) {
      setSavedToken(botToken)
      setIsConfigured(true)
      alert('Bot token saved!')
    } else {
      alert(data.error || 'Failed to save token')
    }
  }

  const handleVerify = async () => {
    setVerifying(true)
    setVerifyResult(null)

    const res = await fetch('/api/admin/telegram/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken }),
    })
    const data = await res.json()
    setVerifying(false)
    setVerifyResult(data)
  }

  const handleSetWebhook = async () => {
    const appUrl = window.location.origin
    const webhookUrl = `${appUrl}/api/telegram/webhook`

    const res = await fetch(`https://api.telegram.org/bot${savedToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    })
    const data = await res.json()

    if (data.ok) {
      alert('Webhook set successfully! Bot is ready.')
    } else {
      alert('Failed to set webhook: ' + data.description)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      sent: 'bg-blue-50 text-blue-700',
      delivered: 'bg-green-50 text-green-700',
      failed: 'bg-red-50 text-red-700',
      approved: 'bg-green-50 text-green-700',
      rejected: 'bg-red-50 text-red-700',
    }
    return colors[status] || 'bg-gray-50 text-gray-700'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Telegram Bot Configuration</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Bot Configuration */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Bot Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bot Token</label>
              <input
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="input-field"
                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get from @BotFather on Telegram
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={handleSaveToken} disabled={saving || !botToken} className="btn-primary">
                {saving ? 'Saving...' : 'Save Token'}
              </button>
              <button onClick={handleVerify} disabled={verifying || !botToken} className="btn-secondary">
                {verifying ? 'Verifying...' : 'Verify Token'}
              </button>
            </div>

            {verifyResult && (
              <div className={`p-3 rounded-lg text-sm ${verifyResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {verifyResult.ok ? (
                  <p>✓ Bot verified: @{verifyResult.bot?.username} ({verifyResult.bot?.first_name})</p>
                ) : (
                  <p>✗ Invalid bot token. Please check and try again.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Status</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">Bot configured: {isConfigured ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${adminChatId ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-sm">Admin chat: {adminChatId ? 'Connected' : 'Not connected'}</span>
            </div>

            {isConfigured && !adminChatId && (
              <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700">
                <p className="font-medium mb-1">📱 Connect Telegram</p>
                <p>1. Open Telegram and search for your bot</p>
                <p>2. Send <code className="bg-yellow-100 px-1 rounded">/start</code> to the bot</p>
                <p>3. The admin chat will be automatically registered</p>
              </div>
            )}

            {isConfigured && adminChatId && (
              <div className="flex gap-2 mt-3">
                <button onClick={handleSetWebhook} className="btn-success text-sm">
                  Set Webhook
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification History */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Notification History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Date</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Message</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {notifications.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-gray-500">
                    No notifications yet.
                  </td>
                </tr>
              ) : (
                notifications.map((notif) => (
                  <tr key={notif.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-600 whitespace-nowrap">
                      {new Date(notif.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-gray-700 max-w-md truncate">
                      {notif.message}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(notif.status)}`}>
                        {notif.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-red-600 max-w-xs truncate">
                      {notif.error_message || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
export const dynamic = 'force-dynamic'
