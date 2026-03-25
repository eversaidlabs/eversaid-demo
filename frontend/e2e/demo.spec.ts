import { test, expect } from "@playwright/test"
import { setupDemoMocks, setupUploadModeMocks, clickAnalysisTab } from "./mocks/setup-mocks"

test.describe("Demo Page", () => {
  test.beforeEach(async ({ page }) => {
    // Setup all API mocks before navigation
    // Demo entries are now regular entries created by PostgreSQL trigger
    // They're identified by filename pattern "demo-*.mp3"
    await setupDemoMocks(page)
    // Use ?entry=demo-en to load the demo entry via standard /api/entries/{id}
    await page.goto("/en/demo?entry=demo-en")
  })

  test("loads with transcript visible", async ({ page }) => {
    // Audio player - target by the play icon container (button with Play/Pause icon)
    await expect(
      page
        .locator("button")
        .filter({ has: page.locator("svg[class*='fill-white']") })
        .first()
    ).toBeVisible()

    // Transcript sections visible
    await expect(page.getByText("Raw Transcription")).toBeVisible()
    await expect(page.getByText("AI Cleaned")).toBeVisible()

    // At least one segment visible
    await expect(page.getByText("Speaker 1").first()).toBeVisible()
  })

  test("audio player controls work", async ({ page }) => {
    // Find play button by the gradient background container
    const playButton = page
      .locator("button")
      .filter({ has: page.locator("svg[class*='fill-white']") })
      .first()

    await expect(playButton).toBeVisible()
    await playButton.click()

    // After click, button should still be there (now showing pause icon)
    await expect(playButton).toBeVisible()
  })

  test("can toggle diff view", async ({ page }) => {
    // Find the diff toggle button by its aria-label (button with Eye icon)
    // After refactor, controls are directly accessible (no expand overlay)
    const diffButton = page.getByRole("button", { name: /hide changes/i })

    await expect(diffButton).toBeVisible()

    // Check initial state - button should be pressed (diff is on)
    await expect(diffButton).toHaveAttribute("aria-pressed", "true")

    // Toggle off
    await diffButton.click()

    // After toggle, button label changes to "Show changes" and aria-pressed is false
    const diffButtonOff = page.getByRole("button", { name: /show changes/i })
    await expect(diffButtonOff).toHaveAttribute("aria-pressed", "false")

    // Toggle back on
    await diffButtonOff.click()
    await expect(diffButton).toHaveAttribute("aria-pressed", "true")
  })

  test("transcript export menu works", async ({ page }) => {
    // Export button opens a dropdown menu with Copy/Download options
    const exportButton = page.getByRole("button", { name: "Export" }).first()
    await expect(exportButton).toBeVisible()

    // Click to open dropdown
    await exportButton.click()

    // Copy option should be visible in the dropdown
    const copyButton = page.getByRole("button", { name: "Copy" }).first()
    await expect(copyButton).toBeVisible()

    // Click should not throw
    await copyButton.click()
  })

  test("analysis section displays content", async ({ page }) => {
    // Switch to Analysis tab (UI now uses tabs: Transcript | Analysis)
    await clickAnalysisTab(page)

    // Analysis section header
    await expect(page.getByText("AI Analysis")).toBeVisible()

    // The section should be visible, either showing loading, empty state, or content
  })

  test("sidebar elements are visible in transcript mode", async ({ page }) => {
    // In transcript mode, floating feedback widget is visible (collapsed state)
    // After refactor, FeedbackCard was replaced with FloatingFeedbackWidget
    await expect(page.getByText("We want to hear your feedback")).toBeVisible()

    // Waitlist CTA (appears in various places)
    await expect(page.getByText(/waitlist/i).first()).toBeVisible()
  })
})

test.describe("Demo Page - Upload Mode", () => {
  test("sidebar elements are visible in upload mode", async ({ page }) => {
    // Setup mocks for upload mode (empty entry history)
    // Simulates fresh user before demo entry is created by trigger
    await setupUploadModeMocks(page)
    await page.goto("/en/demo")

    // History card - visible in upload mode
    await expect(page.getByText("Your Transcriptions")).toBeVisible()
  })

  test("browser back button returns to upload view (page.goto)", async ({ page }) => {
    // Setup mocks for upload mode (empty entry history)
    await setupUploadModeMocks(page)

    // 1. Start on upload view
    await page.goto("/en/demo")
    await expect(page.getByText("Your Transcriptions")).toBeVisible()

    // 2. Load an entry (navigate to transcript view)
    await setupDemoMocks(page)
    await page.goto("/en/demo?entry=demo-en")

    // Verify we're on transcript view
    await expect(page.getByText("Raw Transcription")).toBeVisible()
    await expect(page.getByText("AI Cleaned")).toBeVisible()

    // 3. Click browser back button
    await page.goBack()

    // 4. Verify we're back on upload view
    await expect(page).toHaveURL("/en/demo")
    await expect(page.getByText("Your Transcriptions")).toBeVisible()

    // 5. Verify transcript is NOT visible
    await expect(page.getByText("Raw Transcription")).not.toBeVisible()
  })

  test("browser back button returns to upload view (client-side navigation)", async ({ page }) => {
    // This test simulates the real user flow: clicking on entry in sidebar
    // which triggers client-side navigation via router.push()

    // Setup mocks with entries in history
    await setupDemoMocks(page)

    // 1. Start on upload view (no entry param)
    await page.goto("/en/demo")

    // Wait for the page to load and session to be ready
    await expect(page.getByText("Your Transcriptions")).toBeVisible()

    // 2. Click on entry in history sidebar (simulates real user flow)
    // Demo entries show a "Sample" badge - find the entry card containing this badge
    // The badge is inside a clickable entry card with cursor-pointer class
    const sampleBadge = page.getByText("Sample", { exact: true })
    await expect(sampleBadge).toBeVisible()
    // Click the parent entry card (which has the onClick handler)
    await sampleBadge.click()

    // Wait for transcript view to load (URL should update via router.push)
    await expect(page).toHaveURL(/entry=demo-en/, { timeout: 10000 })
    await expect(page.getByText("Raw Transcription")).toBeVisible()
    await expect(page.getByText("AI Cleaned")).toBeVisible()

    // 3. Click browser back button
    await page.goBack()

    // 4. Verify we're back on upload view
    await expect(page).toHaveURL("/en/demo")

    // 5. Verify transcript is NOT visible (this is the key assertion)
    await expect(page.getByText("Raw Transcription")).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByText("Your Transcriptions")).toBeVisible()
  })
})
