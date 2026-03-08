'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface RenameDialogProps {
  isOpen: boolean
  currentName: string
  onClose: () => void
  onRename: (newName: string) => Promise<void>
  isLoading?: boolean
}

export function RenameDialog({
  isOpen,
  currentName,
  onClose,
  onRename,
  isLoading,
}: RenameDialogProps) {
  const t = useTranslations('dashboard')
  const [name, setName] = useState(currentName)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync name when dialog opens or currentName changes
  useEffect(() => {
    if (isOpen) {
      // Use queueMicrotask to avoid synchronous setState in effect
      queueMicrotask(() => {
        setName(currentName)
      })
      // Focus and select input after render
      const timer = setTimeout(() => {
        inputRef.current?.select()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [isOpen, currentName])

  // Handle escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim() && name !== currentName) {
      await onRename(name.trim())
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {t('rename.title')}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4 space-y-2">
            <Label htmlFor="entry-name">{t('rename.label')}</Label>
            <Input
              ref={inputRef}
              id="entry-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('rename.placeholder')}
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {t('rename.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name.trim() || name === currentName}
            >
              {isLoading ? t('rename.saving') : t('rename.save')}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
