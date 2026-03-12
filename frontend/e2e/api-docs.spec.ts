import { test, expect } from "@playwright/test"
import { setupApiDocsMocks } from "./mocks/setup-mocks"

test.describe("API Docs Page", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiDocsMocks(page)
    await page.goto("/en/api-docs")
  })

  test("navigation bar has correct links", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Demo" })).toBeVisible()
    await expect(page.getByRole("link", { name: "API Docs" })).toBeVisible()
  })

  test("Home link navigates to landing page", async ({ page }) => {
    await page.getByRole("link", { name: "Home" }).click()
    await expect(page).toHaveURL("/en")
  })

  test("Demo link navigates to demo page", async ({ page }) => {
    // Use first() to handle multiple Demo links on the page
    await page.getByRole("link", { name: "Demo" }).first().click()
    await expect(page).toHaveURL("/en/demo")
  })

  test("Join Waitlist button opens API waitlist modal", async ({ page }) => {
    // Use the button in the navigation bar specifically
    const joinButton = page.getByRole("navigation").getByRole("button", { name: "Join Waitlist" })
    await expect(joinButton).toBeVisible()
    await joinButton.click()

    // Modal should open with API-specific content
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByText("Join API Waitlist")).toBeVisible()
    await expect(page.getByText("Get early access to integrate eversaid")).toBeVisible()
  })

  test("displays API endpoint documentation", async ({ page }) => {
    // Check for common API documentation elements
    await expect(page.getByText("POST").first()).toBeVisible()

    // Check for endpoint sections
    await expect(page.getByText("Upload").first()).toBeVisible()
  })
})
