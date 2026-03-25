import { test, expect } from "@playwright/test"

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en")
  })

  test("displays hero section with main CTA", async ({ page }) => {
    // Main headline - "Transcribe. Clean up. Verify every change."
    const heading = page.getByRole("heading", { name: /Transcribe.*Clean up/i })
    await expect(heading).toBeVisible()
    // The accent part of the heading
    await expect(heading.getByText(/Verify every change/i)).toBeVisible()

    // Eyebrow text (use first() to avoid matching the footer description)
    await expect(page.getByText(/AI Transcription.*Cleanup.*Verification/i).first()).toBeVisible()

    // Try Free Demo button
    const demoButton = page.getByRole("link", { name: "Try Free Demo" }).first()
    await expect(demoButton).toBeVisible()
  })

  test("Try Free Demo button navigates to demo page", async ({ page }) => {
    const demoButton = page.getByRole("link", { name: "Try Free Demo" }).first()
    await expect(demoButton).toBeVisible()
    await demoButton.click()

    // Wait for navigation to complete
    await page.waitForURL("/en/demo")
    await expect(page.getByRole("heading", { name: "Try eversaid" })).toBeVisible()
  })

  test("navigation links are visible", async ({ page }) => {
    const nav = page.getByRole("navigation")
    await expect(nav.getByRole("link", { name: "Features" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Use Cases" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "How It Works" })).toBeVisible()
    // Scope to nav to avoid duplicate with footer link
    await expect(nav.getByRole("link", { name: "API Docs" })).toBeVisible()
  })

  test("displays feature sections", async ({ page }) => {
    // See the Difference section - use exact match
    await expect(page.getByText("See the Difference", { exact: true })).toBeVisible()
    await expect(page.getByText("Every edit visible. Every word verifiable.")).toBeVisible()

    // Features section
    await expect(page.getByText("What You Get")).toBeVisible()

    // Use Cases section
    await expect(page.getByText("Who It's For")).toBeVisible()

    // How It Works section - use heading role to be specific
    await expect(page.getByRole("heading", { name: "How It Works" })).toBeVisible()
  })

  test("displays Knowledge Bridge section", async ({ page }) => {
    // Section was renamed from "What's Next" to "Knowledge Bridge"
    await expect(page.getByText("Coming Soon", { exact: true })).toBeVisible()
    await expect(page.getByText(/Every session you process becomes searchable knowledge/)).toBeVisible()
    await expect(page.getByText(/Search by meaning, not keywords/)).toBeVisible()
  })

  test("footer contains expected links", async ({ page }) => {
    const footer = page.locator("footer")
    await expect(page.getByText(/© \d{4} EverSaid/)).toBeVisible()
    // Footer links are "Privacy" and "Terms" (not "Privacy Policy")
    await expect(footer.getByRole("link", { name: "Privacy" })).toBeVisible()
    await expect(footer.getByRole("link", { name: "Terms" })).toBeVisible()
    await expect(footer.getByRole("link", { name: "hello@eversaid.ai" })).toBeVisible()
  })

  test("Get Early Access button opens waitlist modal", async ({ page }) => {
    // Click the "Get Full Access" / "Get Early Access" button in the hero section
    const waitlistButton = page.getByRole("button", { name: /Get.*Access/i }).first()
    await waitlistButton.click()

    // Modal should open
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Get Early Access" })).toBeVisible()
    await expect(page.getByLabel(/Email Address/)).toBeVisible()
  })
})
