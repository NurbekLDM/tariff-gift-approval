import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendActivationCodeEmail, generateActivationCode } from '@/lib/services/email'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    const { giftId } = await request.json()
    const { action } = await params

    if (!giftId) {
      return NextResponse.json({ success: false, error: 'Gift ID required' }, { status: 400 })
    }

    const serviceRole = createServiceRoleClient()

    // Get gift application with all related data
    const { data: giftApp } = await serviceRole
      .from('gift_applications')
      .select('*, profiles(*), tariffs(*)')
      .eq('id', giftId)
      .single()

    if (!giftApp) {
      return NextResponse.json({ success: false, error: 'Gift application not found' }, { status: 404 })
    }

    if (giftApp.status !== 'pending') {
      return NextResponse.json({ success: false, error: `Gift is already ${giftApp.status}` }, { status: 400 })
    }

    if (action === 'approve') {
      // Generate activation code
      const activationCode = generateActivationCode()
      const tariff = giftApp.tariffs as any
      const userProfile = giftApp.profiles as any

      // Update gift application
      const { error: updateError } = await serviceRole
        .from('gift_applications')
        .update({
          status: 'approved',
          activation_code: activationCode,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', giftId)

      if (updateError) {
        return NextResponse.json({ success: false, error: 'Failed to approve gift' }, { status: 500 })
      }

      // Log activation code
      await serviceRole.from('activation_log').insert({
        gift_application_id: giftId,
        activation_code: activationCode,
        sent_to_email: userProfile.email || '',
        email_status: 'pending',
      })

      // Send email with activation code (non-blocking)
      sendActivationCodeEmail(
        userProfile.email || '',
        activationCode,
        tariff.name,
        tariff.period_months
      ).catch(() => {})

      return NextResponse.json({
        success: true,
        message: 'Gift approved. Activation code sent to user email.',
      })
    } else if (action === 'reject') {
      const { error: updateError } = await serviceRole
        .from('gift_applications')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', giftId)

      if (updateError) {
        return NextResponse.json({ success: false, error: 'Failed to reject gift' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Gift application rejected.',
      })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}