import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin — Vantro',
  robots: 'noindex, nofollow',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <title>Admin — Vantro</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          :root {
            --bg: #0a0a0a;
            --surface: #141414;
            --surface2: #1e1e1e;
            --border: #2a2a2a;
            --text: #f0f0f0;
            --muted: #888;
            --accent: #e8c49e;
            --accent2: #d4956a;
            --danger: #e74c3c;
            --danger-hover: #c0392b;
            --success: #27ae60;
            --radius: 8px;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            -webkit-font-smoothing: antialiased;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
