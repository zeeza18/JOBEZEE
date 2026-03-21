import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <img src="/logo.jpg" alt="JOBEZEE" className="h-7 w-7 rounded-md object-cover" />
          <span className="font-black text-slate-900 tracking-tight">JOBEZEE</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-400">Effective date: March 21, 2026 · Last updated: March 21, 2026</p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-slate-600">

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">1. Introduction</h2>
            <p>
              JOBEZEE ("we", "us", or "our") is an AI-powered job search and application automation platform.
              This Privacy Policy explains how we collect, use, and protect your personal information when you
              use our website and services. By using JOBEZEE, you agree to the practices described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account information:</strong> Name, email address, and password when you register.</li>
              <li><strong>Profile data:</strong> Desired job titles, salary range, location preferences, visa status, experience level, and work preferences you enter in your profile.</li>
              <li><strong>Resume data:</strong> PDF resumes you upload for tailoring and auto-apply features.</li>
              <li><strong>Credentials (optional):</strong> LinkedIn email and password if you choose to enable the LinkedIn Auto-Apply bot. These are stored encrypted and used solely to operate the bot on your behalf.</li>
              <li><strong>API keys (optional):</strong> OpenAI or Anthropic API keys you provide for AI-powered features. Stored encrypted and never shared.</li>
              <li><strong>Usage data:</strong> Pages visited, actions taken, and job applications tracked within the platform.</li>
              <li><strong>Log data:</strong> IP address, browser type, and device information for security and debugging purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To operate the JOBEZEE platform and provide the services you request.</li>
              <li>To personalize job search results and resume tailoring based on your profile.</li>
              <li>To run the LinkedIn bot on your behalf using the credentials you provide.</li>
              <li>To send transactional emails (account verification, password reset).</li>
              <li>To improve our AI models and platform features using anonymized, aggregated usage data.</li>
              <li>To comply with legal obligations and enforce our Terms of Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">4. Data Storage and Security</h2>
            <p>
              Your data is stored in a secured PostgreSQL database (Neon). Sensitive fields such as LinkedIn
              credentials and API keys are encrypted at rest. We use JWT-based authentication with
              short-lived tokens. Resume files are stored in an isolated uploads directory, not publicly accessible.
              We apply industry-standard security practices, but no system is completely immune to risk.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">5. Third-Party Services</h2>
            <p>JOBEZEE integrates with the following third-party services:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>OpenAI / Anthropic:</strong> Your resume content and job descriptions may be sent to these APIs to power AI tailoring and Q&A features. Their own privacy policies apply.</li>
              <li><strong>LinkedIn:</strong> When you enable the bot, we automate actions on LinkedIn using your credentials. We are not affiliated with LinkedIn.</li>
              <li><strong>Neon PostgreSQL:</strong> Our database provider. Data is hosted in a SOC 2 compliant environment.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">6. Data Sharing</h2>
            <p>
              We do not sell, rent, or share your personal information with third parties for marketing purposes.
              We may disclose information if required by law or to protect the rights and safety of JOBEZEE and its users.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">7. Your Rights</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You may request access to or deletion of your personal data at any time.</li>
              <li>You may update your profile information at any time through the Settings page.</li>
              <li>You may delete your account, which will permanently remove all associated data.</li>
              <li>You may revoke LinkedIn credentials and API keys at any time via Settings.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">8. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. If you delete your account,
              we will remove your personal data within 30 days, except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">9. Children's Privacy</h2>
            <p>
              JOBEZEE is not intended for users under the age of 16. We do not knowingly collect personal
              information from children. If you believe a child has provided us with personal data, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes
              via email or a prominent notice on the platform. Continued use of JOBEZEE after changes
              constitutes your acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">11. Contact Us</h2>
            <p>
              For privacy-related inquiries, please open an issue at{' '}
              <a
                href="https://github.com/zeeza18/JOBEZEE/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-600 underline hover:text-cyan-700"
              >
                github.com/zeeza18/JOBEZEE
              </a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-100 bg-slate-50 px-6 py-8 mt-12">
        <div className="mx-auto flex max-w-4xl items-center justify-between text-sm text-slate-400">
          <span>© 2026 JOBEZEE</span>
          <div className="flex gap-6">
            <button onClick={() => navigate('/terms')} className="hover:text-slate-700 transition">Terms</button>
            <a href="https://github.com/zeeza18/JOBEZEE" target="_blank" rel="noopener noreferrer" className="hover:text-slate-700 transition">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
