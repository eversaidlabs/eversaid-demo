'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { useEntryList } from '@/features/dashboard/useEntryList'
import { useEntryActions } from '@/features/dashboard/useEntryActions'
import { EntryCard } from '@/components/dashboard/entry-card'
import { EntryGrid } from '@/components/dashboard/entry-grid'
import { EmptyState } from '@/components/dashboard/empty-state'
import { RenameDialog } from '@/components/dashboard/rename-dialog'
import { DeleteDialog } from '@/components/dashboard/delete-dialog'

export default function TextListPage() {
  const t = useTranslations('dashboard')
  const { entries, total, isLoading, error, refresh } = useEntryList({
    entryType: 'text',
  })
  const {
    renameEntry,
    isRenaming,
    downloadTranscript,
    removeEntry,
    isDeleting,
  } = useEntryActions()

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<{
    id: string
    name: string
  } | null>(null)

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  // Handlers
  const handleOpenRename = useCallback((entryId: string, currentName: string) => {
    setRenameTarget({ id: entryId, name: currentName })
    setRenameDialogOpen(true)
  }, [])

  const handleRename = useCallback(
    async (newName: string) => {
      if (!renameTarget) return

      try {
        await renameEntry(renameTarget.id, newName)
        toast.success(t('toast.renamed'))
        refresh()
      } catch (_err) {
        toast.error(t('toast.renameFailed'))
      }
    },
    [renameTarget, renameEntry, refresh, t]
  )

  const handleOpenDelete = useCallback((entryId: string) => {
    setDeleteTargetId(entryId)
    setDeleteDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async () => {
    if (!deleteTargetId) return

    try {
      await removeEntry(deleteTargetId)
      setDeleteDialogOpen(false)
      setDeleteTargetId(null)
      toast.success(t('toast.deleted'))
      refresh()
    } catch (_err) {
      toast.error(t('toast.deleteFailed'))
    }
  }, [deleteTargetId, removeEntry, refresh, t])

  const handleDownloadTranscript = useCallback(
    (entryId: string, filename: string) => {
      downloadTranscript(entryId, filename)
    },
    [downloadTranscript]
  )

  // Loading state
  if (isLoading && entries.length === 0) {
    return (
      <div>
        <PageHeader title={t('text.title')} />
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-purple-500" />
            <span className="text-sm text-slate-500">{t('loading')}</span>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div>
        <PageHeader title={t('text.title')} />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={t('text.title')} subtitle={t('text.subtitle', { count: total })} />

      {entries.length === 0 ? (
        <EmptyState type="text" />
      ) : (
        <EntryGrid>
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onRename={handleOpenRename}
              onDownloadTranscript={handleDownloadTranscript}
              onDelete={handleOpenDelete}
            />
          ))}
        </EntryGrid>
      )}

      {/* Rename dialog */}
      <RenameDialog
        isOpen={renameDialogOpen}
        currentName={renameTarget?.name || ''}
        onClose={() => setRenameDialogOpen(false)}
        onRename={handleRename}
        isLoading={isRenaming}
      />

      {/* Delete dialog */}
      <DeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  )
}

function PageHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  )
}
