import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { NextResponse } from 'next/server'

export async function GET() {
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

    const serviceRole = createServiceRoleClient()
    const { data: tariffs } = await serviceRole
      .from('tariffs')
      .select('*')
      .order('created_at', { ascending: false })

    return NextResponse.json({ success: true, tariffs })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

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

    const body = await request.json()
    const serviceRole = createServiceRoleClient()

    const { data: tariff, error } = await serviceRole
      .from('tariffs')
      .insert({
        name: body.name,
        description: body.description || null,
        price: body.price,
        period_months: body.period_months,
        is_active: body.is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to create tariff' }, { status: 500 })
    }

    return NextResponse.json({ success: true, tariff })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
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

    const body = await request.json()
    const serviceRole = createServiceRoleClient()

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.price !== undefined) updateData.price = body.price
    if (body.period_months !== undefined) updateData.period_months = body.period_months
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    const { data: tariff, error } = await serviceRole
      .from('tariffs')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to update tariff' }, { status: 500 })
    }

    return NextResponse.json({ success: true, tariff })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
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

    const { id } = await request.json()
    const serviceRole = createServiceRoleClient()

    const { error } = await serviceRole
      .from('tariffs')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to delete tariff' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}