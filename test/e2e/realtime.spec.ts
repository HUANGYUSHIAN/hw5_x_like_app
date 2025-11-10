import { test, expect } from '@playwright/test'

test.describe('Real-time Updates (Pusher)', () => {
  test('should update like count in real-time', async ({ browser }) => {
    // Create two browser contexts to simulate two users
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    // Both users navigate to home page
    await page1.goto('http://localhost:3000')
    await page2.goto('http://localhost:3000')
    
    // Wait for posts to load
    await page1.waitForTimeout(2000)
    await page2.waitForTimeout(2000)
    
    // User 1 finds a post and gets initial like count
    const likeButton1 = page1.locator('button').filter({ hasText: /Favorite/i }).first()
    if (await likeButton1.isVisible()) {
      const initialCount = await likeButton1.textContent()
      
      // User 2 likes the same post
      const likeButton2 = page2.locator('button').filter({ hasText: /Favorite/i }).first()
      if (await likeButton2.isVisible()) {
        await likeButton2.click()
        
        // Wait for real-time update
        await page1.waitForTimeout(2000)
        
        // User 1 should see updated like count
        const updatedCount = await likeButton1.textContent()
        expect(updatedCount).not.toBe(initialCount)
      }
    }
    
    await context1.close()
    await context2.close()
  })

  test('should update comment count in real-time', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    await page1.goto('http://localhost:3000')
    await page2.goto('http://localhost:3000')
    
    await page1.waitForTimeout(2000)
    await page2.waitForTimeout(2000)
    
    // User 1 opens a post
    const firstPost1 = page1.locator('[data-testid="post-card"]').first()
    if (await firstPost1.isVisible()) {
      await firstPost1.click()
      await page1.waitForURL(/\/posts\/.*/)
      
      // Get initial comment count
      const commentCount1 = page1.locator('text=/\\d+ Comments?/').first()
      const initialCount = await commentCount1.textContent()
      
      // User 2 comments on the same post
      const firstPost2 = page2.locator('[data-testid="post-card"]').first()
      if (await firstPost2.isVisible()) {
        await firstPost2.click()
        await page2.waitForURL(/\/posts\/.*/)
        
        const commentInput = page2.getByPlaceholder('Post your reply')
        if (await commentInput.isVisible()) {
          await commentInput.fill('Real-time test comment')
          await page2.getByRole('button', { name: 'Reply' }).click()
          
          // Wait for real-time update
          await page1.waitForTimeout(2000)
          
          // User 1 should see updated comment count
          const updatedCount = await commentCount1.textContent()
          expect(updatedCount).not.toBe(initialCount)
        }
      }
    }
    
    await context1.close()
    await context2.close()
  })
})











