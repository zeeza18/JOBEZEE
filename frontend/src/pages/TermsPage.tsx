import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
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
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-400">Effective date: March 21, 2026 · Last updated: March 21, 2026</p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-slate-600">

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using JOBEZEE ("the Service"), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use the Service. JOBEZEE reserves the right
              to update these terms at any time. Continued use of the Service after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">2. Description of Service</h2>
            <p>
              JOBEZEE is an AI-powered job search and application automation platform. The Service includes
              job discovery, resume tailoring, LinkedIn auto-apply automation, application tracking, and
              portfolio generation tools. Features are subject to change without notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">3. User Accounts</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You must provide accurate and complete information when creating an account.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>You must be at least 16 years old to use the Service.</li>
              <li>One person may not maintain more than one active account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">4. LinkedIn Auto-Apply Bot</h2>
            <p className="mb-3">
              JOBEZEE's LinkedIn bot automates job applications on your behalf using credentials you provide.
              By enabling this feature, you acknowledge and agree to the following:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>You are providing your own LinkedIn credentials voluntarily and at your own risk.</li>
              <li>Automated activity on LinkedIn may violate LinkedIn's own Terms of Service. You accept full responsibility for any consequences, including account restriction or suspension by LinkedIn.</li>
              <li>JOBEZEE is not affiliated with LinkedIn Corporation.</li>
              <li>You are responsible for reviewing all applications submitted on your behalf.</li>
              <li>We do not guarantee the accuracy, completeness, or success rate of automated applications.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">5. AI-Generated Content</h2>
            <p>
              JOBEZEE uses AI models (OpenAI, Anthropic) to generate resume content, cover letters, and
              application answers. You acknowledge that:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>AI-generated content may contain errors or inaccuracies. Review all output before submitting to employers.</li>
              <li>You are solely responsible for the accuracy of information submitted in job applications.</li>
              <li>Submitting false information to employers is your responsibility, not JOBEZEE's.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">6. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Use the Service for any unlawful purpose or in violation of any regulations.</li>
              <li>Attempt to reverse engineer, scrape, or exploit the platform's APIs beyond intended use.</li>
              <li>Share your account credentials with others.</li>
              <li>Use the Service to apply to jobs with false or misleading information.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">7. Intellectual Property</h2>
            <p>
              JOBEZEE's platform code, design, and branding are the intellectual property of JOBEZEE.
              The source code is available on GitHub under the project's open-source license.
              You retain ownership of your resume content, profile data, and any materials you upload.
              By using the Service, you grant JOBEZEE a limited license to process your data for the
              purpose of providing the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">8. Disclaimers</h2>
            <p>
              The Service is provided "as is" without warranties of any kind. JOBEZEE does not guarantee
              that use of the Service will result in job offers, interviews, or any employment outcome.
              We are not responsible for the actions of employers, recruiters, or third-party platforms
              (including LinkedIn) in response to applications submitted through JOBEZEE.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, JOBEZEE shall not be liable for any indirect,
              incidental, special, or consequential damages arising out of or related to your use of the
              Service, including but not limited to loss of employment opportunities, LinkedIn account
              suspension, or data loss.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">10. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time for violation of these
              terms or for any other reason at our discretion. You may delete your account at any time
              through the Settings page.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">11. Governing Law</h2>
            <p>
              These Terms shall be governed by the laws of the United States. Any disputes arising from
              these Terms or the Service shall be resolved through good-faith negotiation or, if necessary,
              binding arbitration.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">12. Contact</h2>
            <p>
              For questions about these Terms, please open an issue at{' '}
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
            <button onClick={() => navigate('/privacy')} className="hover:text-slate-700 transition">Privacy</button>
            <a href="https://github.com/zeeza18/JOBEZEE" target="_blank" rel="noopener noreferrer" className="hover:text-slate-700 transition">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
