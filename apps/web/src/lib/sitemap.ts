import { Activity, Events, MapIdentify, Search } from '@carbon/icons-react'
import type { ComponentType } from 'react'
import type { IconProps } from '@/types/svg'

export type SitemapItem = {
  label: string
  href: string
  icon: ComponentType<IconProps>
}

export const sitemap: SitemapItem[] = [
  {
    label: 'Research',
    href: '/research',
    icon: Search,
  },
  {
    label: 'Betting',
    href: '/betting',
    icon: MapIdentify,
  },
  {
    label: 'Fantasy',
    href: '/fantasy',
    icon: Events,
  },
  {
    label: 'Live',
    href: '/live',
    icon: Activity,
  },
]