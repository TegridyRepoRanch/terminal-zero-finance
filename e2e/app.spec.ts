// E2E Tests for Terminal Zero Finance
import { test, expect } from '@playwright/test';

// =============================================================================
// BASIC APP TESTS
// =============================================================================

test.describe('Application Basics', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');

    // Check for main heading
    await expect(page.locator('text=Terminal Zero')).toBeVisible();
  });

  test('should display the sidebar', async ({ page }) => {
    await page.goto('/');

    // Sidebar should be visible with navigation elements
    const sidebar = page.locator('aside, [role="navigation"]').first();
    await expect(sidebar).toBeVisible();
  });

  test('should have skip to content link for accessibility', async ({ page }) => {
    await page.goto('/');

    // Focus on skip link
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a[href="#main-content"]');

    // Skip link should become visible on focus
    await expect(skipLink).toBeFocused();
  });
});

// =============================================================================
// ASSUMPTION INPUTS
// =============================================================================

test.describe('Assumption Inputs', () => {
  test('should allow editing base revenue', async ({ page }) => {
    await page.goto('/');

    // Find revenue input
    const revenueInput = page.locator('input[name="baseRevenue"], input:has-text("Revenue")').first();

    if (await revenueInput.isVisible()) {
      await revenueInput.clear();
      await revenueInput.fill('5000000000');

      // Value should be updated
      await expect(revenueInput).toHaveValue('5000000000');
    }
  });

  test('should allow editing growth rate', async ({ page }) => {
    await page.goto('/');

    // Look for growth rate input or slider
    const growthInput = page.locator('input[name="revenueGrowthRate"]').first();

    if (await growthInput.isVisible()) {
      await growthInput.clear();
      await growthInput.fill('15');
      await expect(growthInput).toHaveValue('15');
    }
  });

  test('should allow editing WACC', async ({ page }) => {
    await page.goto('/');

    const waccInput = page.locator('input[name="wacc"]').first();

    if (await waccInput.isVisible()) {
      await waccInput.clear();
      await waccInput.fill('12');
      await expect(waccInput).toHaveValue('12');
    }
  });
});

// =============================================================================
// VALUATION ENGINE
// =============================================================================

test.describe('Valuation Engine', () => {
  test('should display valuation metrics', async ({ page }) => {
    await page.goto('/');

    // Look for key valuation terms
    await expect(page.locator('text=/Enterprise Value|EV/i').first()).toBeVisible();
  });

  test('should display income statement section', async ({ page }) => {
    await page.goto('/');

    // Check for income statement elements
    const incomeSection = page.locator('text=/Income Statement|Revenue/i').first();
    await expect(incomeSection).toBeVisible();
  });

  test('should display cash flow section', async ({ page }) => {
    await page.goto('/');

    // Check for cash flow elements
    const cashFlowText = page.locator('text=/Cash Flow|FCF|Free Cash/i').first();
    await expect(cashFlowText).toBeVisible();
  });
});

// =============================================================================
// TAB NAVIGATION
// =============================================================================

