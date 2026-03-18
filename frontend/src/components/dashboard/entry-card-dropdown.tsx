'use client'

import { useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

interface EntryCardDropdownProps {
  entryId: string
  filename: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onRename: () => void
  onDelete: () => void
}

export function EntryCardDropdown({
  entryId: _entryId,
  filename: _filename,
  isOpen,
  onOpenChange,
  onRename,
  onDelete,
}: EntryCardDropdownProps) {
  const t = useTranslations('dashboard')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onOpenChange])

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onOpenChange])

  return (
    <div ref={dropdownRef} className="relative">
      {/* Menu button */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onOpenChange(!isOpen)
        }}
        className="flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        <DotsIcon />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <DropdownItem
            icon={<RenameIcon />}
            label={t('dropdown.rename')}
            onClick={() => {
              onOpenChange(false)
              onRename()
            }}
          />

          <div className="my-1 h-px bg-slate-100" />

          <DropdownItem
            icon={<DeleteIcon />}
            label={t('dropdown.delete')}
            variant="danger"
            onClick={() => {
              onOpenChange(false)
              onDelete()
            }}
          />
        </div>
      )}
    </div>
  )
}

interface DropdownItemProps {
  icon: React.ReactNode
  label: string
  variant?: 'default' | 'danger'
  onClick: () => void
}

function DropdownItem({
  icon,
  label,
  variant = 'default',
  onClick,
}: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
        variant === 'danger'
          ? 'text-red-600 hover:bg-red-50'
          : 'text-slate-700 hover:bg-slate-50'
      )}
    >
      <span className={cn('size-4', variant === 'danger' ? 'text-red-500' : 'text-slate-400')}>
        {icon}
      </span>
      {label}
    </button>
  )
}

// Icons
function DotsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="size-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
      />
    </svg>
  )
}

function RenameIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="size-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="size-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}
