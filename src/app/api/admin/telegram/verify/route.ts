import { createClient } from '@/lib/supabase/server'
import { verifyBotToken } from '@/lib/services/telegram'
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

    const result = await verifyBotToken(botToken)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message })
  }
}