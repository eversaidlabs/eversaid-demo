import { test, expect } from "@playwright/test"

test.describe("Waitlist Flow - Network Integration", () => {
  test("landing page waitlist signup calls the API", async ({ page }) => {
    await page.goto("/en")

    // Set up request interception BEFORE triggering the action
    const waitlistRequestPromise = page.waitForRequest(
      req => req.url().includes('/api/waitlist') && req.method() === 'POST',
      { timeout: 5000 }
    )

    // Open waitlist modal
    await page.getByText("Conversation Intelligence").scrollIntoViewIfNeeded()
    await page.locator("button").filter({ hasText: "Join Waitlist for Early Access" }).click()

    // Fill the form
    await page.getByLabel(/Email Address/).fill("network-test@example.com")
    await page.getByLabel(/Language you need most/).selectOption("en")
    await page.getByLabel(/How will you use EverSaid/i).fill("Testing API integration")

    // Submit
    await page.getByRole("dialog").getByRole("button", { name: "Get Early Access" }).click()

    // Verify API was actually called with correct payload
    const request = await waitlistRequestPromise
    const postData = request.postDataJSON()
    expect(postData.email).toBe("network-test@example.com")
    expect(postData.waitlist_type).toBe("conversation_intelligence")
    expect(postData.use_case).toBe("Testing API integration")
    expect(postData.language_preference).toBe("en")
  })

  test("API docs waitlist signup calls the API", async ({ page }) => {
    await page.goto("/en/api-docs")

    // Set up request interception
    const waitlistRequestPromise = page.waitForRequest(
      req => req.url().includes('/api/waitlist') && req.method() === 'POST',
      { timeout: 5000 }
    )

    // Open waitlist modal
    await page.getByRole("navigation").getByRole("button", { name: "Join Waitlist" }).click()

    // Fill the form
    await page.getByLabel(/Email Address/).fill("api-network-test@example.com")
    await page.getByLabel(/Language you need most/).selectOption("fr")
    await page.getByLabel(/What will you build/).fill("Voice journal app")
    await page.getByLabel(/Expected monthly volume/).selectOption("100-500")

    // Submit
    await page.getByRole("dialog").getByRole("button", { name: "Get Early Access" }).click()

    // Verify API was actually called with correct payload
    const request = await waitlistRequestPromise
    const postData = request.postDataJSON()
    expect(postData.email).toBe("api-network-test@example.com")
    expect(postData.waitlist_type).toBe("api_access")
    expect(postData.use_case).toBe("Voice journal app")
    expect(postData.language_preference).toBe("fr")
  })

  test("Other language option sends custom language in payload", async ({ page }) => {
    await page.goto("/en")

    // Set up request interception
    const waitlistRequestPromise = page.waitForRequest(
      req => req.url().includes('/api/waitlist') && req.method() === 'POST',
      { timeout: 5000 }
    )

    // Open waitlist modal
    await page.getByText("Conversation Intelligence").scrollIntoViewIfNeeded()
    await page.locator("button").filter({ hasText: "Join Waitlist for Early Access" }).click()

    // Fill the form
    await page.getByLabel(/Email Address/).fill("other-lang@example.com")
    await page.getByLabel(/Language you need most/).selectOption("other")

    // Fill the "Other" text input that appears
    await page.getByPlaceholder(/Japanese, Arabic, Mandarin/).fill("Japanese")

    await page.getByLabel(/How will you use EverSaid/i).fill("Testing other language")

    // Submit
    await page.getByRole("dialog").getByRole("button", { name: "Get Early Access" }).click()

    // Verify payload contains "other: Japanese"
    const request = await waitlistRequestPromise
    const postData = request.postDataJSON()
    expect(postData.language_preference).toBe("other: Japanese")
  })
})

