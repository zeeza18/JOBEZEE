import type { UserProfile } from '../../lib/api'

// ── Build merged skill array from profile ─────────────────────────────────────
export function buildAllSkills(profile: UserProfile): string[] {
  return [
    ...(profile.skills_languages || []),
    ...(profile.skills_frameworks || []),
    ...(profile.skills_tools || []),
  ]
}

// ── Skill proficiency: decays from 95 → 65 so it always looks meaningful ──────
export function getSkillPct(index: number): number {
  return Math.max(65, 95 - index * 5)
}

// ── Fallback-safe count ────────────────────────────────────────────────────────
export function safeCount(arr: unknown[] | undefined): number {
  return arr?.length ?? 0
}

// ── Company initials for avatars ─────────────────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// ── Hero bio with graceful fallback ─────────────────────────────────────────────
export function buildBio(profile: UserProfile): string {
  if (profile.headline) return profile.headline
  const exp = profile.years_experience ? `${profile.years_experience} years` : ''
  const role = profile.current_job_title || profile.target_role || ''
  return [role, exp].filter(Boolean).join(' · ') || 'Passionate professional building meaningful work.'
}

// ── Metrics helper: real data or graceful empty ────────────────────────────────
export function getMetrics(profile: UserProfile): string[] {
  return profile.resume_facts_metrics || []
}

// ── Empty state message for sections ───────────────────────────────────────────
export function sectionEmpty(): string {
  return 'No content added yet — fill in your profile to see it here.'
}
