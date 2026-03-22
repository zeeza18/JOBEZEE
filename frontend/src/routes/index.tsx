import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import LandingPage from '../pages/LandingPage'
import AuthPage from '../pages/AuthPage'
import OnboardingPage from '../pages/OnboardingPage'
import DashboardPage from '../pages/DashboardPage'
import CombinedJobsPage from '../features/jobs/PulledJobsPage'
import TailorPage from '../features/tailor/TailorPage'
import AutoApplyPage from '../features/apply/AutoApplyPage'
import InterviewPage from '../features/interview/InterviewPage'
import ApplicationsPage from '../features/applications/ApplicationsPage'
import PortfolioPage   from '../features/portfolio/PortfolioPage'
import PortfolioPublic from '../features/portfolio/PortfolioPublic'
import ConnectorsPage from '../features/connectors/ConnectorsPage'
import ProfilePage from '../features/profile/ProfilePage'
import SettingsPage from '../pages/SettingsPage'
import NotFoundPage from '../pages/NotFoundPage'
import PrivacyPage from '../pages/PrivacyPage'
import TermsPage from '../pages/TermsPage'
import ResetPasswordPage from '../pages/ResetPasswordPage'
import { useAuthStore } from '../store/useAuthStore'

/** Blocks /app/* routes while the session is being verified, then redirects to /auth if unauthenticated. */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuthStore()

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020817]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/"           element={<LandingPage />} />
      <Route path="/auth"       element={<AuthPage />} />
      <Route path="/onboarding" element={<AuthGuard><OnboardingPage /></AuthGuard>} />

      <Route element={<AuthGuard><AppShell /></AuthGuard>}>
        <Route path="/app"                element={<DashboardPage />} />
        <Route path="/app/search"         element={<CombinedJobsPage />} />
        <Route path="/app/pulled-jobs"    element={<CombinedJobsPage />} />
        <Route path="/app/tailor"         element={<TailorPage />} />
        <Route path="/app/apply"          element={<AutoApplyPage />} />
        <Route path="/app/interview"      element={<InterviewPage />} />
        <Route path="/app/portfolio"      element={<PortfolioPage />} />
        <Route path="/app/connectors"     element={<ConnectorsPage />} />
        <Route path="/app/applications"   element={<ApplicationsPage />} />
        <Route path="/app/profile"        element={<ProfilePage />} />
        <Route path="/app/settings"       element={<SettingsPage />} />
      </Route>

      <Route path="/portfolio/:username" element={<PortfolioPublic />} />

      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms"   element={<TermsPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default AppRoutes
