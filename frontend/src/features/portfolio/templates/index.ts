import type { ComponentType } from 'react'
import type { PortfolioTemplateProps } from '../types'

import ModernDev      from './ModernDev'
import NeonGrid       from './NeonGrid'
import ArtCanvas      from './ArtCanvas'
import InkStudio      from './InkStudio'
import ExecutiveSuite from './ExecutiveSuite'
import CorporatePro   from './CorporatePro'
import WallStreet     from './WallStreet'
import QuantEdge      from './QuantEdge'
import CareFlow       from './CareFlow'
import MedProfile     from './MedProfile'
import BrandStudio    from './BrandStudio'
import GrowthHacker   from './GrowthHacker'
import TechnicalBold  from './TechnicalBold'
import TechnicalModern from './TechnicalModern'
import TechnicalClassic from './TechnicalClassic'
import TechnicalGraphicy from './TechnicalGraphicy'
import TechnicalWarm from './TechnicalWarm'
import TechnicalRetro    from './TechnicalRetro'
import TechnicalSleek  from './TechnicalSleek'
import TechnicalVibrant from './TechnicalVibrant'
import TechnicalAnimated from './TechnicalAnimated'
import TechnicalGlossy from './TechnicalGlossy'
import TechnicalCreative from './TechnicalCreative'
import TechnicalNature from './TechnicalNature'

export const TEMPLATE_REGISTRY: Record<string, ComponentType<PortfolioTemplateProps>> = {
  ModernDev,
  NeonGrid,
  ArtCanvas,
  InkStudio,
  ExecutiveSuite,
  CorporatePro,
  WallStreet,
  QuantEdge,
  CareFlow,
  MedProfile,
  BrandStudio,
  GrowthHacker,
  TechnicalBold,
  TechnicalModern,
  TechnicalClassic,
  TechnicalGraphicy,
  TechnicalWarm,
  TechnicalRetro,
  TechnicalSleek,
  TechnicalVibrant,
  TechnicalAnimated,
  TechnicalGlossy,
  TechnicalCreative,
  TechnicalNature,
}
