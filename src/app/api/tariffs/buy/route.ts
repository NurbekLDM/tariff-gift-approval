import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { tariffId } = await request.json()

    if (!tariffId) {
      return NextResponse.json({ success: false, error: 'Tariff ID required' }, { status: 400 })
    }

    const serviceRole = createServiceRoleClient()

    // Check if tariff exists and is active
    const { data: tariff } = await serviceRole
      .from('tariffs')
      .select('*')
      .eq('id', tariffId)
      .eq('is_active', true)
      .single()

    if (!tariff) {
      return NextResponse.json({ success: false, error: 'Tariff not found or inactive' }, { status: 404 })
    }

    // Check if user already has this tariff active
    const { data: existing } = await serviceRole
      .from('user_tariffs')
      .select('id')
      .eq('user_id', user.id)
      .eq('tariff_id', tariffId)
      .eq('is_active', true)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ success: false, error: 'Tariff already active for this user' }, { status: 400 })
    }

    // Mock payment - just create the user tariff
    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + tariff.period_months)

    const { data: userTariff, error } = await serviceRole
      .from('user_tariffs')
      .insert({
        user_id: user.id,
        tariff_id: tariffId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_active: true,
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to create tariff subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true, userTariff })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}