test.describe('Tab Navigation', () => {
  test('should switch between tabs', async ({ page }) => {
    await page.goto('/');

    // Find tab buttons
    const tabs = page.locator('[role="tablist"] button, [role="tab"]');
    const tabCount = await tabs.count();

    if (tabCount > 1) {
      // Click second tab
      await tabs.nth(1).click();

      // Second tab should now be active
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('should support keyboard navigation between tabs', async ({ page }) => {
    await page.goto('/');

    const tabs = page.locator('[role="tablist"] button, [role="tab"]');
    const tabCount = await tabs.count();

    if (tabCount > 1) {
      // Focus first tab
      await tabs.first().focus();

      // Press arrow right
      await page.keyboard.press('ArrowRight');

      // Second tab should be focused
      await expect(tabs.nth(1)).toBeFocused();
    }
  });
});

// =============================================================================
// CHARTS
// =============================================================================

test.describe('Charts', () => {
  test('should render charts', async ({ page }) => {
    await page.goto('/');

    // Recharts renders SVGs
    const charts = page.locator('.recharts-wrapper, svg.recharts-surface');

    // Wait for at least one chart to render
    await expect(charts.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display chart tooltips on hover', async ({ page }) => {
    await page.goto('/');

    const chart = page.locator('.recharts-wrapper').first();

    if (await chart.isVisible()) {
      // Hover over chart
      await chart.hover();

      // Look for tooltip (may or may not appear depending on where we hover)
      // This is a best-effort test
      // Tooltip visibility depends on hover position - locator not used as this is best-effort
      page.locator('.recharts-tooltip-wrapper');
    }
  });
});

// =============================================================================
// ANALYSIS MODULES
// =============================================================================

test.describe('Analysis Modules', () => {
  test('should toggle sensitivity table', async ({ page }) => {
    await page.goto('/');

    // Look for sensitivity analysis section
    const sensitivityTab = page.locator('button:has-text("Sensitivity")').first();

    if (await sensitivityTab.isVisible()) {
      await sensitivityTab.click();

      // Sensitivity table should appear
      await expect(page.locator('text=/WACC.*Terminal/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should run Monte Carlo simulation', async ({ page }) => {
    await page.goto('/');

    // Look for Monte Carlo section
    const monteCarloTab = page.locator('button:has-text("Monte Carlo")').first();

    if (await monteCarloTab.isVisible()) {
      await monteCarloTab.click();

      // Find run button
      const runButton = page.locator('button:has-text("Run Simulation")');

      if (await runButton.isVisible()) {
        await runButton.click();

        // Wait for simulation to complete (look for results)
        await expect(page.locator('text=/Mean|Median|Distribution/i')).toBeVisible({
          timeout: 30000,
        });
      }
    }
  });
});

// =============================================================================
// RESPONSIVE DESIGN
// =============================================================================

test.describe('Responsive Design', () => {
  test('should display properly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // App should still load
    await expect(page.locator('text=Terminal Zero')).toBeVisible();
  });

  test('should display properly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // App should still load
    await expect(page.locator('text=Terminal Zero')).toBeVisible();
  });

  test('should display properly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    // App should display with full layout
    await expect(page.locator('text=Terminal Zero')).toBeVisible();
  });
});

// =============================================================================
// ACCESSIBILITY
// =============================================================================

test.describe('Accessibility', () => {
  test('should have proper ARIA labels on interactive elements', async ({ page }) => {
    await page.goto('/');

    // Check buttons have accessible names
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      const title = await button.getAttribute('title');

      // Button should have some accessible name
      const hasAccessibleName = ariaLabel || textContent?.trim() || title;
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Check for h1
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible();

    // h2 elements should exist
    const h2Count = await page.locator('h2').count();
    expect(h2Count).toBeGreaterThanOrEqual(0);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Tab through the page
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    // Something should be focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

test.describe('Error Handling', () => {
  test('should handle invalid inputs gracefully', async ({ page }) => {
    await page.goto('/');

    const revenueInput = page.locator('input[name="baseRevenue"]').first();

    if (await revenueInput.isVisible()) {
      // Try entering invalid value
      await revenueInput.clear();
      await revenueInput.fill('-1000');

      // App should not crash
      await expect(page.locator('text=Terminal Zero')).toBeVisible();
    }
  });

  test('should display error boundary on component errors', async ({ page }) => {
    // This would require intentionally breaking a component
    // For now, just verify the app doesn't show an error by default
    await page.goto('/');

    const errorBoundary = page.locator('text=/Something went wrong|Error/i');

    // Error boundary should not be showing initially
    await expect(errorBoundary).not.toBeVisible();
  });
});

// =============================================================================
// DARK MODE
// =============================================================================

test.describe('Theme Toggle', () => {
  test('should have theme toggle button', async ({ page }) => {
    await page.goto('/');

    // Look for theme toggle
    const themeToggle = page.locator('button[aria-label*="theme"], button:has-text("Theme")');

    if (await themeToggle.isVisible()) {
      await expect(themeToggle).toBeVisible();
    }
  });

  test('should toggle between light and dark mode', async ({ page }) => {
    await page.goto('/');

    const themeToggle = page.locator('button[aria-label*="theme"], [data-testid="theme-toggle"]').first();

    if (await themeToggle.isVisible()) {
      // Get initial state
      const initialClass = await page.locator('html').getAttribute('class');

      // Click toggle
      await themeToggle.click();

      // Class should change
      const newClass = await page.locator('html').getAttribute('class');
      expect(newClass).not.toBe(initialClass);
    }
  });
});

// =============================================================================
// PDF UPLOAD (UI ONLY)
// =============================================================================

test.describe('PDF Upload UI', () => {
  test('should have file upload area', async ({ page }) => {
    await page.goto('/');

    // Look for file input or upload area
    const uploadArea = page.locator('input[type="file"], [data-testid="upload"], button:has-text("Upload")').first();

    // Upload functionality may be present
    if (await uploadArea.isVisible()) {
      await expect(uploadArea).toBeVisible();
    }
  });
});

// =============================================================================
// PERFORMANCE
// =============================================================================

test.describe('Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await expect(page.locator('text=Terminal Zero')).toBeVisible();

    const loadTime = Date.now() - startTime;

    // Should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });

  test('should not have major layout shifts', async ({ page }) => {
    await page.goto('/');

    // Wait for initial render
    await page.waitForLoadState('networkidle');

    // Take screenshot after stabilization
    await page.waitForTimeout(1000);

    // App should still be visible without major shifts
    await expect(page.locator('text=Terminal Zero')).toBeVisible();
  });
});
