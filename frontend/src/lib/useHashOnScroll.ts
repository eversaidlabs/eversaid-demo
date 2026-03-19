import { useEffect, useRef } from "react"

/**
 * Updates the URL hash based on which section is currently visible.
 * Uses Intersection Observer to detect when sections with IDs scroll into view.
 *
 * @param containerSelector - CSS selector for the scroll container (default: "main")
 */
export function useHashOnScroll(containerSelector = "main") {
  const visibleSections = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    const container = document.querySelector(containerSelector)
    if (!container) return

    // Find all sections with IDs
    const sections = container.querySelectorAll("section[id]")
    if (sections.length === 0) return

    const updateHash = () => {
      // Find the section with the highest visibility ratio
      let maxRatio = 0
      let activeId: string | null = null

      visibleSections.current.forEach((ratio, id) => {
        if (ratio > maxRatio) {
          maxRatio = ratio
          activeId = id
        }
      })

      // Update URL hash without scrolling or adding history entry
      const currentHash = window.location.hash.slice(1)
      if (activeId && activeId !== currentHash && maxRatio > 0.3) {
        window.history.replaceState(null, "", `#${activeId}`)
      } else if (!activeId || maxRatio < 0.1) {
        // Clear hash when no section is sufficiently visible
        if (currentHash) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search)
        }
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id
          if (entry.isIntersecting) {
            visibleSections.current.set(id, entry.intersectionRatio)
          } else {
            visibleSections.current.delete(id)
          }
        })
        updateHash()
      },
      {
        root: container,
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
      }
    )

    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [containerSelector])
}
