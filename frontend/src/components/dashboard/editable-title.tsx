'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface EditableTitleProps {
  value: string
  onSave: (newValue: string) => Promise<void>
  className?: string
}

/**
 * Inline editable title component.
 * Click to edit, Enter/blur to save, Escape to cancel.
 */
export function EditableTitle({ value, onSave, className }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync edit value when prop changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value)
    }
  }, [value, isEditing])

  // Focus and select text when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row navigation
    if (!isSaving) {
      setIsEditing(true)
    }
  }, [isSaving])

  const handleSave = useCallback(async () => {
    const trimmedValue = editValue.trim()

    // Don't save if empty or unchanged
    if (!trimmedValue || trimmedValue === value) {
      setEditValue(value)
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await onSave(trimmedValue)
      setIsEditing(false)
    } catch {
      // Error handling done by parent (toast)
      // Revert to original value
      setEditValue(value)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }, [editValue, value, onSave])

  const handleCancel = useCallback(() => {
    setEditValue(value)
    setIsEditing(false)
  }, [value])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }, [handleSave, handleCancel])

  const handleBlur = useCallback(() => {
    // Small delay to allow click events to fire first
    setTimeout(() => {
      if (isEditing && !isSaving) {
        handleSave()
      }
    }, 100)
  }, [isEditing, isSaving, handleSave])

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onClick={(e) => e.stopPropagation()}
        disabled={isSaving}
        className={cn(
          'w-full rounded border border-sky-300 bg-white px-1.5 py-0.5 text-slate-900 outline-none ring-2 ring-sky-100',
          'focus:border-sky-400 focus:ring-sky-200',
          'disabled:opacity-50',
          className
        )}
      />
    )
  }

  return (
    <span
      onClick={handleClick}
      className={cn(
        'block cursor-text truncate rounded px-1.5 py-0.5 -mx-1.5',
        'hover:bg-slate-100',
        'focus:outline-none focus:ring-2 focus:ring-sky-200',
        isSaving && 'opacity-50',
        className
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setIsEditing(true)
        }
      }}
    >
      {value}
    </span>
  )
}