test.describe("Waitlist Flow - Regular (Extended Usage)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en")
  })

  test("complete waitlist signup flow from landing page", async ({ page }) => {
    // Scroll to and click the waitlist link
    await page.getByText("Conversation Intelligence").scrollIntoViewIfNeeded()
    await page.locator("button").filter({ hasText: "Join Waitlist for Early Access" }).click()

    // Modal opens
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(page.getByRole("heading", { name: "Get Early Access" })).toBeVisible()

    // Fill the form
    await page.getByLabel(/Email Address/).fill("test@example.com")
    await page.getByLabel(/Language you need most/).selectOption("sl")
    await page.getByLabel(/How will you use EverSaid/i).fill("Meeting transcription for my team")

    // Optional: How did you hear about us
    await page.getByLabel(/How did you hear about us/).fill("Twitter")

    // Submit - use the button inside the dialog form
    await page.getByRole("dialog").getByRole("button", { name: "Get Early Access" }).click()

    // Success state
    await expect(page.getByText("You're on the list!")).toBeVisible()
    await expect(page.getByText(/We'll email you when your spot is ready/)).toBeVisible()
  })

  test("can close modal with Done button after signup", async ({ page }) => {
    // Open waitlist modal
    await page.getByText("Conversation Intelligence").scrollIntoViewIfNeeded()
    await page.locator("button").filter({ hasText: "Join Waitlist for Early Access" }).click()

    // Fill and submit
    await page.getByLabel(/Email Address/).fill("close-test@example.com")
    await page.getByLabel(/Language you need most/).selectOption("en")
    await page.getByLabel(/How will you use EverSaid/i).fill("Testing close")
    await page.getByRole("dialog").getByRole("button", { name: "Get Early Access" }).click()

    // Wait for success
    await expect(page.getByText("You're on the list!")).toBeVisible()

    // Click Done
    await page.getByRole("button", { name: "Done" }).click()

    // Modal should close
    await expect(page.getByRole("dialog")).not.toBeVisible()
  })

  test("can close modal with X button", async ({ page }) => {
    // Open waitlist modal
    await page.getByText("Conversation Intelligence").scrollIntoViewIfNeeded()
    await page.locator("button").filter({ hasText: "Join Waitlist for Early Access" }).click()

    await expect(page.getByRole("dialog")).toBeVisible()

    // Click X button
    await page.getByRole("button", { name: "Close dialog" }).click()

    // Modal should close
    await expect(page.getByRole("dialog")).not.toBeVisible()
  })

  test("form validates required fields", async ({ page }) => {
    // Open waitlist modal
    await page.getByText("Conversation Intelligence").scrollIntoViewIfNeeded()
    await page.locator("button").filter({ hasText: "Join Waitlist for Early Access" }).click()

    await expect(page.getByRole("dialog")).toBeVisible()

    // Try to submit without filling required fields
    await page.getByRole("dialog").getByRole("button", { name: "Get Early Access" }).click()

    // Form should not submit (modal still visible with form)
    await expect(page.getByLabel(/Email Address/)).toBeVisible()
    await expect(page.getByText("You're on the list!")).not.toBeVisible()
  })
})

test.describe("Waitlist Flow - API Access", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/api-docs")
  })

  test("complete API waitlist signup flow", async ({ page }) => {
    // Click Join Waitlist button in nav
    await page.getByRole("navigation").getByRole("button", { name: "Join Waitlist" }).click()

    // Modal opens with API-specific content
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(page.getByText("Join API Waitlist")).toBeVisible()

    // Fill the form - API version has different labels
    await page.getByLabel(/Email Address/).fill("api-test@example.com")
    await page.getByLabel(/Language you need most/).selectOption("de")
    await page.getByLabel(/What will you build/).fill("Voice journal mobile app")

    // API-specific: Expected monthly volume dropdown
    await page.getByLabel(/Expected monthly volume/).selectOption("100-500")

    // Optional source field
    await page.getByLabel(/How did you hear about us/).fill("Search")

    // Submit - use the button inside the dialog
    await dialog.getByRole("button", { name: "Get Early Access" }).click()

    // Success state
    await expect(page.getByText("You're on the list!")).toBeVisible()
  })

  test("API waitlist shows volume dropdown", async ({ page }) => {
    await page.getByRole("navigation").getByRole("button", { name: "Join Waitlist" }).click()

    await expect(page.getByRole("dialog")).toBeVisible()

    // Volume dropdown should be visible (API-specific field)
    const volumeSelect = page.getByLabel(/Expected monthly volume/)
    await expect(volumeSelect).toBeVisible()

    // Check options exist - use combobox role for select element
    const options = page.getByRole("dialog").locator("select option")
    await expect(options.filter({ hasText: "0-100 hours" })).toBeAttached()
    await expect(options.filter({ hasText: "2,000+ hours" })).toBeAttached()
  })
})
