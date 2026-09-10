import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const FOLDER = 'launch-page'

// GET /api/images — list all images in the launch-page folder
export async function GET() {
  try {
    const result = await cloudinary.search
      .expression(`folder:${FOLDER}`)
      .sort_by('created_at', 'desc')
      .max_results(100)
      .execute()

    const images = result.resources.map((r: any) => ({
      public_id: r.public_id,
      secure_url: r.secure_url,
      width: r.width,
      height: r.height,
      format: r.format,
      created_at: r.created_at,
    }))

    return NextResponse.json({ images }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Cloudinary list error:', error)
    return NextResponse.json({ images: [] }, { status: 200 })
  }
}

// POST /api/images — return a signed upload signature for direct browser upload
export async function POST(req: NextRequest) {
  try {
    const timestamp = Math.round(Date.now() / 1000)
    const params = {
      timestamp,
      folder: FOLDER,
    }

    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET!
    )

    return NextResponse.json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder: FOLDER,
    })
  } catch (error) {
    console.error('Signature generation error:', error)
    return NextResponse.json({ error: 'Failed to generate upload signature' }, { status: 500 })
  }
}
