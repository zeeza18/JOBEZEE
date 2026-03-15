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
}
