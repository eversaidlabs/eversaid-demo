import { test, expect } from "@playwright/test"

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en")
  })

  test("displays hero section with main CTA", async ({ page }) => {
    // Main headline - use heading role to avoid matching the page title
    const heading = page.getByRole("heading", { name: /Smart transcription/ })
    await expect(heading).toBeVisible()
    // The tagline is inside the heading as a styled span
    await expect(heading.getByText("AI listens. You decide.")).toBeVisible()

    // Subheadline
    await expect(page.getByText(/No more chunking transcripts into ChatGPT/)).toBeVisible()

    // Try Free Demo button
    const demoButton = page.getByRole("link", { name: "Try Free Demo" }).first()
    await expect(demoButton).toBeVisible()
  })

  test("Try Free Demo button navigates to demo page", async ({ page }) => {
    const demoButton = page.getByRole("link", { name: "Try Free Demo" }).first()
    await demoButton.click()

    await expect(page).toHaveURL("/en/demo")
    await expect(page.getByRole("heading", { name: "Try eversaid" })).toBeVisible()
  })

  test("navigation links are visible", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Features" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Use Cases" })).toBeVisible()
    await expect(page.getByRole("link", { name: "How It Works" })).toBeVisible()
    await expect(page.getByRole("link", { name: "API Docs" })).toBeVisible()
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

  test("displays What's Next section", async ({ page }) => {
    await expect(page.getByText("What's Next")).toBeVisible()
    await expect(page.getByText("Conversation Intelligence")).toBeVisible()
    await expect(page.getByText(/Ask questions across months of sessions/)).toBeVisible()
  })

  test("footer contains expected links", async ({ page }) => {
    await expect(page.getByText(/© \d{4} EverSaid/)).toBeVisible()
    await expect(page.getByRole("link", { name: "Privacy Policy" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Terms" })).toBeVisible()
    await expect(page.getByRole("link", { name: "hello@eversaid.ai" })).toBeVisible()
  })

  test("Join waitlist link opens waitlist modal", async ({ page }) => {
    // Scroll to the What's Next section at the bottom
    const ctaSection = page.getByText("Conversation Intelligence")
    await ctaSection.scrollIntoViewIfNeeded()

    // Click the "Join Waitlist for Early Access" button
    const waitlistLink = page.locator("button").filter({ hasText: "Join Waitlist for Early Access" })
    await waitlistLink.click()

    // Modal should open
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Get Early Access" })).toBeVisible()
    await expect(page.getByLabel(/Email Address/)).toBeVisible()
  })
})
