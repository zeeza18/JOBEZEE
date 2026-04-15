/**
 * Typed API client for the JOBEZEE FastAPI backend.
 * Uses native fetch with credentials: 'include' so httpOnly JWT cookies
 * are sent automatically on every request.
 */

// On first-party domains (jobezee.org / *.vercel.app) and localhost, force
// same-origin so auth cookies stay first-party even if VITE_API_URL is set.
// Elsewhere (staging), allow explicit override.
const HOST           = typeof window !== 'undefined' ? window.location.hostname : ''
const IS_LOCAL       = HOST === 'localhost' || HOST === '127.0.0.1'
const ENV_API        = (import.meta.env.VITE_API_URL || '').trim()
const IS_FIRST_PARTY = IS_LOCAL || HOST.endsWith('jobezee.org') || HOST.endsWith('vercel.app')

// Local override: if you explicitly set VITE_API_URL to a localhost URL, use it
// (skips Vite proxy in case it interferes with Set-Cookie). Otherwise, force
// same-origin on first-party/local domains so cookies stay first-party.
const BASE = (IS_LOCAL && ENV_API && ENV_API.includes('localhost'))
  ? ENV_API
  : (IS_FIRST_PARTY ? '' : ENV_API)

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirror backend Pydantic schemas)
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id             : string
  email          : string
  full_name      : string
  preferred_name : string
}

export interface UserProfile {
  id                        : string
  full_name                 : string
  email                     : string
  phone                     : string
  address                   : string
  city                      : string
  state                     : string
  country                   : string
  zip_code                  : string
  linkedin                  : string
  github                    : string
  portfolio                 : string
  personal_website          : string
  headline                  : string
  preferred_name            : string

  // Job preferences
  desired_roles             : string[]
  preferred_locations       : string[]
  preferred_countries       : string[]
  preferred_regions         : string[]
  industries                : string[]
  remote_preference         : string
  job_type                  : string
  experience_level          : string
  work_modes                ?: string[]
  job_types                 ?: string[]
  experience_levels         ?: string[]
  tailor_resume             ?: boolean

  // Salary
  salary_min                : number
  salary_max                : number
  salary_currency           : string
  salary_range_text         : string

  // Work authorization
  work_authorization        : string
  visa_sponsorship_required : boolean
  work_permit_type          : string

  // Experience & education
  current_job_title         : string
  target_role               : string
  years_experience          : string
  education                 : string

  // Skills
  skills_languages          : string[]
  skills_frameworks         : string[]
  skills_tools              : string[]

  // Resume facts (AI must preserve verbatim)
  resume_facts_companies    : string[]
  resume_facts_projects     : string[]
  resume_facts_schools      : string[]
  resume_facts_metrics      : string[]
  earliest_start            : string

  // Search tuning
  search_radius_miles       : number
  hours_old                 : number
  results_per_site          : number

  // Resume file
  resume_filename           : string
  resume_url                : string
  apply_password            : string

  created_at                : string
  updated_at                : string
}

export interface PulledJob {
  id                : string
  user_profile_id   : string
  search_session_id : string
  title             : string
  company           : string
  location          : string
  country           : string
  url               : string
  description       : string
  job_type          : string
  salary_min        : number | null
  salary_max        : number | null
  salary_currency   : string
  salary_text       : string
  source            : string
  site              : string
  posted_at         : string
  skills            : string[]
  status            : string
  pulled_at         : string
}

export interface JobStats {
  total     : number
  new       : number
  saved     : number
  applied   : number
  favourite : number
  hidden    : number
  sources   : string[]
}

export interface SearchTriggerResponse {
  session_id : string
  jobs_found : number
  message    : string
  roles      : string[]
  locations  : string[]
}

export interface SearchStatusResponse {
  session_id  : string
  status      : string
  jobs_found  : number
  error       : string
  started_at  : string
  finished_at : string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Core fetcher
// ─────────────────────────────────────────────────────────────────────────────

class ApiError extends Error {
  status: number
  rawDetail?: unknown
  constructor(status: number, message: string, rawDetail?: unknown) {
    super(message)
    this.status = status
    this.rawDetail = rawDetail
    this.name = 'ApiError'
  }
}

// Deduplicate concurrent refresh calls — only one in-flight at a time.
let _refreshPromise: Promise<boolean> | null = null

async function _tryRefresh(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise
  _refreshPromise = fetch(`${BASE}/api/auth/refresh`, {
    method      : 'POST',
    credentials : 'include',
  })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => { _refreshPromise = null })
  return _refreshPromise
}

function _buildFetchOpts(method: string, body: unknown, headers: Record<string, string>) {
  const isFormData = body instanceof FormData
  return {
    method,
    credentials : 'include' as const,
    headers     : isFormData
      ? headers
      : { 'Content-Type': 'application/json', ...headers },
    body: body == null
      ? undefined
      : isFormData
        ? (body as FormData)
        : JSON.stringify(body),
  }
}

