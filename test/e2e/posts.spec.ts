import { test, expect } from '@playwright/test'

test.describe('Posts', () => {
  test.beforeEach(async ({ page }) => {
    // Assume user is logged in for these tests
    // You may need to set up authentication first
    await page.goto('http://localhost:3000')
  })

  test('should create a new post', async ({ page }) => {
    // Click compose button
    const composeButton = page.getByRole('button', { name: /What's happening/i })
    if (await composeButton.isVisible()) {
      await composeButton.click()
      
      // Wait for composer dialog
      await expect(page.getByRole('dialog')).toBeVisible()
      
      // Type post content
      const textarea = page.getByPlaceholder("What's happening?")
      await textarea.fill('This is a test post #test @testuser')
      
      // Check character count
      await expect(page.getByText(/\/280/)).toBeVisible()
      
      // Submit post
      await page.getByRole('button', { name: 'Post' }).click()
      
      // Wait for post to appear
      await expect(page.getByText('This is a test post')).toBeVisible()
    }
  })

  test('should like a post', async ({ page }) => {
    // Find first like button
    const likeButton = page.locator('button').filter({ hasText: /Favorite/i }).first()
    
    if (await likeButton.isVisible()) {
      const initialText = await likeButton.textContent()
      
      // Click like button
      await likeButton.click()
      
      // Wait for like count to update
      await page.waitForTimeout(1000)
      
      // Verify like count changed
      const newText = await likeButton.textContent()
      expect(newText).not.toBe(initialText)
    }
  })

  test('should comment on a post', async ({ page }) => {
    // Click on first post to view details
    const firstPost = page.locator('[data-testid="post-card"]').first()
    if (await firstPost.isVisible()) {
      await firstPost.click()
      
      // Wait for post detail page
      await page.waitForURL(/\/posts\/.*/)
      
      // Find comment input
      const commentInput = page.getByPlaceholder('Post your reply')
      if (await commentInput.isVisible()) {
        await commentInput.fill('This is a test comment')
        
        // Submit comment
        await page.getByRole('button', { name: 'Reply' }).click()
        
        // Wait for comment to appear
        await expect(page.getByText('This is a test comment')).toBeVisible()
      }
    }
  })

  test('should repost', async ({ page }) => {
    // Find first repost button
    const repostButton = page.locator('button').filter({ hasText: /Repeat/i }).first()
    
    if (await repostButton.isVisible()) {
      const initialCount = await repostButton.textContent()
      
      // Click repost button
      await repostButton.click()
      
      // Wait for repost count to update
      await page.waitForTimeout(1000)
      
      // Verify repost count changed
      const newCount = await repostButton.textContent()
      expect(newCount).not.toBe(initialCount)
    }
  })
})











