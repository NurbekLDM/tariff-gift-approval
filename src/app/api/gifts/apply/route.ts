import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendGiftApplicationNotification } from '@/lib/services/telegram'
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

    // Check for existing pending gift application
    const { data: existingPending } = await serviceRole
      .from('gift_applications')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingPending) {
      return NextResponse.json({ success: false, error: 'You already have a pending gift application' }, { status: 400 })
    }

    // Check for existing approved gift (not yet activated)
    const { data: existingApproved } = await serviceRole
      .from('gift_applications')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .maybeSingle()

    if (existingApproved) {
      return NextResponse.json({ success: false, error: 'You already have an approved gift. Check your email for the activation code.' }, { status: 400 })
    }

    // Check for already activated gift
    const { data: existingActivated } = await serviceRole
      .from('gift_applications')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'activated')
      .maybeSingle()

    if (existingActivated) {
      return NextResponse.json({ success: false, error: 'You already have an activated gift' }, { status: 400 })
    }

    // Create gift application
    const { data: giftApp, error: insertError } = await serviceRole
      .from('gift_applications')
      .insert({
        user_id: user.id,
        tariff_id: tariffId,
        status: 'pending',
      })
      .select('*')
      .single()

    if (insertError) {
      return NextResponse.json({ success: false, error: 'Failed to create gift application' }, { status: 500 })
    }

    // Get user profile for notification
    const { data: profile } = await serviceRole
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Send Telegram notification (non-blocking)
    sendGiftApplicationNotification(
      giftApp.id,
      profile?.full_name || 'User',
      profile?.email || user.email || 'No email',
      tariff.name,
      Number(tariff.price),
      tariff.period_months
    ).catch(() => {})

    return NextResponse.json({ success: true, giftApp })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}