async function _readError(res: Response): Promise<ApiError> {
  let detail = res.statusText || `HTTP ${res.status}`
  let rawDetail: unknown
  try {
    const err = await res.json()
    rawDetail = err.detail
    if (typeof err.detail === 'string') {
      detail = err.detail
    } else if (Array.isArray(err.detail)) {
      // Pydantic v2 returns an array of {loc, msg, type} objects
      detail = err.detail.map((e: { loc?: string[]; msg?: string }) =>
        `${(e.loc ?? []).slice(1).join('.')}: ${e.msg ?? 'invalid'}`
      ).join('; ')
    } else if (err.detail?.message) {
      detail = err.detail.message
    } else if (err.message) {
      detail = err.message
    }
  } catch { /* ignore */ }
  return new ApiError(res.status, detail || `HTTP ${res.status}`, rawDetail)
}

async function request<T>(
  method  : string,
  path    : string,
  body?   : unknown,
  headers : Record<string, string> = {},
): Promise<T> {
  const opts = _buildFetchOpts(method, body, headers)
  let res = await fetch(`${BASE}${path}`, opts)

  // ── Auto-refresh on 401 (access token expired) ────────────────────────────
  if (res.status === 401 && path !== '/api/auth/refresh') {
    const refreshed = await _tryRefresh()
    if (refreshed) {
      res = await fetch(`${BASE}${path}`, opts)   // retry with fresh cookie
    }
    // If still 401 after refresh, fall through to the error handler below
  }

  if (!res.ok) throw await _readError(res)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const get   = <T>(path: string)                   => request<T>('GET',    path)
const post  = <T>(path: string, body?: unknown)   => request<T>('POST',   path, body)
const put   = <T>(path: string, body?: unknown)   => request<T>('PUT',    path, body)
const patch = <T>(path: string, body?: unknown)   => request<T>('PATCH',  path, body)
const del   = <T>(path: string)                   => request<T>('DELETE', path)

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export const authApi = {
  register : (email: string, password: string, full_name: string) =>
    post<AuthUser>('/api/auth/register', { email, password, full_name }),

  login    : (email: string, password: string) =>
    post<AuthUser>('/api/auth/login', { email, password }),

  logout   : () => post<void>('/api/auth/logout'),

  me       : () => get<AuthUser>('/api/auth/me'),

  refresh  : () => post<{ ok: boolean }>('/api/auth/refresh'),
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────────────────────────────────────

// Fields returned by GET but not accepted by PUT
const _PROFILE_READONLY = new Set(['id', 'created_at', 'updated_at', 'avatar_url', 'credentials_set', 'resume_url', 'resume_filename'])

function _sanitizeProfile(data: Partial<UserProfile>): Partial<UserProfile> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (_PROFILE_READONLY.has(k)) continue
    // Coerce null numbers to 0 so Pydantic doesn't reject them
    if (v === null && (k === 'salary_min' || k === 'salary_max' || k === 'search_radius_miles' || k === 'hours_old' || k === 'results_per_site')) {
      out[k] = 0
    } else {
      out[k] = v
    }
  }
  return out as Partial<UserProfile>
}

export const profileApi = {
  get    : ()                           => get<UserProfile>('/api/profile/'),
  update : (data: Partial<UserProfile>) => put<UserProfile>('/api/profile/', _sanitizeProfile(data)),

  uploadResume: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ filename: string; url: string }>('POST', '/api/profile/resume', form)
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Jobs
// ─────────────────────────────────────────────────────────────────────────────

export const jobsApi = {
  list: (params?: {
    status?  : string
    source?  : string
    search?  : string
    limit?   : number
    offset?  : number
  }) => {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.source) qs.set('source', params.source)
    if (params?.search) qs.set('search', params.search)
    if (params?.limit  != null) qs.set('limit',  String(params.limit))
    if (params?.offset != null) qs.set('offset', String(params.offset))
    const q = qs.toString()
    return get<PulledJob[]>(`/api/jobs/${q ? `?${q}` : ''}`)
  },

  setStatus : (jobId: string, status: string) =>
    patch<{ ok: boolean; status: string }>(`/api/jobs/${jobId}/status`, { status }),

  stats : () => get<JobStats>('/api/jobs/stats'),

  clearAll : () => del<{ deleted: number }>('/api/jobs/clear'),

  fullDescription : (jobId: string) =>
    get<{ description: string; source: string }>(`/api/jobs/${jobId}/full-description`),
}

// ─────────────────────────────────────────────────────────────────────────────
// Tailor
// ─────────────────────────────────────────────────────────────────────────────

