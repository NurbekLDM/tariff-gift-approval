'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SuccessPage() {
  const [user, setUser] = useState<any>(null)
  const [userTariffs, setUserTariffs] = useState<any[]>([])
  const [giftApps, setGiftApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      const { data: tariffs } = await supabase
        .from('user_tariffs')
        .select('*, tariffs(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setUserTariffs(tariffs || [])

      const { data: gifts } = await supabase
        .from('gift_applications')
        .select('*, tariffs(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setGiftApps(gifts || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  const hasActiveTariff = () => {
    return userTariffs.some(t => t.is_active && new Date(t.end_date) > new Date())
  }

  const hasActiveGift = () => {
    return giftApps.some(g => g.status === 'activated')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!hasActiveTariff() && !hasActiveGift()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="card text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Active Subscription</h1>
          <p className="text-gray-500 mb-6">
            You don't have an active tariff or gift subscription.
          </p>
          <Link href="/" className="btn-primary">
            View Tariffs
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-lg font-bold text-indigo-600">
              Tariff Plans
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/activate" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                Activate Gift
              </Link>
              <Link href="/" className="btn-secondary text-sm !py-1.5">
                Browse Tariffs
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-8 text-white mb-8">
          <h1 className="text-3xl font-bold mb-2">Subscription Active! 🎉</h1>
          <p className="text-green-100">
            You have access to premium features
          </p>
        </div>

        {/* Active Tariffs */}
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Purchases</h2>
        <div className="space-y-3 mb-8">
          {userTariffs.filter(t => t.is_active && new Date(t.end_date) > new Date()).length === 0 ? (
            <div className="card">
              <p className="text-gray-500">No active purchased tariffs.</p>
            </div>
          ) : (
            userTariffs
              .filter(t => t.is_active && new Date(t.end_date) > new Date())
              .map((ut) => (
                <div key={ut.id} className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{ut.tariffs?.name}</h3>
                      <div className="text-sm text-gray-500 mt-1">
                        Active until: {new Date(ut.end_date).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
                      Active
                    </span>
                  </div>
                </div>
              ))
          )}
        </div>

        {/* Gift Applications */}
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Gift Applications</h2>
        <div className="space-y-3">
          {giftApps.length === 0 ? (
            <div className="card">
              <p className="text-gray-500">No gift applications.</p>
            </div>
          ) : (
            giftApps.map((gift) => {
              const statusColors: Record<string, string> = {
                pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                approved: 'bg-green-50 text-green-700 border-green-200',
                rejected: 'bg-red-50 text-red-700 border-red-200',
                activated: 'bg-blue-50 text-blue-700 border-blue-200',
              }
              return (
                <div key={gift.id} className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{gift.tariffs?.name}</h3>
                      <div className="text-sm text-gray-500 mt-1">
                        Status: {gift.status} | Applied: {new Date(gift.applied_at).toLocaleDateString()}
                      </div>
                      {gift.activation_code && gift.status !== 'activated' && (
                        <p className="text-sm text-indigo-600 mt-1">
                          Activation code: {gift.activation_code}
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[gift.status] || ''}`}>
                      {gift.status.charAt(0).toUpperCase() + gift.status.slice(1)}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
export const dynamic = 'force-dynamic'
