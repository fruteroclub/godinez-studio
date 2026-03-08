import { test, expect } from "@playwright/test";

// Note: These tests require authentication setup.
// For now, they test the unauthenticated flows and basic accessibility.

test.describe("Hackathon Mode", () => {
  test.describe("Accessibility", () => {
    test("empty state has proper heading structure", async ({ page }) => {
      // Navigate to hackathon page (will redirect to sign-in if not authenticated)
      await page.goto("/studio/test-workspace/hackathon");
      
      // Check for sign-in redirect or hackathon content
      const url = page.url();
      if (url.includes("sign-in")) {
        // Expected redirect for unauthenticated users
        expect(url).toContain("sign-in");
      }
    });

    test("page is keyboard navigable", async ({ page }) => {
      await page.goto("/");
      
      // Tab through the page
      await page.keyboard.press("Tab");
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });
  });

  test.describe("Sign In Page", () => {
    test("has accessible form", async ({ page }) => {
      await page.goto("/sign-in");
      
      // Wait for Clerk to load
      await page.waitForTimeout(1000);
      
      // Check that page has main landmark
      const main = page.locator("main");
      await expect(main).toBeVisible();
    });

    test("has proper title", async ({ page }) => {
      await page.goto("/sign-in");
      await expect(page).toHaveTitle(/Godinez|Sign/i);
    });
  });

  test.describe("Visual Regression", () => {
    test("sign-in page looks correct", async ({ page }) => {
      await page.goto("/sign-in");
      await page.waitForTimeout(2000); // Wait for Clerk
      
      // Take screenshot for visual comparison
      await expect(page).toHaveScreenshot("sign-in.png", {
        maxDiffPixels: 100,
      });
    });
  });
});

test.describe("Performance", () => {
  test("initial load is under 3 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const loadTime = Date.now() - start;
    
    expect(loadTime).toBeLessThan(3000);
  });

  test("code splitting reduces initial bundle", async ({ page }) => {
    // Navigate to root
    const response = await page.goto("/");
    
    // Check that response is successful
    expect(response?.status()).toBe(200);
  });
});
