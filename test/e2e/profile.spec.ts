import { test, expect } from '@playwright/test'

test.describe('Profile', () => {
  test('should view user profile', async ({ page }) => {
    await page.goto('http://localhost:3000')
    
    // Click on a user's name or avatar
    const userLink = page.locator('a').filter({ hasText: /@\w+/ }).first()
    if (await userLink.isVisible()) {
      await userLink.click()
      
      // Should navigate to profile page
      await page.waitForURL(/\/\w+/)
      
      // Check if profile elements are visible
      await expect(page.getByRole('heading', { level: 5 })).toBeVisible() // User name
      await expect(page.getByText(/@\w+/)).toBeVisible() // User ID
    }
  })

  test('should follow/unfollow user', async ({ page }) => {
    // Navigate to a profile page (not own profile)
    await page.goto('http://localhost:3000')
    
    // Find a user profile link
    const userLink = page.locator('a').filter({ hasText: /@\w+/ }).first()
    if (await userLink.isVisible()) {
      await userLink.click()
      await page.waitForURL(/\/\w+/)
      
      // Find follow button
      const followButton = page.getByRole('button', { name: /Follow|Unfollow/i })
      if (await followButton.isVisible()) {
        const initialText = await followButton.textContent()
        
        // Click follow
        await followButton.click()
        
        // Wait for update
        await page.waitForTimeout(1000)
        
        // Verify button text changed
        const newText = await followButton.textContent()
        expect(newText).not.toBe(initialText)
      }
    }
  })

  test('should edit own profile', async ({ page }) => {
    // Assume user is logged in and on their own profile
    await page.goto('http://localhost:3000')
    
    // Navigate to own profile (you may need to adjust this)
    const profileLink = page.getByText(/Profile/i)
    if (await profileLink.isVisible()) {
      await profileLink.click()
      
      // Find edit profile button
      const editButton = page.getByRole('button', { name: /Edit Profile/i })
      if (await editButton.isVisible()) {
        await editButton.click()
        
        // Wait for edit dialog
        await expect(page.getByRole('dialog')).toBeVisible()
        await expect(page.getByLabel('Name')).toBeVisible()
        await expect(page.getByLabel('Bio')).toBeVisible()
        
        // Edit name
        const nameInput = page.getByLabel('Name')
        await nameInput.clear()
        await nameInput.fill('Updated Name')
        
        // Save
        await page.getByRole('button', { name: 'Save' }).click()
        
        // Verify name updated
        await expect(page.getByText('Updated Name')).toBeVisible()
      }
    }
  })
})











