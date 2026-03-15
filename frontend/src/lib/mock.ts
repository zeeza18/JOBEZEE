export type UserProfile = {
  name: string
  headline: string
  location: string
  email: string
  links: { linkedin: string; github: string; portfolio: string }
  preferences: { roles: string[]; locations: string[]; remote: boolean }
}

export type Job = {
  id: string
  title: string
  company: string
  location: string
  type: string
  salaryRange: string
  postedAt: string
  description: string
  skills: string[]
  source: string
}

export type Resume = {
  id: string
  title: string
  content: string
  lastUpdated: string
}

export type TailorResult = {
  jobId: string
  resumeId: string
  matchScore: number
  missingKeywords: string[]
  suggestedBullets: string[]
  coverLetterDraft: string
}

export type ApplicationStatus = 'Saved' | 'Applied' | 'Interviewing' | 'Offer' | 'Rejected'

export type Application = {
  id: string
  jobId: string
  status: ApplicationStatus
  appliedAt: string
  notes: string
  nextStepDate: string
}

export type InterviewPrep = {
  id: string
  role: string
  company: string
  questions: string[]
  answers: string[]
}

const jobTemplates: Omit<Job, 'id' | 'postedAt'>[] = [
  {
    title: 'Senior Frontend Engineer',
    company: 'Cyan Labs',
    location: 'Remote • US',
    type: 'Full-time',
    salaryRange: '$150k - $185k',
    description: 'Lead frontend initiatives building modern dashboards and design systems with React, TypeScript, and accessibility-first principles.',
    skills: ['React', 'TypeScript', 'Design Systems', 'Accessibility', 'Testing'],
    source: 'JOBEZEE Feed',
  },
  {
    title: 'Full Stack Engineer',
    company: 'Northwind Digital',
    location: 'Seattle, WA',
    type: 'Hybrid',
    salaryRange: '$140k - $170k',
    description: 'Own product slices end-to-end across React frontends and Node APIs. Collaborate with product and design for rapid delivery.',
    skills: ['React', 'Node', 'GraphQL', 'SQL', 'Cloud'],
    source: 'Company Site',
  },
  {
    title: 'Product Designer',
    company: 'Brightline',
    location: 'Remote',
    type: 'Contract',
    salaryRange: '$90/hr',
    description: 'Design flows for onboarding and dashboards with prototyping in Figma and close engineering collaboration.',
    skills: ['UX', 'UI', 'Figma', 'Prototyping', 'Design Systems'],
    source: 'JOBEZEE Feed',
  },
  {
    title: 'Data Analyst',
    company: 'Atlas Insights',
    location: 'Austin, TX',
    type: 'Onsite',
    salaryRange: '$110k - $135k',
    description: 'Analyze product and growth funnels, build dashboards, and partner with stakeholders on insights.',
    skills: ['SQL', 'Python', 'Looker', 'Storytelling'],
    source: 'Referral',
  },
  {
    title: 'Mobile Engineer (React Native)',
    company: 'Loop Mobility',
    location: 'Remote • NA',
    type: 'Full-time',
    salaryRange: '$145k - $170k',
    description: 'Ship consumer app experiences with React Native, animations, and performance optimizations.',
    skills: ['React Native', 'TypeScript', 'Animations', 'Testing'],
    source: 'JOBEZEE Feed',
  },
  {
    title: 'Backend Engineer',
    company: 'Vertex Cloud',
    location: 'New York, NY',
    type: 'Hybrid',
    salaryRange: '$155k - $190k',
    description: 'Build resilient services, APIs, and data pipelines with Node, Go, and cloud-native patterns.',
    skills: ['Node', 'Go', 'Kubernetes', 'Postgres', 'Observability'],
    source: 'Company Site',
  },
]

const statuses: ApplicationStatus[] = ['Saved', 'Applied', 'Interviewing', 'Offer', 'Rejected']

const sampleResume = `SUMMARY\nProduct-minded engineer with 8+ years building delightful SaaS experiences.\n\nEXPERIENCE\n- Led delivery of a hiring marketplace, improving conversion by 18%.\n- Built design system and accessibility foundations across web apps.\n- Partnered with PMs to ship data-driven features with rapid experiments.\n\nSKILLS\nReact, TypeScript, Node, GraphQL, Design Systems, Testing, Leadership.`

export const generateMockData = (jobsCount = 18, applicationsCount = 8) => {
  const today = Date.now()
  const jobs: Job[] = Array.from({ length: jobsCount }, (_, idx) => {
    const tpl = jobTemplates[idx % jobTemplates.length]
    return {
      ...tpl,
      id: `job-${idx + 1}`,
      postedAt: new Date(today - idx * 86_400_000).toISOString(),
      salaryRange: tpl.salaryRange,
    }
  })

  const applications: Application[] = Array.from({ length: applicationsCount }, (_, idx) => {
    const job = jobs[idx % jobs.length]
    const status = statuses[idx % statuses.length]
    return {
      id: `app-${idx + 1}`,
      jobId: job.id,
      status,
      appliedAt: new Date(today - idx * 172_800_000).toISOString(),
      notes: `${job.company} ${job.title} — focused on ${job.skills.slice(0, 3).join(', ')}`,
      nextStepDate: new Date(today + (idx + 1) * 86_400_000).toISOString(),
    }
  })

  const profile: UserProfile = {
    name: 'Alex Rivera',
    headline: 'Product-Focused Engineer',
    location: 'Remote • US',
    email: 'alex.rivera@email.com',
    links: {
      linkedin: 'https://linkedin.com/in/alexrivera',
      github: 'https://github.com/alexrivera',
      portfolio: 'https://alexrivera.dev',
    },
    preferences: {
      roles: ['Frontend', 'Full Stack', 'Design Systems'],
      locations: ['Remote', 'Seattle', 'Austin'],
      remote: true,
    },
  }

  const resumes: Resume[] = [
    {
      id: 'resume-1',
      title: 'Product Engineer — General',
      content: sampleResume,
      lastUpdated: new Date(today - 2 * 86_400_000).toISOString(),
    },
    {
      id: 'resume-2',
      title: 'Frontend Lead — Web',
      content: `${sampleResume}\n\nSELECTED PROJECTS\n- Built analytics UI with charts and guided flows.\n- Led migration to design tokens for 3 brands.`,
      lastUpdated: new Date(today - 7 * 86_400_000).toISOString(),
    },
  ]

  const interviewPreps: InterviewPrep[] = [
    {
      id: 'prep-1',
      role: 'Senior Frontend Engineer',
      company: 'Cyan Labs',
      questions: [
        'Walk me through a complex UI you delivered end-to-end.',
        'How do you ensure accessibility without slowing teams?',
        'Describe a time you improved performance in production.',
      ],
      answers: ['Focus on structure, outcomes, and metrics.', 'Use shared lint rules, design tokens, and audits.', 'Profile, measure, and ship small improvements.'],
    },
  ]

  const tailorResults: TailorResult[] = []

  return { profile, jobs, resumes, applications, interviewPreps, tailorResults }
}
