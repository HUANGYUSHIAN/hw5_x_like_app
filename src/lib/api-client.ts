/**
 * API 客戶端工具
 * 在 localStorage 模式下，自動添加用戶認證資訊
 */

import { getLocalSession, shouldUseLocalStorage } from './local-session-storage'

/**
 * 創建帶有認證資訊的 fetch 請求
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers)

  // 如果在 localStorage 模式下，添加用戶資訊到 header
  if (shouldUseLocalStorage()) {
    const session = getLocalSession()
    if (session) {
      headers.set('X-User-Id', session.id)
      headers.set('X-User-UserId', session.userId)
    }
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Always include cookies
  })
}







