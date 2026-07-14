import { lazy } from 'react'
import type { ComponentType } from 'react'
import type { PortfolioTemplateProps } from '../types'

// Each template is a large standalone component. Only one is ever rendered
// at a time (inside a modal), so they're lazy-loaded per selection instead
// of all 24 (~1.1MB combined) being eagerly bundled into the initial chunk.
export const TEMPLATE_REGISTRY: Record<string, ComponentType<PortfolioTemplateProps>> = {
  ModernDev        : lazy(() => import('./ModernDev')),
  NeonGrid         : lazy(() => import('./NeonGrid')),
  ArtCanvas        : lazy(() => import('./ArtCanvas')),
  InkStudio        : lazy(() => import('./InkStudio')),
  ExecutiveSuite   : lazy(() => import('./ExecutiveSuite')),
  CorporatePro     : lazy(() => import('./CorporatePro')),
  WallStreet       : lazy(() => import('./WallStreet')),
  QuantEdge        : lazy(() => import('./QuantEdge')),
  CareFlow         : lazy(() => import('./CareFlow')),
  MedProfile       : lazy(() => import('./MedProfile')),
  BrandStudio      : lazy(() => import('./BrandStudio')),
  GrowthHacker     : lazy(() => import('./GrowthHacker')),
  TechnicalBold    : lazy(() => import('./TechnicalBold')),
  TechnicalModern  : lazy(() => import('./TechnicalModern')),
  TechnicalClassic : lazy(() => import('./TechnicalClassic')),
  TechnicalGraphicy: lazy(() => import('./TechnicalGraphicy')),
  TechnicalWarm    : lazy(() => import('./TechnicalWarm')),
  TechnicalRetro   : lazy(() => import('./TechnicalRetro')),
  TechnicalSleek   : lazy(() => import('./TechnicalSleek')),
  TechnicalVibrant : lazy(() => import('./TechnicalVibrant')),
  TechnicalAnimated: lazy(() => import('./TechnicalAnimated')),
  TechnicalGlossy  : lazy(() => import('./TechnicalGlossy')),
  TechnicalCreative: lazy(() => import('./TechnicalCreative')),
  TechnicalNature  : lazy(() => import('./TechnicalNature')),
}
