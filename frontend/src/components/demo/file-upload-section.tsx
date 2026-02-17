"use client"

import type React from "react"

import { Upload, FileAudio } from "lucide-react"
import { useTranslations } from "next-intl"
import { useConfig } from "@/lib/config-context"

export interface FileUploadSectionProps {
  selectedFile: File | null
  uploadProgress: number
  isUploading: boolean
  onFileSelect: (file: File) => void
  onTranscribeClick: () => void
}

export function FileUploadSection({
  selectedFile,
  uploadProgress,
  isUploading,
  onFileSelect,
  onTranscribeClick,
}: FileUploadSectionProps) {
  const t = useTranslations("demo.upload")
  const { limits } = useConfig()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-4">
              <FileAudio className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
            <p className="text-slate-600 text-sm mt-2">{t("uploadSubtitle")}</p>
          </div>

          {/* Upload Area */}
          <div className="mb-6">
            <label className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-12 h-12 text-blue-500 mb-2" />
                <p className="text-sm font-medium text-slate-700">{t("clickToUpload")}</p>
                <p className="text-xs text-slate-500 mt-1">{t("formats", {
                  maxSizeMb: limits?.maxAudioFileSizeMb ?? 50,
                  maxDurationMin: Math.floor((limits?.maxAudioDurationSeconds ?? 180) / 60),
                })}</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="audio/*"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>
          </div>

          {/* Selected File */}
          {selectedFile && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <FileAudio className="w-5 h-5 text-slate-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="mb-6">
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-center text-xs text-slate-600 mt-2">{uploadProgress}%</p>
            </div>
          )}

          {/* Transcribe Button */}
          <button
            onClick={onTranscribeClick}
            disabled={!selectedFile || isUploading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-slate-400 disabled:to-slate-400 text-white font-semibold py-3 rounded-lg transition-all disabled:cursor-not-allowed"
          >
            {isUploading ? t("transcribing") : t("startTranscription")}
          </button>
        </div>
      </div>
    </div>
  )
}
