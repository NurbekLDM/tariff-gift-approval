'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Tariff {
  id: string
  name: string
  description: string | null
  price: number
  period_months: number
  is_active: boolean
}

interface GiftApplication {
  id: string
  tariff_id: string
  status: string
}

interface UserTariff {
  id: string
  tariff_id: string
  end_date: string
  is_active: boolean
}

export default function Home() {
  const [tariffs, setTariffs] = useState<Tariff[]>([])
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [giftApps, setGiftApps] = useState<GiftApplication[]>([])
  const [userTariffs, setUserTariffs] = useState<UserTariff[]>([])
  const [loading, setLoading] = useState(true)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [showGiftModal, setShowGiftModal] = useState(false)
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(profile)
      }

      const { data: tariffs } = await supabase
        .from('tariffs')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true })
      setTariffs(tariffs || [])

      if (user) {
        const { data: gifts } = await supabase
          .from('gift_applications')
          .select('*')
          .eq('user_id', user.id)
        setGiftApps(gifts || [])

        const { data: uTariffs } = await supabase
          .from('user_tariffs')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
        setUserTariffs(uTariffs || [])
      }

      setLoading(false)
    }

    fetchData()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        fetchData()
      } else {
        setProfile(null)
        setGiftApps([])
        setUserTariffs([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const hasPendingGift = (tariffId: string) => {
    return giftApps.some(g => g.tariff_id === tariffId && g.status === 'pending')
  }

  const hasApprovedGift = (tariffId: string) => {
    return giftApps.some(g => g.tariff_id === tariffId && g.status === 'approved')
  }

  const hasActiveGift = () => {
    return giftApps.some(g => g.status === 'activated')
  }

  const hasRejectedGift = (tariffId: string) => {
    return giftApps.some(g => g.tariff_id === tariffId && g.status === 'rejected')
  }

  const hasActiveTariff = () => {
    return userTariffs.some(t => t.is_active && new Date(t.end_date) > new Date())
  }

  const getGiftStatus = (tariffId: string) => {
    const app = giftApps.find(g => g.tariff_id === tariffId)
    if (!app) return null
    if (app.status === 'pending') return { label: 'Applied', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' }
    if (app.status === 'approved') return { label: 'Approved - Check email', color: 'text-green-600 bg-green-50 border-green-200' }
    if (app.status === 'rejected') return { label: 'Rejected', color: 'text-red-600 bg-red-50 border-red-200' }
    if (app.status === 'activated') return { label: 'Activated', color: 'text-blue-600 bg-blue-50 border-blue-200' }
    return null
  }

  const handleApplyForGift = (tariff: Tariff) => {
    if (!user) {
      router.push('/login')
      return
    }
    setSelectedTariff(tariff)
    setShowGiftModal(true)
  }

  const confirmGiftApplication = async () => {
    if (!selectedTariff || !user) return

    setApplyingId(selectedTariff.id)
    setShowGiftModal(false)

    const res = await fetch('/api/gifts/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tariffId: selectedTariff.id }),
    })

    const data = await res.json()
    setApplyingId(null)

    if (data.success) {
      // Refresh gift applications
      const { data: gifts } = await supabase
        .from('gift_applications')
        .select('*')
        .eq('user_id', user.id)
      setGiftApps(gifts || [])
    } else {
      alert(data.error || 'Failed to apply for gift')
    }
  }

  const handleBuyTariff = async (tariff: Tariff) => {
    if (!user) {
      router.push('/login')
      return
    }

    setBuyingId(tariff.id)

    // Mock payment - simulate buying
    const res = await fetch('/api/tariffs/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tariffId: tariff.id }),
    })

    const data = await res.json()
    setBuyingId(null)

    if (data.success) {
      // Refresh user tariffs
      const { data: uTariffs } = await supabase
        .from('user_tariffs')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
      setUserTariffs(uTariffs || [])
    } else {
      alert(data.error || 'Failed to buy tariff')
    }
  }

  const canAccessSuccess = () => {
    return hasActiveTariff() || hasActiveGift()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-indigo-600">Tariff Plans</h1>
            <div className="flex items-center gap-4">
              {canAccessSuccess() && (
                <Link href="/success" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                  My Dashboard →
                </Link>
              )}
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-600">
                    {profile?.full_name || user.email}
                  </div>
                  {profile?.role === 'admin' && (
                    <Link href="/admin" className="btn-secondary text-sm !py-1.5">
                      Admin Panel
                    </Link>
                  )}
                  <button onClick={handleLogout} className="btn-secondary text-sm !py-1.5">
                    Logout
                  </button>
                </div>
              ) : (
                <Link href="/login" className="btn-primary text-sm">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Choose Your Perfect Plan</h2>
          <p className="text-indigo-100 text-lg">
            Select a tariff or apply for a gift to get started
          </p>
        </div>
      </div>

      {/* Tariff Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tariffs.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">No tariff plans available yet.</p>
            </div>
          ) : (
            tariffs.map((tariff) => {
              const giftStatus = getGiftStatus(tariff.id)
              const isPending = hasPendingGift(tariff.id)
              const isApproved = hasApprovedGift(tariff.id)
              const isRejected = hasRejectedGift(tariff.id)
              const canApplyGift = !isPending && !isApproved
              const userAlreadyHas = userTariffs.some(t => t.tariff_id === tariff.id && t.is_active)

              return (
                <div key={tariff.id} className="card flex flex-col">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{tariff.name}</h3>
                    {tariff.description && (
                      <p className="text-sm text-gray-500 mb-4">{tariff.description}</p>
                    )}
                    <div className="flex items-baseline mb-4">
                      <span className="text-3xl font-bold text-gray-900">${tariff.price}</span>
                      <span className="text-gray-500 ml-2">
                        / {tariff.period_months} month{tariff.period_months > 1 ? 's' : ''}
                      </span>
                    </div>

                    {giftStatus && (
                      <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${giftStatus.color} mb-4`}>
                        {giftStatus.label}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => handleBuyTariff(tariff)}
                      disabled={buyingId === tariff.id || userAlreadyHas}
                      className="btn-primary w-full"
                    >
                      {buyingId === tariff.id ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                          Processing...
                        </span>
                      ) : userAlreadyHas ? (
                        'Already Active'
                      ) : (
                        `Buy for $${tariff.price}`
                      )}
                    </button>

                    <button
                      onClick={() => handleApplyForGift(tariff)}
                      disabled={!canApplyGift || applyingId === tariff.id || !user}
                      className="btn-secondary w-full"
                    >
                      {applyingId === tariff.id ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full"></span>
                          Applying...
                        </span>
                      ) : isPending ? (
                        'Applied - Awaiting Approval'
                      ) : isApproved ? (
                        'Check Email for Code'
                      ) : !user ? (
                        'Sign in to Apply for Gift'
                      ) : (
                        'Apply for Gift'
                      )}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Gift Confirmation Modal */}
      {showGiftModal && selectedTariff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Apply for Gift</h3>
            <p className="text-gray-600 mb-4">
              You are applying for a <strong>{selectedTariff.name}</strong> gift worth <strong>${selectedTariff.price}</strong> for <strong>{selectedTariff.period_months} month{selectedTariff.period_months > 1 ? 's' : ''}</strong>.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              An admin will review your application and you will receive an activation code via email if approved.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowGiftModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={confirmGiftApplication} className="btn-primary">
                Confirm Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}