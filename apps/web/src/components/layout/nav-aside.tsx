'use client'

import { sitemap } from '@/lib/sitemap'
import Link from 'next/link'
import React, { type ComponentType } from 'react'
import { Activity } from '@carbon/icons-react'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/product/theme-toggle'
import { Slot } from '@radix-ui/react-slot'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { IconProps } from '@/types/svg'

export const NavAside = () => {
  const pathname = usePathname()

  return (
    <div className="w-aside-width flex h-screen shrink-0 flex-col gap-1 self-start max-md:hidden">
      <Link
        href="/"
        className="size-aside-width bg-primary text-primary-foreground group/logo flex items-center justify-center"
      >
        <Activity size={12} />
      </Link>
      {sitemap.map((item) => {
        const isActive = pathname.startsWith(item.href)
        return (
          <AsideButton
            key={item.href}
            icon={item.icon}
            label={item.label}
            tooltip={item.label}
            active={isActive}
            asChild
          >
            <Link href={item.href} />
          </AsideButton>
        )
      })}
      <div className="bg-muted flex-1" />
      <ThemeToggle />
    </div>
  )
}

export type AsideButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  'variant' | 'size'
> & {
  icon?: ComponentType<IconProps>
  label?: string
  active?: boolean
  tooltip?: string
  asChild?: boolean
}

export const AsideButton = ({
  icon: Icon,
  label,
  active = false,
  tooltip,
  className,
  children,
  asChild = false,
  ...props
}: AsideButtonProps) => {
  // If icon/label provided, use structured content; otherwise use children directly
  const content =
    Icon && label ? (
      <>
        <Icon className={cn('size-5', active && 'rotate-90')} />
        <span className={cn('text-sm 2xl:text-base', !active && 'sr-only')}>
          {label}
        </span>
      </>
    ) : (
      children
    )

  const buttonClassName = cn(
    'bg-muted text-muted-foreground w-aside-width flex items-center justify-center gap-2 font-mono font-medium tracking-wide uppercase transition-colors',
    active
      ? 'bg-accent hover:bg-accent text-accent-foreground h-auto rotate-180 px-6 [writing-mode:vertical-rl]'
      : 'h-aside-width size-aside-width hover:bg-accent/50 hover:text-foreground',
    className
  )

  if (asChild && React.isValidElement(children)) {
    const el = (
      <Slot className={buttonClassName} {...props}>
        {React.cloneElement(
          children as React.ReactElement<{ children?: React.ReactNode }>,
          { children: Icon && label ? content : undefined }
        )}
      </Slot>
    )

    if (!tooltip) return el

    return (
      <Tooltip>
        <TooltipTrigger render={el} />
        <TooltipContent side="right" sideOffset={8}>
          {tooltip}
        </TooltipContent>
      </Tooltip>
    )
  }

  const el = (
    <Button variant="outline" size="icon" className={buttonClassName} {...props}>
      {content}
    </Button>
  )

  if (!tooltip) return el

  return (
    <Tooltip>
      <TooltipTrigger render={el} />
      <TooltipContent side="right" sideOffset={8}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}