export interface TailorStatus {
  status         : string
  score          : number | null
  has_pdf        : boolean
  has_tex        : boolean
  filename       : string | null
  error          : string | null
  progress_count : number
}

export interface TailorResumeResponse {
  resume   : string
  score    : number | null
  filename : string | null
}

export const tailorApi = {
  // TailorPage (paste text)
  run : (job_description: string, resume: string) =>
    post<{ job_id: string; status: string }>('/api/tailor/run', { job_description, resume }),

  // Job-card Tailor button (uses uploaded resume from profile)
  runForJob : (jobId: string) =>
    post<{ job_id: string; status: string }>('/api/tailor/run-for-job', { job_id: jobId }),

  status : (tailorJobId: string) =>
    get<TailorStatus>(`/api/tailor/status/${tailorJobId}`),

  getResume : (tailorJobId: string) =>
    get<TailorResumeResponse>(`/api/tailor/resume/${tailorJobId}`),

  // Returns a URL — use as <a href> or window.open
  downloadPdfUrl  : (tailorJobId: string) => `${BASE}/api/tailor/download/${tailorJobId}`,
  downloadTexUrl  : (tailorJobId: string) => `${BASE}/api/tailor/download-tex/${tailorJobId}`,
  downloadDocxUrl : (tailorJobId: string) => `${BASE}/api/tailor/download-docx/${tailorJobId}`,

  streamUrl : (tailorJobId: string) => `${BASE}/api/tailor/stream/${tailorJobId}`,

  deleteTailorRecord : (pulledJobId: string) =>
    del<{ deleted: boolean }>(`/api/tailor/my-jobs/${pulledJobId}`),

  myJobs : () => get<Array<{
    pulled_job_id  : string
    tailor_job_id  : string
    status         : string   // queued/running/complete/error
    score          : number | null
    filename       : string | null
    has_pdf        : boolean
    has_docx        : boolean
    company_name   : string | null
    rounds_done    : number
    progress_count : number
  }>>('/api/tailor/my-jobs'),
}

// ─────────────────────────────────────────────────────────────────────────────
// Search (Phase 1)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio
// ─────────────────────────────────────────────────────────────────────────────

export interface PortfolioConfig {
  id            : string
  user_id       : string
  template_id   : string
  category      : string
  primary_color : string
  accent_color  : string
  is_published  : boolean
  custom_bio    : string
  show_sections : Record<string, boolean>
  created_at    : string
  updated_at    : string
}

export interface PublicPortfolioResponse {
  profile  : UserProfile
  config   : PortfolioConfig | null
  username : string
}

export const portfolioApi = {
  getMy     : ()                             => get<PortfolioConfig>('/api/portfolio/my'),
  updateMy  : (data: Partial<PortfolioConfig>) => put<PortfolioConfig>('/api/portfolio/my', data),
  getPublic : (username: string)             => get<PublicPortfolioResponse>(`/api/portfolio/public/${username}`),
}

// ─────────────────────────────────────────────────────────────────────────────
// Search (Phase 1)
// ─────────────────────────────────────────────────────────────────────────────

