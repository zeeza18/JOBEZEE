import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'

// ─── Each page is its own JS chunk — only downloaded when first visited ────────
const LandingPage       = lazy(() => import('../pages/LandingPage'))
const AuthPage          = lazy(() => import('../pages/AuthPage'))
const OnboardingPage    = lazy(() => import('../pages/OnboardingPage'))
const AppShell          = lazy(() => import('../components/layout/AppShell'))
const DashboardPage     = lazy(() => import('../pages/DashboardPage'))
const CombinedJobsPage  = lazy(() => import('../features/jobs/PulledJobsPage'))
const TailorPage        = lazy(() => import('../features/tailor/TailorPage'))
const AutoApplyPage     = lazy(() => import('../features/apply/AutoApplyPage'))
const LinkedInPage      = lazy(() => import('../features/linkedin/LinkedInPage'))
const ProfileBoostPage = lazy(() => import('../features/linkedin/ProfileBoostPage'))
const InterviewPage     = lazy(() => import('../features/interview/InterviewPage'))
const ApplicationsPage  = lazy(() => import('../features/applications/ApplicationsPage'))
const PortfolioPage     = lazy(() => import('../features/portfolio/PortfolioPage'))
const PortfolioPublic   = lazy(() => import('../features/portfolio/PortfolioPublic'))
const ConnectorsPage    = lazy(() => import('../features/connectors/ConnectorsPage'))
const ProfilePage       = lazy(() => import('../features/profile/ProfilePage'))
const SettingsPage      = lazy(() => import('../pages/SettingsPage'))
const BillingPage       = lazy(() => import('../pages/BillingPage'))
const NotFoundPage      = lazy(() => import('../pages/NotFoundPage'))
const PrivacyPage       = lazy(() => import('../pages/PrivacyPage'))
const TermsPage         = lazy(() => import('../pages/TermsPage'))
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'))

// ─── Shared loading spinner (used by Suspense and AuthGuard) ──────────────────
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#020817]">
    <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
  </div>
)

/** Blocks /app/* routes while the session is being verified, then redirects to /auth if unauthenticated. */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuthStore()

  if (initializing) return <PageLoader />
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

/** Redirects already-logged-in users away from public pages (/, /auth) straight to /dashboard. */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuthStore()

  if (initializing) return <PageLoader />
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/"           element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>} />
      <Route path="/auth"       element={<PublicOnlyRoute><AuthPage /></PublicOnlyRoute>} />
      <Route path="/onboarding" element={<AuthGuard><OnboardingPage /></AuthGuard>} />

      <Route element={<AuthGuard><AppShell /></AuthGuard>}>
        <Route path="/dashboard"          element={<DashboardPage />} />
        <Route path="/app"                element={<Navigate to="/dashboard" replace />} />
        <Route path="/jobs"               element={<CombinedJobsPage />} />
        <Route path="/app/search"         element={<Navigate to="/jobs" replace />} />
        <Route path="/app/pulled-jobs"    element={<Navigate to="/jobs" replace />} />
        <Route path="/app/tailor"         element={<TailorPage />} />
        <Route path="/app/apply"          element={<AutoApplyPage />} />
        <Route path="/app/linkedin">
          <Route index              element={<LinkedInPage />} />
          <Route path="boost"        element={<ProfileBoostPage />} />
          <Route path="contacts"     element={<LinkedInPage />} />
        </Route>
        <Route path="/app/interview"      element={<InterviewPage />} />
        <Route path="/app/portfolio"      element={<PortfolioPage />} />
        <Route path="/app/connectors"     element={<ConnectorsPage />} />
        <Route path="/app/applications"   element={<ApplicationsPage />} />
        <Route path="/app/profile"        element={<ProfilePage />} />
        <Route path="/app/settings"       element={<SettingsPage />} />
        <Route path="/app/billing"        element={<BillingPage />} />
      </Route>

      <Route path="/portfolio/:username" element={<PortfolioPublic />} />
      <Route path="/reset-password"      element={<ResetPasswordPage />} />
      <Route path="/privacy"             element={<PrivacyPage />} />
      <Route path="/terms"               element={<TermsPage />} />
      <Route path="*"                    element={<NotFoundPage />} />
    </Routes>
  </Suspense>
)

export default AppRoutes
