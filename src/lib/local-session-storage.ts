/**
 * 本地 Session 存儲工具
 * 用於開發模式下支持多分頁獨立登入
 * 每個分頁可以有不同的用戶，方便測試 Pusher 等功能
 */

const STORAGE_KEY_PREFIX = 'local-dev-session-'

/**
 * 獲取或創建當前分頁的唯一 ID
 * 用於區分不同分頁的 session
 * 
 * 注意：由於 localStorage 和 sessionStorage 在同源下都是共享的，
 * 我們使用一個基於 window.name 和時間戳的機制來生成唯一 ID。
 * 每個新分頁（或刷新後）都會生成一個新的 ID。
 */
function getTabId(): string {
  if (typeof window === 'undefined') return 'default'
  
  // 使用 window.name 來存儲分頁 ID（如果存在）
  // window.name 是每個分頁獨立的，不會被其他分頁共享
  if (window.name && window.name.startsWith('tab-')) {
    return window.name
  }
  
  // 生成一個唯一的分頁 ID（基於時間戳和隨機數）
  const tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  // 保存到 window.name（每個分頁獨立）
  try {
    window.name = tabId
  } catch (error) {
    // 如果 window.name 不可寫，使用 sessionStorage 作為備選
    // 雖然 sessionStorage 是共享的，但我們用隨機 ID 來區分
    console.warn('Failed to save tab ID to window.name:', error)
  }
  
  return tabId
}

/**
 * 獲取當前分頁的 storage key
 */
function getStorageKey(): string {
  return `${STORAGE_KEY_PREFIX}${getTabId()}`
}

export interface LocalSessionData {
  userId: string
  name: string
  email?: string | null
  image?: string | null
  id: string
  token: string
}

/**
 * 保存 session 到 localStorage
 * 使用分頁 ID 來區分不同分頁的 session
 */
export function saveLocalSession(data: LocalSessionData) {
  if (typeof window === 'undefined') return
  try {
    const key = getStorageKey()
    localStorage.setItem(key, JSON.stringify(data))
    // 同時保存分頁 ID，方便清理
    localStorage.setItem(`${key}-tab-id`, getTabId())
  } catch (error) {
    console.warn('Failed to save session to localStorage:', error)
  }
}

/**
 * 從 localStorage 讀取 session
 * 使用分頁 ID 來讀取當前分頁的 session
 */
export function getLocalSession(): LocalSessionData | null {
  if (typeof window === 'undefined') return null
  try {
    const key = getStorageKey()
    const data = localStorage.getItem(key)
    if (!data) return null
    return JSON.parse(data)
  } catch (error) {
    console.warn('Failed to read session from localStorage:', error)
    return null
  }
}

/**
 * 清除 localStorage 中的 session
 * 只清除當前分頁的 session
 */
export function clearLocalSession() {
  if (typeof window === 'undefined') return
  try {
    const key = getStorageKey()
    localStorage.removeItem(key)
    localStorage.removeItem(`${key}-tab-id`)
  } catch (error) {
    console.warn('Failed to clear session from localStorage:', error)
  }
}

/**
 * 檢查是否應該使用 localStorage（開發模式）
 * 預設在開發模式下啟用，以支持多分頁獨立登入測試
 */
export function shouldUseLocalStorage(): boolean {
  if (typeof window === 'undefined') return false
  // 預設在開發模式下啟用，除非明確禁用
  // 但需要檢查是否有 localStorage 中的 session，如果沒有則使用 cookie 模式
  if (process.env.NODE_ENV === 'development') {
    // 如果明確禁用，返回 false
    if (process.env.NEXT_PUBLIC_USE_LOCAL_STORAGE === 'false') {
      return false
    }
    // 如果明確啟用，返回 true
    if (process.env.NEXT_PUBLIC_USE_LOCAL_STORAGE === 'true') {
      return true
    }
    // 預設情況下，檢查是否有 localStorage session（使用當前分頁的 key）
    // 如果有，則使用 localStorage 模式；如果沒有，則使用 cookie 模式
    try {
      const key = getStorageKey()
      const hasLocalSession = localStorage.getItem(key) !== null
      // For OAuth and test login, always use cookie mode (NextAuth)
      // Only use localStorage if explicitly set or if there's already a localStorage session
      return hasLocalSession
    } catch {
      return false
    }
  }
  // In production, only use localStorage if explicitly enabled
  return process.env.NEXT_PUBLIC_USE_LOCAL_STORAGE === 'true'
}

