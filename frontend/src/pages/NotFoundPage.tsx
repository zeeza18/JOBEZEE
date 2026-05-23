import { useNavigate } from 'react-router-dom'
import LogoBrand from '../components/common/LogoBrand'

const NotFoundPage = () => {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-4 text-center">
      <LogoBrand size="md" variant="light" />
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-cyan-500">404</p>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Page not found</h1>
        <p className="text-slate-500 max-w-sm mx-auto">The page you're looking for doesn't exist. Let's get you back on track.</p>
      </div>
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-cyan-200 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-300"
      >
        Go home
      </button>
    </div>
  )
}

export default NotFoundPage