export const searchApi = {
  trigger : (body?: Record<string, unknown> & { include_workday?: boolean; workday_only?: boolean; force_full_pull?: boolean }) =>
    post<SearchTriggerResponse>('/api/search/trigger', body ?? {}),
  status  : (sessionId: string)   => get<SearchStatusResponse>(`/api/search/status/${sessionId}`),
  health  : ()                    => get<{ status: string }>('/api/health'),
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto Apply (Phase 3)
// ─────────────────────────────────────────────────────────────────────────────

export interface ApplyJobStatus {
  status         : string   // pending | queued | running | complete | error
  result         : string | null  // applied | failed | dry_run_done | ...
  error          : string | null
  progress_count : number
  cost           : number
}

export const applyApi = {
  runForUrl: (url: string, dry_run = false, tailor_before_apply = false) =>
    post<{ apply_job_id: string; status: string }>(
      '/api/apply/run-for-url', { url, dry_run, tailor_before_apply }
    ),

  runForJob: (jobId: string, dry_run = false, tailor_before_apply = false) =>
    post<{ apply_job_id: string; status: string; job_title: string; company: string; tailored?: boolean }>(
      '/api/apply/run-for-job', { job_id: jobId, dry_run, tailor_before_apply }
    ),

  status: (applyJobId: string) =>
    get<ApplyJobStatus>(`/api/apply/status/${applyJobId}`),

  streamUrl: (applyJobId: string) => `${BASE}/api/apply/stream/${applyJobId}`,

  warmSessions: (workerId = 0, headless = false) =>
    post<{ warm_job_id: string; status: string }>(
      `/api/apply/warm-sessions?worker_id=${workerId}&headless=${headless}`, {}
    ),

  warmStatus: (warmJobId: string) =>
    get<{ status: string; results: Record<string, string>; error: string | null }>(
      `/api/apply/warm-sessions/status/${warmJobId}`
    ),

  browserStatus: () =>
    get<{ alive: boolean; port: number; error?: string }>('/api/apply/browser/status'),

  browserStart: () =>
    post<{ status: string }>('/api/apply/browser/start', {}),

  browserNavigate: (url: string) =>
    post<{ status: string; url: string }>('/api/apply/browser/navigate', { url }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Applied Jobs (LinkedIn bot history)
// ─────────────────────────────────────────────────────────────────────────────

export interface AppliedJob {
  job_id          : string
  title           : string
  company         : string
  location        : string
  work_style      : string
  link            : string
  date_applied    : string
  date_posted     : string
  resume          : string
  experience      : string
  platform        : string
  status          : 'applied' | 'failed'
  email_confirmed : boolean
  fail_reason?    : string
}

export interface AppliedJobsResponse {
  total   : number
  applied : number
  failed  : number
  jobs    : AppliedJob[]
}

export const appliedJobsApi = {
  list: () =>
    get<AppliedJobsResponse>('/api/applied-jobs'),

  checkEmail: (company: string, job_title: string) =>
    post<{ confirmed: boolean; message?: string; snippet?: string }>(
      '/api/applied-jobs/check-email', { company, job_title }
    ),
}

// ─────────────────────────────────────────────────────────────────────────────
// LinkedIn Connect (one-time interactive login to save session cookies)
// ─────────────────────────────────────────────────────────────────────────────

export const linkedinConnectApi = {
  status: () =>
    get<{ has_cookies: boolean; session_active: boolean }>('/api/apply/linkedin-connect/status'),

  /** One-shot: starts Chrome on Hetzner, fills login form via CDP, saves cookies (~15s) */
  doLogin: (email: string, password: string) =>
    post<{ saved: boolean; cookie_count: number }>('/api/apply/linkedin-connect/do-login', { email, password }),

  // Step-by-step interactive login
  start: () =>
    post<{ status: string; port: number }>('/api/apply/linkedin-connect/start'),
  fillEmail: (email: string) =>
    post<{ ok: boolean }>('/api/apply/linkedin-connect/fill-email', { text: email }),
  fillPassword: (password: string) =>
    post<{ ok: boolean }>('/api/apply/linkedin-connect/fill-password', { text: password }),
  pressLogin: () =>
    post<{ success: boolean; captcha?: boolean; message: string }>('/api/apply/linkedin-connect/press-login'),
  fillCode: (code: string) =>
    post<{ ok: boolean }>('/api/apply/linkedin-connect/fill-code', { text: code }),
  click: (x: number, y: number) =>
    post<{ ok: boolean }>('/api/apply/linkedin-connect/click', { x, y }),
  type: (text: string) =>
    post<{ ok: boolean }>('/api/apply/linkedin-connect/type', { text }),
  saveCookies: () =>
    post<{ saved: boolean; cookie_count: number }>('/api/apply/linkedin-connect/save-cookies'),
  stop: () =>
    post<{ stopped: boolean }>('/api/apply/linkedin-connect/stop'),

  deleteCookies: () =>
    del<{ cleared: boolean }>('/api/apply/linkedin-connect/cookies'),

  /** Screenshot of current Hetzner display (for CAPTCHA solving panel) */
  screenshot: () =>
    get<{ image_b64: string; width: number; height: number }>('/api/apply/linkedin-connect/screenshot'),

  /** Current page URL from connect-session Chrome (poll to detect CAPTCHA solved) */
  pageUrl: () =>
    get<{ url: string }>('/api/apply/linkedin-connect/page-url'),
}

export const linkedinApi = {
  launch: (dry_run = false, tailor_before_apply = false) =>
    post<{ linkedin_job_id: string; status: string }>(
      '/api/apply/linkedin-launch', { dry_run, tailor_before_apply }
    ),

  status: (jobId: string) =>
    get<{ status: string; result: string | null; error: string | null; progress_count: number }>(
      `/api/apply/linkedin-status/${jobId}`
    ),

  progress: (jobId: string, fromIdx = 0) =>
    get<{ lines: string[]; total: number; status: string; result: string | null; error: string | null }>(
      `/api/apply/linkedin-progress/${jobId}?from_idx=${fromIdx}`
    ),

  streamUrl: (jobId: string) => `${BASE}/api/apply/linkedin-stream/${jobId}`,

  stop: (jobId: string) =>
    post<{ stopped: boolean }>(`/api/apply/linkedin-stop/${jobId}`),

  stopAll: () =>
    post<{ stopped: boolean }>('/api/apply/linkedin-stop-all', {}),

  screenshot: () =>
    get<{ image_b64: string; format?: string; width?: number; height?: number; error?: string }>(
      '/api/apply/bot-screenshot'
    ),
}
