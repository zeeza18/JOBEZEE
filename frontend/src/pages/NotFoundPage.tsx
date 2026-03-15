import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'

const NotFoundPage = () => {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 text-center">
      <h1 className="text-3xl font-semibold text-slate-900">Page not found</h1>
      <p className="text-slate-600">The page you’re looking for does not exist. Let’s get you home.</p>
      <Button onClick={() => navigate('/')}>Go home</Button>
    </div>
  )
}

export default NotFoundPage
