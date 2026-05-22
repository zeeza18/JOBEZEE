import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import LogoBrand from '../components/common/LogoBrand'

const SECTIONS = [
  'Who We Are',
  'Information We Collect',
  'How We Use Your Information',
  'AI Processing and Third-Party APIs',
  'Voice and Audio Data',
  'Job Board Data',
  'Data Storage and Security',
  'Data Sharing',
  'Cookies and Analytics',
  'Data Retention',
  'International Data Transfers',
  'Your Rights',
  'California Residents (CCPA)',
  'Children\'s Privacy',
  'Changes to This Policy',
  'Contact Us',
]

function Section({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <section id={`s${num}`} className="scroll-mt-24">
      <h2 className="text-base font-bold text-slate-900 mb-3">
        {num}. {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState(1)

  useEffect(() => {
    const sections = SECTIONS
      .map((_, index) => document.getElementById(`s${index + 1}`))
      .filter((section): section is HTMLElement => Boolean(section))

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]

        if (!visible?.target.id) return

        const next = Number(visible.target.id.replace('s', ''))
        if (Number.isFinite(next)) setActiveSection(next)
      },
      {
        rootMargin: '-18% 0px -62% 0px',
        threshold: 0,
      }
    )

    sections.forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <LogoBrand size="sm" variant="light" />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-16 lg:flex lg:gap-16">

        {/* Table of contents */}
        <aside className="hidden lg:block shrink-0 w-56 self-start sticky top-28">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Contents</p>
          <nav className="space-y-1">
            {SECTIONS.map((s, i) => (
              <a
                key={i}
                href={`#s${i + 1}`}
                onClick={() => setActiveSection(i + 1)}
                className={`block rounded-md border-l-2 px-2 py-1 text-xs transition ${
                  activeSection === i + 1
                    ? 'border-cyan-500 bg-cyan-50 font-semibold text-cyan-700'
                    : 'border-transparent text-slate-500 hover:border-cyan-200 hover:bg-slate-50 hover:text-cyan-600'
                }`}
              >
                {i + 1}. {s}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="mb-2 inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-cyan-600">
            Legal
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-400">
            Effective date: May 22, 2026 &nbsp;·&nbsp; Last updated: May 22, 2026
          </p>

          <div className="mt-10 space-y-10">

            <Section num={1} title="Who We Are">
              <p>
                JobEzee ("JobEzee", "we", "us", or "our") is an AI-powered job search and application
                automation platform operated as an independent software project. This Privacy Policy
                explains what personal data we collect, why we collect it, how we use it, and what
                rights you have in relation to it.
              </p>
              <p>
                By creating an account or using any part of the JobEzee service, you acknowledge that
                you have read and understood this Privacy Policy and consent to the data practices
                described herein.
              </p>
            </Section>

            <Section num={2} title="Information We Collect">
              <p><strong>Account data</strong></p>
              <p>Name, email address, and hashed password when you register.</p>

              <p><strong>Profile data</strong></p>
              <p>
                Desired job titles, salary expectations, location preferences, preferred countries,
                visa/work authorisation status, years of experience, and remote-work preference you
                enter in your profile. This data drives job search and resume tailoring.
              </p>

              <p><strong>Resume and document data</strong></p>
              <p>
                PDF resumes you upload. These are stored securely and used to power AI resume
                tailoring and auto-fill features. We extract text content to pass to AI APIs.
              </p>

              <p><strong>Voice and audio data</strong></p>
              <p>
                When you use the AI Interview Coach feature in voice mode, microphone audio is
                captured in your browser session. Audio is processed locally or transmitted to
                speech-to-text services for transcription. We do not permanently store raw audio
                recordings unless you explicitly save a session.
              </p>

              <p><strong>Third-party credentials (optional)</strong></p>
              <p>
                If you enable LinkedIn automation, you may provide your LinkedIn email and password.
                These are stored encrypted at rest and used solely to operate the automation bot
                on your behalf. You may revoke access at any time via Settings.
              </p>

              <p><strong>API keys (optional)</strong></p>
              <p>
                OpenAI or Anthropic API keys you choose to provide. These are encrypted at rest,
                never logged in plain text, and never shared.
              </p>

              <p><strong>Usage and log data</strong></p>
              <p>
                Pages visited, features used, job searches performed, applications tracked, and
                time-stamped activity logs. IP address, browser type, and device information
                collected for security, fraud prevention, and debugging.
              </p>
            </Section>

            <Section num={3} title="How We Use Your Information">
              <ul className="list-disc pl-5 space-y-1.5">
                <li>To create and manage your account and authenticate your identity.</li>
                <li>To run job searches across job boards based on your profile preferences.</li>
                <li>To tailor your resume and generate cover letters using AI.</li>
                <li>To power the AI Interview Coach with context about your target role.</li>
                <li>To operate the LinkedIn automation bot using credentials you provide.</li>
                <li>To track and display your job application history.</li>
                <li>To send transactional emails (account verification, password reset, interview reminders).</li>
                <li>To detect and prevent fraud, abuse, and security threats.</li>
                <li>To improve platform features using aggregated, anonymised usage data.</li>
                <li>To comply with our legal obligations.</li>
              </ul>
              <p>
                We do not use your personal data for advertising, and we do not build advertising
                profiles based on your activity.
              </p>
            </Section>

            <Section num={4} title="AI Processing and Third-Party APIs">
              <p>
                JobEzee uses large language model APIs to power resume tailoring, cover letter
                generation, interview question generation, and other AI features. When you use
                these features, relevant portions of your data, including resume text, job
                descriptions, and profile information, are transmitted to the following providers:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>
                  <strong>Anthropic (Claude API)</strong> for resume tailoring and content generation.
                  Anthropic's privacy policy and API usage policies apply to data processed through
                  their services.
                </li>
                <li>
                  <strong>OpenAI (GPT API)</strong> for interview question generation and status
                  detection features. OpenAI's privacy policy applies.
                </li>
              </ul>
              <p>
                We transmit only the minimum data necessary for each operation. We do not send
                your full database profile to these APIs unless required by the specific feature.
              </p>
            </Section>

            <Section num={5} title="Voice and Audio Data">
              <p>
                The AI Interview Coach feature supports voice mode. When you start a practice
                session in voice mode:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>Your browser requests microphone permission, which you must explicitly grant.</li>
                <li>
                  Audio is processed for speech-to-text transcription. Transcripts may be sent to
                  AI APIs for evaluation and feedback.
                </li>
                <li>Raw audio is not permanently stored on our servers after transcription unless
                  you explicitly save a session recording.</li>
                <li>You can revoke microphone permission in your browser settings at any time.</li>
              </ul>
              <p>
                If you are in a jurisdiction where voice recording requires explicit consent
                (including Illinois BIPA, California CIPA, or equivalent laws), by enabling voice
                mode you are providing that consent. Do not use voice mode if you are recording
                others or in a jurisdiction where this is not permitted.
              </p>
            </Section>

            <Section num={6} title="Job Board Data">
              <p>
                JobEzee discovers job listings by querying public job board platforms including
                Indeed, LinkedIn, Glassdoor, ZipRecruiter, and Workday employer portals. We do not
                store or redistribute large caches of scraped job listings. Job results displayed
                to you are retrieved on-demand and presented for your personal job search use only.
              </p>
              <p>
                Your use of job listings retrieved by JobEzee is subject to the terms of the
                originating job board. JobEzee is not affiliated with, endorsed by, or in
                partnership with any of these platforms.
              </p>
            </Section>

            <Section num={7} title="Data Storage and Security">
              <p>
                Your data is stored in a secured PostgreSQL database hosted on a private server
                infrastructure (Hetzner Cloud, Germany). We apply the following technical
                safeguards:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>Passwords are hashed using a one-way cryptographic algorithm.</li>
                <li>Sensitive fields (API keys, third-party credentials) are encrypted at rest.</li>
                <li>Authentication uses short-lived JWT tokens. Refresh tokens are rotated.</li>
                <li>Resume files are stored in a server directory not publicly accessible via URL.</li>
                <li>All connections between client and server use TLS/HTTPS.</li>
                <li>Access to production systems is restricted to authorised personnel.</li>
              </ul>
              <p>
                No system is completely immune to security risk. In the event of a breach affecting
                your personal data, we will notify you as required by applicable law.
              </p>
            </Section>

            <Section num={8} title="Data Sharing">
              <p>
                We do not sell, rent, trade, or share your personal data with third parties for
                their marketing or advertising purposes.
              </p>
              <p>We may share your data only in the following circumstances:</p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>
                  <strong>AI API providers</strong> (Anthropic, OpenAI) as described in Section 4,
                  solely to operate AI features you use.
                </li>
                <li>
                  <strong>Email delivery</strong> via Resend (transactional emails only).
                </li>
                <li>
                  <strong>Legal compliance</strong> when required by a court order, subpoena, or
                  applicable law, or to protect the rights, property, or safety of JobEzee or its users.
                </li>
                <li>
                  <strong>Business transfer</strong> in the event of a merger, acquisition, or sale of
                  assets, in which case users will be notified before personal data is transferred.
                </li>
              </ul>
            </Section>

            <Section num={9} title="Cookies and Analytics">
              <p>
                JobEzee uses session cookies and localStorage to maintain your login state and
                store user preferences. We do not currently use third-party analytics services
                (such as Google Analytics) or advertising cookies.
              </p>
              <p>
                If we introduce analytics tools in the future, we will update this policy and,
                where required by law, obtain your consent before doing so.
              </p>
            </Section>

            <Section num={10} title="Data Retention">
              <p>
                We retain your personal data for as long as your account is active. If you delete
                your account through Settings, we will permanently delete your profile data, resume
                files, and application history within 30 days, except where retention is required
                by applicable law (for example, records required for tax or fraud prevention purposes).
              </p>
              <p>
                Aggregated, anonymised usage statistics that cannot be linked back to you may be
                retained indefinitely.
              </p>
            </Section>

            <Section num={11} title="International Data Transfers">
              <p>
                JobEzee's server infrastructure is located in Germany (EU). If you access the
                service from outside the EU, your data may be transferred to and processed in
                Germany. By using the service, you consent to this transfer.
              </p>
              <p>
                Data sent to AI API providers (Anthropic, OpenAI) may be processed in the
                United States. Both providers participate in standard contractual frameworks for
                international data transfers.
              </p>
            </Section>

            <Section num={12} title="Your Rights">
              <p>
                Depending on your location, you may have the following rights regarding your
                personal data:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
                <li><strong>Rectification:</strong> Correct inaccurate or incomplete data via your Settings page.</li>
                <li><strong>Erasure:</strong> Request deletion of your account and personal data.</li>
                <li><strong>Portability:</strong> Request your data in a structured, machine-readable format.</li>
                <li><strong>Restriction:</strong> Request that we limit how we process your data in certain circumstances.</li>
                <li><strong>Objection:</strong> Object to processing of your data for specific purposes.</li>
                <li><strong>Withdraw consent:</strong> Revoke consent for optional features (e.g., LinkedIn credentials, voice mode) at any time.</li>
              </ul>
              <p>
                To exercise any of these rights, contact us at the address in Section 16. We will
                respond within 30 days. If you are in the EU/EEA and believe we have not handled
                your data correctly, you have the right to lodge a complaint with your local data
                protection authority.
              </p>
            </Section>

            <Section num={13} title="California Residents (CCPA)">
              <p>
                If you are a California resident, you have the following additional rights under
                the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA):
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>The right to know what personal information we collect and how it is used.</li>
                <li>The right to delete personal information we have collected from you.</li>
                <li>The right to opt out of the sale of personal information. We do not sell personal information.</li>
                <li>The right to non-discrimination for exercising your CCPA rights.</li>
                <li>The right to correct inaccurate personal information.</li>
                <li>The right to limit the use of sensitive personal information.</li>
              </ul>
              <p>
                To exercise these rights, contact us at the address in Section 16. We will not
                discriminate against you for exercising any of your CCPA rights.
              </p>
            </Section>

            <Section num={14} title="Children's Privacy">
              <p>
                JobEzee is not directed to individuals under the age of 16. We do not knowingly
                collect personal information from children under 16. If you are a parent or guardian
                and believe your child has provided us with personal data, please contact us
                immediately and we will delete it.
              </p>
            </Section>

            <Section num={15} title="Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. When we make material changes,
                we will update the "Last updated" date at the top of this page and notify you via
                email or a prominent notice within the platform. Continued use of JobEzee after the
                effective date of an updated policy constitutes your acceptance of the changes.
              </p>
            </Section>

            <Section num={16} title="Contact Us">
              <p>
                For privacy-related inquiries, data access requests, or to exercise your rights,
                please contact us at:
              </p>
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm">
                <p className="font-semibold text-slate-800">JobEzee Privacy</p>
                <p className="mt-1 text-slate-600">
                  Email:{' '}
                  <a
                    href="mailto:versatile.engine.2001@gmail.com"
                    className="text-cyan-600 hover:text-cyan-700"
                  >
                    versatile.engine.2001@gmail.com
                  </a>
                </p>
                <p className="mt-1 text-slate-500 text-xs">
                  We aim to respond to all privacy enquiries within 30 days.
                </p>
              </div>
            </Section>

          </div>
        </main>
      </div>

      <footer className="mt-16 border-t border-slate-100 bg-slate-50 px-6 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between text-sm text-slate-400">
          <span>© 2026 JobEzee</span>
          <div className="flex gap-6">
            <button onClick={() => navigate('/terms')} className="hover:text-slate-700 transition">Terms of Service</button>
            <a href="https://github.com/zeeza18/JOBEZEE" target="_blank" rel="noopener noreferrer" className="hover:text-slate-700 transition">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
