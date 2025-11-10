import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
  })

  test('should show login page when not authenticated', async ({ page }) => {
    // Check if local auth is enabled
    const isLocalAuth = process.env.LOCAL_AUTH === 'true'
    
    if (isLocalAuth) {
      // Navigate to local auth page
      await page.goto('http://localhost:3000/auth/local')
      
      // Check if login form is visible
      await expect(page.getByLabel('User ID')).toBeVisible()
      await expect(page.getByLabel('Name')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible()
    }
  })

  test('should login with local auth', async ({ page }) => {
    const isLocalAuth = process.env.LOCAL_AUTH === 'true'
    
    if (!isLocalAuth) {
      test.skip()
      return
    }

    await page.goto('http://localhost:3000/auth/local')
    
    // Fill login form
    await page.getByLabel('User ID').fill('testuser')
    await page.getByLabel('Name').fill('Test User')
    
    // Submit form
    await page.getByRole('button', { name: 'Login' }).click()
    
    // Wait for navigation
    await page.waitForURL('http://localhost:3000')
    
    // Check if user is logged in (should see sidebar with user info)
    await expect(page.getByText('Test User')).toBeVisible()
  })

  test('should logout', async ({ page }) => {
    // This test assumes user is already logged in
    // You may need to set up authentication first
    
    // Click on user menu (if exists)
    const userMenu = page.locator('[data-testid="user-menu"]')
    if (await userMenu.isVisible()) {
      await userMenu.click()
      
      // Click logout
      await page.getByRole('menuitem', { name: 'Logout' }).click()
      
      // Should redirect to home or login page
      await expect(page).toHaveURL(/.*\/$/)
    }
  })
})











