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

    const { activationCode } = await request.json()

    if (!activationCode) {
      return NextResponse.json({ success: false, error: 'Activation code required' }, { status: 400 })
    }

    const serviceRole = createServiceRoleClient()

    // Find the gift application with this activation code
    const { data: giftApp } = await serviceRole
      .from('gift_applications')
      .select('*, tariffs(*)')
      .eq('activation_code', activationCode)
      .eq('user_id', user.id)
      .single()

    if (!giftApp) {
      return NextResponse.json({ success: false, error: 'Invalid activation code' }, { status: 404 })
    }

    if (giftApp.status !== 'approved') {
      if (giftApp.status === 'activated') {
        return NextResponse.json({ success: false, error: 'This activation code has already been used' }, { status: 400 })
      }
      return NextResponse.json({ success: false, error: 'Gift application is not approved' }, { status: 400 })
    }

    if (giftApp.activation_code_used) {
      return NextResponse.json({ success: false, error: 'This activation code has already been used' }, { status: 400 })
    }

    // Check if user already has an activated gift
    const { data: existingActivated } = await serviceRole
      .from('gift_applications')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'activated')
      .maybeSingle()

    if (existingActivated) {
      return NextResponse.json({ success: false, error: 'You already have an activated gift' }, { status: 400 })
    }

    // Activate the gift
    const tariff = giftApp.tariffs as any
    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + tariff.period_months)

    // Update gift application
    const { error: updateError } = await serviceRole
      .from('gift_applications')
      .update({
        status: 'activated',
        activation_code_used: true,
        activated_at: new Date().toISOString(),
      })
      .eq('id', giftApp.id)

    if (updateError) {
      return NextResponse.json({ success: false, error: 'Failed to activate gift' }, { status: 500 })
    }

    // Create user tariff
    const { error: tariffError } = await serviceRole
      .from('user_tariffs')
      .insert({
        user_id: user.id,
        tariff_id: giftApp.tariff_id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_active: true,
      })

    if (tariffError) {
      return NextResponse.json({ success: false, error: 'Failed to create tariff subscription' }, { status: 500 })
    }

    // Update activation log
    await serviceRole
      .from('activation_log')
      .update({ used_at: new Date().toISOString() })
      .eq('gift_application_id', giftApp.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}