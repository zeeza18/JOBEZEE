import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SearchX } from 'lucide-react'
import { portfolioApi } from '../../lib/api'
import type { PublicPortfolioResponse } from '../../lib/api'
import { TEMPLATE_REGISTRY } from './templates'

// ─── Loading Spinner ───────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: '#020817' }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 rounded-full border-2 border-cyan-500 border-t-transparent mb-4"
      />
      <p className="text-slate-500 text-sm">Loading portfolio…</p>
    </div>
  )
}

// ─── Not Found Screen ─────────────────────────────────────────────────────────
function NotFoundScreen({ username }: { username: string }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{ background: '#020817' }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-md">
        <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center"
          style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
          <SearchX className="h-9 w-9 text-slate-600" />
        </div>
        <h1 className="text-3xl font-black text-white mb-3">
          Portfolio not found
        </h1>
        <p className="text-slate-500 mb-8">
          No portfolio exists for <span className="text-cyan-400 font-mono">@{username}</span>.
          The profile may be private or the link may be incorrect.
        </p>
        <Link
          to="/"
          className="inline-block px-8 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
          style={{ background: '#06b6d4', color: '#000' }}>
          Go Home →
        </Link>
      </motion.div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PortfolioPublic() {
  const { username = '' } = useParams<{ username: string }>()
  const [data,    setData]    = useState<PublicPortfolioResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    if (!username) {
      setError(true)
      setLoading(false)
      return
    }
    portfolioApi.getPublic(username)
      .then(res => { setData(res) })
      .catch(() => { setError(true) })
      .finally(() => setLoading(false))
  }, [username])

  if (loading) return <LoadingScreen />
  if (error || !data)  return <NotFoundScreen username={username} />

  const { profile, config } = data

  // Determine template
  const templateId = config?.template_id ?? 'ModernDev'
  const TemplateComponent = TEMPLATE_REGISTRY[templateId] ?? TEMPLATE_REGISTRY['ModernDev']

  const primaryColor  = config?.primary_color ?? '#06b6d4'
  const accentColor   = config?.accent_color  ?? '#a78bfa'
  const showSections  = config?.show_sections ?? {
    about      : true,
    skills     : true,
    experience : true,
    projects   : true,
    education  : true,
    contact    : true,
  }

  return (
    <TemplateComponent
      profile={profile}
      primaryColor={primaryColor}
      accentColor={accentColor}
      showSections={showSections}
    />
  )
}
