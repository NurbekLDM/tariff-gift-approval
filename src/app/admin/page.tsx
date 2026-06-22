'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalTariffs: 0,
    activeGifts: 0,
    pendingGifts: 0,
    totalGifts: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { count: totalTariffs } = await supabase
        .from('tariffs')
        .select('*', { count: 'exact', head: true })

      const { count: activeGifts } = await supabase
        .from('gift_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'activated')

      const { count: pendingGifts } = await supabase
        .from('gift_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      const { count: totalGifts } = await supabase
        .from('gift_applications')
        .select('*', { count: 'exact', head: true })

      setStats({
        totalTariffs: totalTariffs || 0,
        activeGifts: activeGifts || 0,
        pendingGifts: pendingGifts || 0,
        totalGifts: totalGifts || 0,
      })
      setLoading(false)
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  const cards = [
    { label: 'Total Tariffs', value: stats.totalTariffs, color: 'bg-blue-500', href: '/admin/tariffs' },
    { label: 'Pending Gifts', value: stats.pendingGifts, color: 'bg-yellow-500', href: '/admin/gifts' },
    { label: 'Active Gifts', value: stats.activeGifts, color: 'bg-green-500', href: '/admin/gifts' },
    { label: 'Total Applications', value: stats.totalGifts, color: 'bg-purple-500', href: '/admin/gifts' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${card.color}`} />
              <div>
                <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                <div className="text-sm text-gray-500">{card.label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/admin/tariffs" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-2xl">📦</span>
              <div>
                <div className="font-medium text-gray-900">Create Tariff</div>
                <div className="text-sm text-gray-500">Add new tariff plans</div>
              </div>
            </Link>
            <Link href="/admin/gifts" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-2xl">🎁</span>
              <div>
                <div className="font-medium text-gray-900">Review Gifts</div>
                <div className="text-sm text-gray-500">Approve or reject gift applications</div>
              </div>
            </Link>
            <Link href="/admin/telegram" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-2xl">🤖</span>
              <div>
                <div className="font-medium text-gray-900">Telegram Bot</div>
                <div className="text-sm text-gray-500">Configure bot and view notifications</div>
              </div>
            </Link>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Pending Gifts</h2>
          {stats.pendingGifts === 0 ? (
            <p className="text-gray-500 text-sm">No pending gift applications.</p>
          ) : (
            <p className="text-gray-700">
              You have <strong>{stats.pendingGifts}</strong> pending gift application{stats.pendingGifts !== 1 ? 's' : ''} to review.
            </p>
          )}
          {stats.pendingGifts > 0 && (
            <Link href="/admin/gifts" className="btn-primary mt-4 inline-block text-sm">
              Review Now
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
export const dynamic = 'force-dynamic'
