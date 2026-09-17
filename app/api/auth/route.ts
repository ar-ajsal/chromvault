import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

function generateToken(password: string): string {
  return crypto
    .createHmac('sha256', process.env.ADMIN_PASSWORD || 'fallback')
    .update(password)
    .digest('hex')
}

// POST /api/auth — validate admin password and set secure cookie
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    const expectedPassword = process.env.ADMIN_PASSWORD
    if (!expectedPassword) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const passwordBuf = Buffer.from(password)
    const expectedBuf = Buffer.from(expectedPassword)

    if (passwordBuf.length !== expectedBuf.length) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const isValid = crypto.timingSafeEqual(passwordBuf, expectedBuf)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const token = generateToken(password)
    
    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/auth/logout — clear the admin cookie
export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('admin_token')
  return response
}
