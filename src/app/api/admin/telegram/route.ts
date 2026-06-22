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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    const { botToken } = await request.json()
    if (!botToken) {
      return NextResponse.json({ success: false, error: 'Bot token required' }, { status: 400 })
    }

    const serviceRole = createServiceRoleClient()
    const { error } = await serviceRole.from('telegram_config').upsert(
      {
        bot_token: botToken,
        is_configured: true,
      },
      { onConflict: 'id' }
    )

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to save token' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}