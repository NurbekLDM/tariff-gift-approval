'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Tariff {
  id: string
  name: string
  description: string | null
  price: number
  period_months: number
  is_active: boolean
  created_at: string
}

export default function AdminTariffs() {
  const [tariffs, setTariffs] = useState<Tariff[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Tariff | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    period_months: '1',
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const fetchTariffs = async () => {
    const res = await fetch('/api/admin/tariffs')
    const data = await res.json()
    if (data.success) {
      setTariffs(data.tariffs)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTariffs()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const res = await fetch('/api/admin/tariffs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        period_months: parseInt(form.period_months),
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (data.success) {
      setShowForm(false)
      setForm({ name: '', description: '', price: '', period_months: '1' })
      fetchTariffs()
    } else {
      alert(data.error || 'Failed to create tariff')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setSaving(true)

    const res = await fetch('/api/admin/tariffs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editing.id,
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        period_months: parseInt(form.period_months),
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (data.success) {
      setEditing(null)
      setShowForm(false)
      setForm({ name: '', description: '', price: '', period_months: '1' })
      fetchTariffs()
    } else {
      alert(data.error || 'Failed to update tariff')
    }
  }

  const handleToggleActive = async (tariff: Tariff) => {
    const res = await fetch('/api/admin/tariffs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: tariff.id,
        is_active: !tariff.is_active,
      }),
    })

    const data = await res.json()
    if (data.success) {
      fetchTariffs()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tariff?')) return

    const res = await fetch('/api/admin/tariffs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    const data = await res.json()
    if (data.success) {
      fetchTariffs()
    }
  }

  const startEdit = (tariff: Tariff) => {
    setEditing(tariff)
    setForm({
      name: tariff.name,
      description: tariff.description || '',
      price: String(tariff.price),
      period_months: String(tariff.period_months),
    })
    setShowForm(true)
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tariffs Management</h1>
        <button
          onClick={() => {
            setEditing(null)
            setForm({ name: '', description: '', price: '', period_months: '1' })
            setShowForm(!showForm)
          }}
          className="btn-primary"
        >
          {showForm ? 'Cancel' : '+ Create Tariff'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editing ? 'Edit Tariff' : 'Create New Tariff'}
          </h2>
          <form onSubmit={editing ? handleUpdate : handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
                required
                placeholder="Premium Plan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field"
                rows={3}
                placeholder="Describe the tariff plan..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="input-field"
                  required
                  placeholder="29.99"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period (months)</label>
                <select
                  value={form.period_months}
                  onChange={(e) => setForm({ ...form, period_months: e.target.value })}
                  className="select-field"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m} month{m > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : editing ? 'Update Tariff' : 'Create Tariff'}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {tariffs.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-500">No tariffs created yet.</p>
          </div>
        ) : (
          tariffs.map((tariff) => (
            <div key={tariff.id} className="card flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900">{tariff.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      tariff.is_active
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {tariff.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {tariff.description && (
                  <p className="text-sm text-gray-500 mt-1">{tariff.description}</p>
                )}
                <div className="flex gap-4 mt-2 text-sm text-gray-500">
                  <span>${tariff.price}</span>
                  <span>{tariff.period_months} month{tariff.period_months > 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleToggleActive(tariff)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                    tariff.is_active
                      ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {tariff.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => startEdit(tariff)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(tariff.id)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
export const dynamic = 'force-dynamic'
