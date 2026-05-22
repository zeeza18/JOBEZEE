import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import LogoBrand from '../components/common/LogoBrand'

const SECTIONS = [
  'Acceptance of Terms',
  'Eligibility',
  'Description of Service',
  'User Accounts',
  'Acceptable Use',
  'Third-Party Job Boards and Automation',
  'LinkedIn Automation',
  'AI-Generated Content',
  'AI Interview Coach and Voice Features',
  'User Content and Data License',
  'Intellectual Property',
  'No Employment Guarantee',
  'Disclaimers',
  'Limitation of Liability',
  'Indemnification',
  'Termination',
  'Dispute Resolution and Arbitration',
  'Class Action Waiver',
  'Governing Law',
  'Severability',
  'Changes to Terms',
  'Contact',
]

function Section({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <section id={`t${num}`} className="scroll-mt-24">
      <h2 className="text-base font-bold text-slate-900 mb-3">
        {num}. {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  )
}

export default function TermsPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState(1)

  useEffect(() => {
    const sections = SECTIONS
      .map((_, index) => document.getElementById(`t${index + 1}`))
      .filter((section): section is HTMLElement => Boolean(section))

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]

        if (!visible?.target.id) return

        const next = Number(visible.target.id.replace('t', ''))
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
                href={`#t${i + 1}`}
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
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Terms of Service</h1>
          <p className="mt-2 text-sm text-slate-400">
            Effective date: May 22, 2026 &nbsp;·&nbsp; Last updated: May 22, 2026
          </p>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            <strong>Please read these Terms carefully.</strong> They contain important provisions
            including a limitation of liability, indemnification obligations, a binding arbitration
            clause, and a class action waiver in Section 17 and 18.
          </div>

          <div className="mt-10 space-y-10">

            <Section num={1} title="Acceptance of Terms">
              <p>
                By accessing or using the JobEzee website, platform, or any related services
                (collectively, the "Service"), you agree to be bound by these Terms of Service
                ("Terms"). If you do not agree to all of these Terms, you may not access or use
                the Service. These Terms form a legally binding agreement between you and JobEzee.
              </p>
              <p>
                If you are using the Service on behalf of an organisation, you represent that you
                have authority to bind that organisation to these Terms.
              </p>
            </Section>

            <Section num={2} title="Eligibility">
              <p>
                You must be at least 16 years of age to use the Service. By using the Service, you
                represent and warrant that you meet this age requirement. If you are under 18, you
                represent that a parent or legal guardian has reviewed and agreed to these Terms
                on your behalf.
              </p>
              <p>
                The Service is not available to users who have previously had their account
                terminated for violations of these Terms.
              </p>
            </Section>

            <Section num={3} title="Description of Service">
              <p>
                JobEzee is an AI-powered job search and career automation platform that includes
                job discovery from multiple job boards, AI-powered resume tailoring, cover letter
                generation, application tracking, automated form-fill assistance, and AI interview
                coaching. Features are provided on an "as available" basis and are subject to
                change, addition, or removal without prior notice.
              </p>
            </Section>

            <Section num={4} title="User Accounts">
              <ul className="list-disc pl-5 space-y-1.5">
                <li>You must provide accurate, complete, and current information when registering.</li>
                <li>You are solely responsible for maintaining the confidentiality of your login credentials.</li>
                <li>You are responsible for all activity that occurs under your account.</li>
                <li>You must notify us immediately of any unauthorised use of your account.</li>
                <li>One natural person may not maintain more than one active account.</li>
                <li>You may not transfer or sell your account to another party.</li>
              </ul>
            </Section>

            <Section num={5} title="Acceptable Use">
              <p>You agree not to:</p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>Use the Service for any purpose that is unlawful or prohibited by these Terms.</li>
                <li>Submit false, misleading, or fraudulent information in job applications.</li>
                <li>Impersonate any person or entity or misrepresent your qualifications.</li>
                <li>Attempt to reverse engineer, decompile, or exploit any part of the platform.</li>
                <li>Use automated scripts or bots to access the platform beyond intended features.</li>
                <li>Attempt to bypass authentication, rate limits, or security mechanisms.</li>
                <li>Harvest, scrape, or extract data from the Service for commercial redistribution.</li>
                <li>Share your account credentials with others or allow others to access your account.</li>
                <li>Upload malicious files, code, or content to the platform.</li>
                <li>Violate any applicable local, national, or international laws or regulations.</li>
              </ul>
            </Section>

            <Section num={6} title="Third-Party Job Boards and Automation">
              <p>
                JobEzee retrieves job listings from third-party platforms including but not limited
                to Indeed, LinkedIn, Glassdoor, ZipRecruiter, and Workday employer portals. You
                acknowledge and agree that:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>JobEzee is not affiliated with, endorsed by, or in partnership with any of these platforms.</li>
                <li>Job listings are provided for your personal job search use only. You may not redistribute, resell, or commercially exploit retrieved job data.</li>
                <li>The accuracy, completeness, and availability of job listings depend on third-party platforms and cannot be guaranteed.</li>
                <li>Your use of information retrieved from third-party platforms is subject to those platforms' own terms of service.</li>
                <li>JobEzee is not responsible for the content, accuracy, or legality of third-party job listings.</li>
              </ul>
            </Section>

            <Section num={7} title="LinkedIn Automation">
              <p>
                JobEzee offers an optional LinkedIn automation feature that can submit job
                applications on LinkedIn using credentials you voluntarily provide. By enabling
                this feature, you expressly acknowledge and agree that:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>You are providing your LinkedIn credentials entirely voluntarily and at your own risk.</li>
                <li>
                  Automated activity on LinkedIn may violate LinkedIn's User Agreement and Professional
                  Community Policies. <strong>You accept full and sole responsibility for any consequences,
                  including LinkedIn account restriction, suspension, or permanent termination.</strong>
                </li>
                <li>JobEzee is not affiliated with LinkedIn Corporation and this feature is not authorised by LinkedIn.</li>
                <li>You are responsible for reviewing all applications submitted on your behalf before and after submission.</li>
                <li>JobEzee does not guarantee the accuracy, completeness, success, or legality of automated applications.</li>
                <li>JobEzee shall not be liable for any damages arising from your use of this feature, including loss of your LinkedIn account.</li>
                <li>You may disable and revoke this feature at any time via Settings.</li>
              </ul>
            </Section>

            <Section num={8} title="AI-Generated Content">
              <p>
                JobEzee uses AI language models to generate resume content, cover letters, application
                answers, and related materials. You acknowledge that:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>AI-generated content may contain errors, hallucinations, or inaccuracies. You must review all AI-generated content before submitting it to any employer or third party.</li>
                <li>You are solely responsible for the truthfulness and accuracy of all information submitted in job applications, regardless of whether that content was generated by AI.</li>
                <li>Submitting false or misleading information to employers may constitute fraud. JobEzee bears no responsibility for such submissions.</li>
                <li>AI-generated content does not constitute legal, career, or professional advice.</li>
                <li>You retain ownership of your original resume content. By using the tailoring feature, you grant JobEzee a limited licence to process your content solely to operate the Service.</li>
              </ul>
            </Section>

            <Section num={9} title="AI Interview Coach and Voice Features">
              <p>
                The AI Interview Coach feature includes optional voice mode functionality. By
                enabling voice mode, you acknowledge and agree that:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>You are voluntarily granting microphone access to the Service.</li>
                <li>Your voice input is processed for speech-to-text transcription and may be transmitted to third-party AI APIs for feedback generation.</li>
                <li>Interview sessions are for practice purposes only. JobEzee does not guarantee any improvement in interview performance or employment outcomes.</li>
                <li>You are solely responsible for complying with any applicable laws regarding voice recording in your jurisdiction.</li>
                <li>You must not use voice mode to record or capture the voice of any third party without their explicit consent.</li>
              </ul>
            </Section>

            <Section num={10} title="User Content and Data Licence">
              <p>
                You retain all ownership rights to content you upload to JobEzee, including resumes,
                profile information, and application materials. By uploading content to the Service,
                you grant JobEzee a non-exclusive, worldwide, royalty-free licence to store, process,
                copy, and use your content solely for the purpose of providing the Service to you.
                This licence terminates when you delete your content or account.
              </p>
              <p>
                You represent and warrant that you have all necessary rights to any content you
                upload, and that your content does not infringe any third-party intellectual
                property, privacy, or other rights.
              </p>
            </Section>

            <Section num={11} title="Intellectual Property">
              <p>
                The JobEzee platform, including its code, design, branding, logos, and documentation,
                is the intellectual property of JobEzee. The source code is made available on GitHub
                under the terms of the applicable open-source licence. You may not use JobEzee's
                name, logo, or branding without prior written permission.
              </p>
              <p>
                Nothing in these Terms transfers intellectual property ownership to you, except as
                expressly stated.
              </p>
            </Section>

            <Section num={12} title="No Employment Guarantee">
              <p>
                JobEzee provides tools to assist your job search. JobEzee does not guarantee and
                makes no representation that use of the Service will result in job interviews,
                job offers, employment, or any specific career outcome. Employment decisions are
                made solely by employers. JobEzee has no control over, and is not responsible for,
                the hiring decisions of any employer or recruiter.
              </p>
            </Section>

            <Section num={13} title="Disclaimers">
              <p>
                THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES
                OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO
                WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT,
                AND ACCURACY.
              </p>
              <p>
                JOBEZEE DOES NOT WARRANT THAT: (A) THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE,
                OR SECURE; (B) JOB LISTINGS RETRIEVED FROM THIRD-PARTY PLATFORMS ARE ACCURATE,
                CURRENT, OR LAWFUL; (C) AI-GENERATED CONTENT IS ACCURATE OR SUITABLE FOR YOUR
                PURPOSES; OR (D) THE SERVICE WILL MEET YOUR REQUIREMENTS OR EXPECTATIONS.
              </p>
              <p>
                Some jurisdictions do not allow the exclusion of certain warranties. In such
                jurisdictions, the foregoing exclusions apply to the maximum extent permitted by law.
              </p>
            </Section>

            <Section num={14} title="Limitation of Liability">
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, JOBEZEE AND ITS OPERATORS,
                EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>Loss of employment, job opportunities, or income.</li>
                <li>Suspension or termination of your LinkedIn or other third-party accounts.</li>
                <li>Inaccuracies in AI-generated content submitted to employers.</li>
                <li>Data loss or unauthorised access to your account.</li>
                <li>Any reliance on job listings, salary data, or AI-generated advice.</li>
              </ul>
              <p>
                IN NO EVENT SHALL JOBEZEE'S TOTAL AGGREGATE LIABILITY TO YOU EXCEED THE GREATER
                OF (A) THE TOTAL FEES PAID BY YOU TO JOBEZEE IN THE 12 MONTHS PRECEDING THE CLAIM,
                OR (B) ONE HUNDRED DOLLARS (USD $100).
              </p>
              <p>
                These limitations apply regardless of the legal theory (contract, tort, strict
                liability, or otherwise) and even if JobEzee has been advised of the possibility
                of such damages.
              </p>
            </Section>

            <Section num={15} title="Indemnification">
              <p>
                You agree to defend, indemnify, and hold harmless JobEzee and its operators,
                employees, and agents from and against any claims, liabilities, damages, losses,
                and expenses (including reasonable legal fees) arising out of or related to:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>Your use of the Service in violation of these Terms.</li>
                <li>Your submission of false, misleading, or fraudulent information to employers.</li>
                <li>Your use of the LinkedIn automation feature and any resulting account actions.</li>
                <li>Your violation of any applicable law or third-party right.</li>
                <li>Any content you upload to the Service that infringes third-party rights.</li>
              </ul>
            </Section>

            <Section num={16} title="Termination">
              <p>
                Either party may terminate this agreement at any time. You may delete your account
                through the Settings page. JobEzee reserves the right to suspend or permanently
                terminate your account for violation of these Terms, suspected fraud, or any other
                reason at its discretion, with or without prior notice.
              </p>
              <p>
                Upon termination, your right to use the Service ceases immediately. Sections on
                Disclaimers, Limitation of Liability, Indemnification, Dispute Resolution, and
                Governing Law survive termination.
              </p>
            </Section>

            <Section num={17} title="Dispute Resolution and Arbitration">
              <p>
                PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS.
              </p>
              <p>
                In the event of any dispute, claim, or controversy arising out of or relating to
                these Terms or the Service, the parties agree to first attempt to resolve the
                dispute informally by contacting JobEzee at the address in Section 22. If the
                dispute is not resolved within 30 days, either party may submit the dispute to
                binding individual arbitration administered under the rules of a recognised
                arbitration body.
              </p>
              <p>
                The arbitration shall be conducted in English. The arbitrator's decision shall
                be final and binding. Each party shall bear its own arbitration costs unless the
                arbitrator determines otherwise.
              </p>
              <p>
                Nothing in this section prevents either party from seeking injunctive or other
                equitable relief in a court of competent jurisdiction to prevent actual or
                threatened infringement or misappropriation of intellectual property rights.
              </p>
            </Section>

            <Section num={18} title="Class Action Waiver">
              <p>
                TO THE EXTENT PERMITTED BY LAW, YOU AND JOBEZEE AGREE THAT EACH PARTY MAY BRING
                CLAIMS AGAINST THE OTHER ONLY IN AN INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF
                OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, OR REPRESENTATIVE PROCEEDING.
                THE ARBITRATOR MAY NOT CONSOLIDATE MORE THAN ONE PERSON'S CLAIMS AND MAY NOT
                PRESIDE OVER ANY FORM OF CLASS PROCEEDING.
              </p>
            </Section>

            <Section num={19} title="Governing Law">
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the
                United States, without regard to conflict of law principles. To the extent disputes
                are not subject to arbitration, you consent to exclusive jurisdiction in the federal
                and state courts located in the United States.
              </p>
              <p>
                If you are accessing the Service from the European Union, the European Economic Area,
                or the United Kingdom, mandatory consumer protection laws of your country of residence
                may apply in addition to these Terms.
              </p>
            </Section>

            <Section num={20} title="Severability">
              <p>
                If any provision of these Terms is found by a court or arbitrator to be invalid,
                unlawful, or unenforceable, that provision shall be limited or eliminated to the
                minimum extent necessary and the remaining provisions shall remain in full force
                and effect.
              </p>
            </Section>

            <Section num={21} title="Changes to Terms">
              <p>
                JobEzee reserves the right to modify these Terms at any time. When we make material
                changes, we will update the "Last updated" date and notify you via email or a
                prominent notice in the platform at least 7 days before changes take effect.
                Continued use of the Service after the effective date of updated Terms constitutes
                your acceptance of the changes.
              </p>
              <p>
                If you do not agree to the updated Terms, you must stop using the Service and
                delete your account before the changes take effect.
              </p>
            </Section>

            <Section num={22} title="Contact">
              <p>
                For questions, legal notices, or other inquiries regarding these Terms, please
                contact us at:
              </p>
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm">
                <p className="font-semibold text-slate-800">JobEzee Legal</p>
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
                  Legal notices must be sent by email. We aim to respond within 14 business days.
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
            <button onClick={() => navigate('/privacy')} className="hover:text-slate-700 transition">Privacy Policy</button>
            <a href="https://github.com/zeeza18/JOBEZEE" target="_blank" rel="noopener noreferrer" className="hover:text-slate-700 transition">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
