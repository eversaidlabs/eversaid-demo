import Image from 'next/image'

import { cn } from '@/lib/utils'

interface LogoProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show the "EverSaid" text */
  showText?: boolean
  /** Custom className for the container */
  className?: string
  /** Text color variant - 'light' for dark backgrounds, 'dark' for light backgrounds */
  variant?: 'light' | 'dark'
}

const sizeConfig = {
  sm: { icon: 24, text: 'text-base' },
  md: { icon: 32, text: 'text-xl' },
  lg: { icon: 40, text: 'text-2xl' },
}

/**
 * EverSaid logo component.
 *
 * Uses the SVG logo file for consistent branding across the app.
 * Supports different sizes and can optionally show the "EverSaid" text.
 */
export function Logo({
  size = 'md',
  showText = true,
  className,
  variant = 'light',
}: LogoProps) {
  const config = sizeConfig[size]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className="flex items-center justify-center rounded-lg bg-slate-900"
        style={{ width: config.icon, height: config.icon }}
      >
        <Image
          src="/logo.svg"
          alt="EverSaid"
          width={config.icon * 0.7}
          height={config.icon * 0.7}
          className="object-contain"
          priority
        />
      </div>
      {showText && (
        <span
          className={cn(
            'font-bold',
            config.text,
            variant === 'light' ? 'text-white' : 'text-slate-900'
          )}
        >
          EverSaid
        </span>
      )}
    </div>
  )
}

/**
 * Logo icon only (no text, no background).
 * Used in contexts where just the icon is needed.
 */
export function LogoIcon({
  size = 24,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <Image
      src="/logo.svg"
      alt="EverSaid"
      width={size}
      height={size}
      className={cn('object-contain', className)}
      priority
    />
  )
}
