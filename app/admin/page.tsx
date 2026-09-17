'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface CloudinaryImage {
  public_id: string
  secure_url: string
  width: number
  height: number
  format: string
  created_at: string
}

const MAX_FILE_SIZE_MB = 10
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export default function AdminPage() {
  const router = useRouter()
  const [images, setImages] = useState<CloudinaryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchImages()
  }, [])

  async function fetchImages() {
    try {
      setLoading(true)
      const res = await fetch('/api/images', { cache: 'no-store' })
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      setImages(data.images || [])
    } catch {
      setError('Failed to load images')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!e.target.files) return
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return

    setError('')
    setSuccessMsg('')

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPG, JPEG, PNG, and WEBP files are allowed.')
      return
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File size must be under ${MAX_FILE_SIZE_MB}MB.`)
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Step 1: Get a signed upload signature from our server
      const sigRes = await fetch('/api/images', { method: 'POST' })
      if (!sigRes.ok) throw new Error('Failed to get upload signature')
      const { signature, timestamp, cloudName, apiKey, folder } = await sigRes.json()

      // Step 2: Upload directly to Cloudinary (no secret exposed)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('api_key', apiKey)
      formData.append('timestamp', timestamp.toString())
      formData.append('signature', signature)
      formData.append('folder', folder)

      // Use XHR for upload progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`)

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100))
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error('Upload failed'))
          }
        }

        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.send(formData)
      })

      setSuccessMsg('Image uploaded successfully!')
      setUploadProgress(100)
      setTimeout(() => setUploadProgress(0), 1000)
      await fetchImages()
    } catch (err) {
      setError('Upload failed. Please try again.')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(publicId: string) {
    if (!confirm('Delete this image? It will be removed from the launch page immediately.')) {
      return
    }

    setError('')
    setSuccessMsg('')
    setDeletingId(publicId)

    try {
      const res = await fetch('/api/images/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_id: publicId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Delete failed')
      }

      setSuccessMsg('Image deleted.')
      setImages(prev => prev.filter(img => img.public_id !== publicId))
    } catch (err: any) {
      setError(err.message || 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
    }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
        background: 'var(--surface)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}>
            ◈
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '600' }}>Image Manager</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Launch Page · Cloudinary</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a
            href="/"
            target="_blank"
            style={{
              fontSize: '13px',
              color: 'var(--muted)',
              textDecoration: 'none',
              padding: '6px 12px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.color = 'var(--text)'
              ;(e.target as HTMLElement).style.borderColor = 'var(--accent)'
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.color = 'var(--muted)'
              ;(e.target as HTMLElement).style.borderColor = 'var(--border)'
            }}
          >
            View Site ↗
          </a>
          <button
            onClick={handleLogout}
            style={{
              fontSize: '13px',
              color: 'var(--muted)',
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '6px 12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.color = 'var(--danger)'
              ;(e.target as HTMLButtonElement).style.borderColor = 'var(--danger)'
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.color = 'var(--muted)'
              ;(e.target as HTMLButtonElement).style.borderColor = 'var(--border)'
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <main style={{ padding: '40px 32px', maxWidth: '1100px', margin: '0 auto' }}>
        {/* Title + Upload Section */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
              Scrolling Images
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
              {loading ? 'Loading...' : `${images.length} image${images.length !== 1 ? 's' : ''} uploaded`}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <button
              id="upload-image-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                padding: '12px 24px',
                background: uploading
                  ? 'var(--border)'
                  : 'linear-gradient(135deg, var(--accent), var(--accent2))',
                border: 'none',
                borderRadius: 'var(--radius)',
                color: uploading ? 'var(--muted)' : '#1a1a1a',
                fontSize: '14px',
                fontWeight: '600',
                cursor: uploading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '16px' }}>↑</span>
              {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Image'}
            </button>

            {uploading && (
              <div style={{
                width: '200px',
                height: '4px',
                background: 'var(--border)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${uploadProgress}%`,
                  background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
                  transition: 'width 0.3s ease',
                  borderRadius: '2px',
                }} />
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handleUpload}
              style={{ display: 'none' }}
              id="file-input"
            />

            <p style={{ fontSize: '11px', color: 'var(--muted)' }}>
              JPG, PNG, WEBP · max {MAX_FILE_SIZE_MB}MB
            </p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(231, 76, 60, 0.1)',
            border: '1px solid rgba(231, 76, 60, 0.3)',
            borderRadius: 'var(--radius)',
            color: '#e74c3c',
            fontSize: '13px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>⚠ {error}</span>
            <button
              onClick={() => setError('')}
              style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '16px' }}
            >×</button>
          </div>
        )}

        {successMsg && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(39, 174, 96, 0.1)',
            border: '1px solid rgba(39, 174, 96, 0.3)',
            borderRadius: 'var(--radius)',
            color: '#27ae60',
            fontSize: '13px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>✓ {successMsg}</span>
            <button
              onClick={() => setSuccessMsg('')}
              style={{ background: 'none', border: 'none', color: '#27ae60', cursor: 'pointer', fontSize: '16px' }}
            >×</button>
          </div>
        )}

        {/* Image Grid */}
        {loading ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '16px',
          }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                aspectRatio: '3/4',
                background: 'var(--surface)',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 24px',
            border: '2px dashed var(--border)',
            borderRadius: '12px',
            color: 'var(--muted)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🖼</div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
              No images yet
            </h3>
            <p style={{ fontSize: '14px' }}>
              Upload images to populate the scrolling section on the launch page.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                marginTop: '24px',
                padding: '10px 20px',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Upload First Image
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '16px',
          }}>
            {images.map(img => (
              <div
                key={img.public_id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  position: 'relative',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(232, 196, 158, 0.1)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                }}
              >
                {/* Thumbnail */}
                <div style={{ aspectRatio: '3/4', position: 'relative', overflow: 'hidden', background: '#0d0d0d' }}>
                  <img
                    src={img.secure_url.replace('/upload/', '/upload/w_400,h_533,c_fill,q_auto/')}
                    alt="Uploaded image"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      opacity: deletingId === img.public_id ? 0.3 : 1,
                      transition: 'opacity 0.2s',
                    }}
                    loading="lazy"
                  />
                </div>

                {/* Info + Delete */}
                <div style={{ padding: '10px 12px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                    {img.format} · {img.width}×{img.height}
                  </p>
                  <button
                    id={`delete-${img.public_id.replace(/[^a-zA-Z0-9]/g, '-')}`}
                    onClick={() => handleDelete(img.public_id)}
                    disabled={deletingId === img.public_id}
                    style={{
                      width: '100%',
                      padding: '7px',
                      background: 'transparent',
                      border: `1px solid ${deletingId === img.public_id ? 'var(--border)' : 'var(--danger)'}`,
                      borderRadius: '6px',
                      color: deletingId === img.public_id ? 'var(--muted)' : 'var(--danger)',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: deletingId === img.public_id ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      if (deletingId !== img.public_id) {
                        (e.target as HTMLButtonElement).style.background = 'var(--danger)'
                        ;(e.target as HTMLButtonElement).style.color = '#fff'
                      }
                    }}
                    onMouseLeave={e => {
                      if (deletingId !== img.public_id) {
                        (e.target as HTMLButtonElement).style.background = 'transparent'
                        ;(e.target as HTMLButtonElement).style.color = 'var(--danger)'
                      }
                    }}
                  >
                    {deletingId === img.public_id ? 'Deleting...' : '✕ Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
