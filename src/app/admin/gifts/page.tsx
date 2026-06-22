'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface GiftApplication {
  id: string
  user_id: string
  tariff_id: string
  status: string
  activation_code: string | null
  activation_code_used: boolean
  applied_at: string
  reviewed_at: string | null
  activated_at: string | null
  created_at: string
  profiles: {
    full_name: string
    email: string
  } | null
  tariffs: {
    name: string
    price: number
    period_months: number
  } | null
}

export default function AdminGifts() {
  const [gifts, setGifts] = useState<GiftApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const supabase = createClient()

  const fetchGifts = async () => {
    const res = await fetch('/api/admin/gifts')
    const data = await res.json()
    if (data.success) {
      setGifts(data.gifts)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchGifts()
  }, [])

  const handleAction = async (giftId: string, action: 'approve' | 'reject') => {
    setProcessingIds(prev => new Set(prev).add(giftId))

    const res = await fetch(`/api/admin/gifts/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ giftId }),
    })

    const data = await res.json()
    setProcessingIds(prev => {
      const next = new Set(prev)
      next.delete(giftId)
      return next
    })

    if (data.success) {
      fetchGifts()
    } else {
      alert(data.error || `Failed to ${action} gift`)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      approved: 'bg-green-50 text-green-700 border-green-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
      activated: 'bg-blue-50 text-blue-700 border-blue-200',
    }
    return styles[status] || 'bg-gray-50 text-gray-700 border-gray-200'
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gift Applications</h1>

      <div className="space-y-3">
        {gifts.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-500">No gift applications yet.</p>
          </div>
        ) : (
          gifts.map((gift) => (
            <div key={gift.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {gift.profiles?.full_name || 'Unknown User'}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(gift.status)}`}>
                      {gift.status.charAt(0).toUpperCase() + gift.status.slice(1)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>Email: {gift.profiles?.email || 'N/A'}</p>
                    <p>Tariff: {gift.tariffs?.name || 'Unknown'} - ${gift.tariffs?.price} / {gift.tariffs?.period_months}mo</p>
                    <p>Applied: {new Date(gift.applied_at).toLocaleString()}</p>
                    {gift.reviewed_at && <p>Reviewed: {new Date(gift.reviewed_at).toLocaleString()}</p>}
                    {gift.activated_at && <p>Activated: {new Date(gift.activated_at).toLocaleString()}</p>}
                    {gift.activation_code && (
                      <p className="font-mono text-indigo-600">
                        Code: {gift.activation_code} {gift.activation_code_used ? '(Used)' : '(Not used)'}
                      </p>
                    )}
                  </div>
                </div>
                {gift.status === 'pending' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleAction(gift.id, 'approve')}
                      disabled={processingIds.has(gift.id)}
                      className="btn-success text-sm !py-1.5 !px-3"
                    >
                      {processingIds.has(gift.id) ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleAction(gift.id, 'reject')}
                      disabled={processingIds.has(gift.id)}
                      className="btn-danger text-sm !py-1.5 !px-3"
                    >
                      {processingIds.has(gift.id) ? '...' : 'Reject'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
export const dynamic = 'force-dynamic'
