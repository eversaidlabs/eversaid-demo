"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { WaveformOverlay } from "./waveform-overlay"
import { LiveTranscriptPreview } from "./live-transcript-preview"

interface DemoVideoProps {
  src: string
  waveformStart?: number
  waveformEnd?: number
}

export function DemoVideo({ src, waveformStart = 2, waveformEnd = 5 }: DemoVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoState, setVideoState] = useState<"loading" | "ready" | "error">("loading")

  const showWaveform = currentTime >= waveformStart && currentTime <= waveformEnd

  // Track video time
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }, [])

  // Handle video ready to play
  const handleCanPlay = useCallback(() => {
    setVideoState("ready")
  }, [])

  // Handle video load error
  const handleError = useCallback(() => {
    // Only set error if we haven't successfully loaded
    setVideoState((prev) => (prev === "ready" ? prev : "error"))
  }, [])

  // Check video source on mount and handle loading
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // If video is already ready (cached), mark as ready
    // Use queueMicrotask to avoid synchronous setState in effect
    if (video.readyState >= 3) {
      queueMicrotask(() => setVideoState("ready"))
    }
  }, [])

  // Autoplay when video becomes visible (IntersectionObserver)
  useEffect(() => {
    const video = videoRef.current
    if (!video || videoState === "error") return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {
              // Autoplay blocked - that's fine, user can interact
            })
          } else {
            video.pause()
          }
        })
      },
      { threshold: 0.5 }
    )

    observer.observe(video)

    return () => observer.disconnect()
  }, [videoState])

  // Fallback to LiveTranscriptPreview if video fails to load
  if (videoState === "error") {
    return <LiveTranscriptPreview />
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onCanPlay={handleCanPlay}
        onError={handleError}
        className={`w-full rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.08)] border border-border transition-opacity duration-300 ${
          videoState === "ready" ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Show LiveTranscriptPreview while video is loading */}
      {videoState === "loading" && (
        <div className="absolute inset-0">
          <LiveTranscriptPreview />
        </div>
      )}

      <WaveformOverlay visible={showWaveform && videoState === "ready"} />
    </div>
  )
}
