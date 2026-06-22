'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ActivatePage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null })
  const router = useRouter()
  const supabase = createClient()

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ text: '', type: null })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const res = await fetch('/api/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activationCode: code.trim().toUpperCase() }),
    })

    const data = await res.json()
    setLoading(false)

    if (data.success) {
      setMessage({ text: 'Gift activated successfully! Redirecting...', type: 'success' })
      setTimeout(() => router.push('/success'), 2000)
    } else {
      setMessage({ text: data.error || 'Failed to activate gift', type: 'error' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-indigo-600">
            Tariff Plans
          </Link>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Activate Your Gift</h2>
          <p className="mt-2 text-sm text-gray-500">
            Enter the activation code you received via email
          </p>
        </div>

        <div className="card">
          {message.text && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-600'
                  : 'bg-red-50 border border-red-200 text-red-600'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activation Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="input-field text-center text-lg tracking-widest font-mono"
                placeholder="XXXX-XXXX"
                required
                maxLength={9}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the 8-character code (e.g., ABCD-1234)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || code.length < 8}
              className="btn-primary w-full"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  Activating...
                </span>
              ) : (
                'Activate Gift'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              ← Back to Tariffs
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
export const dynamic = 'force-dynamic'
