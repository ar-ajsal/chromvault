import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// POST /api/images/delete — securely delete an image from Cloudinary
// The API secret never leaves the server
export async function POST(req: NextRequest) {
  try {
    const { public_id } = await req.json()

    if (!public_id || typeof public_id !== 'string') {
      return NextResponse.json({ error: 'Missing public_id' }, { status: 400 })
    }

    // Security: only allow deleting from the launch-page folder
    if (!public_id.startsWith('launch-page/')) {
      return NextResponse.json({ error: 'Invalid public_id' }, { status: 403 })
    }

    const result = await cloudinary.uploader.destroy(public_id)

    if (result.result === 'ok') {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Delete failed', result }, { status: 400 })
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
