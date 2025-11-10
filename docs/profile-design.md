# Profile 頁面設計說明

## 概述

Profile 頁面是用戶查看其他用戶或自己個人資料的主要頁面，類似於 Twitter/X 的個人檔案頁面。

## URL 結構

```
/{userId}
```

例如：
- `/userA` - 查看用戶 A 的個人資料
- `/userB` - 查看用戶 B 的個人資料
- `/{currentUserId}` - 查看自己的個人資料

## 頁面組成

### 1. ProfileHeader（個人資料標頭）

顯示用戶的基本資訊：

- **背景圖片** (`backgroundUrl`)
  - 如果用戶有設置背景圖片，顯示背景圖片
  - 否則顯示預設漸層背景

- **頭像** (`avatarUrl`)
  - 圓形頭像，120x120px
  - 如果沒有頭像，顯示用戶名稱的第一個字母

- **用戶資訊**
  - **名稱** (`name`) - 顯示名稱
  - **用戶 ID** (`userId`) - 顯示 @userId 格式
  - **個人簡介** (`bio`) - 如果有的話

- **統計資訊**
  - **Posts** - 發文數量 (`_count.posts`)
  - **Following** - 關注人數 (`_count.following`)
  - **Followers** - 粉絲人數 (`_count.followers`)

- **操作按鈕**
  - **如果是自己的 Profile**：顯示 "Edit Profile" 按鈕
  - **如果是其他用戶的 Profile**：
    - 如果已關注：顯示 "Following" 按鈕（outlined 樣式）
    - 如果對方關注了你：顯示 "Follow Back" 按鈕（contained 樣式）
    - 如果未關注：顯示 "Follow" 按鈕（contained 樣式）

### 2. ProfileTabs（標籤頁）

切換不同的內容視圖：

- **Posts** - 顯示用戶的所有發文（不包括 repost）
- **Likes** - 顯示用戶按讚的發文（僅在自己的 Profile 顯示）

### 3. 內容區域

根據選中的標籤顯示對應內容：

- **Posts 標籤**
  - 顯示該用戶的所有原創發文
  - 使用 `PostCard` 組件顯示每篇發文
  - 按時間倒序排列

- **Likes 標籤**
  - 僅在自己的 Profile 顯示
  - 顯示用戶按讚的發文列表
  - （目前為佔位符，功能待實現）

## API 端點

### 1. 獲取用戶資料
```
GET /api/users/{userId}
```

**回應：**
```json
{
  "id": "user_id",
  "userId": "userA",
  "name": "User A",
  "email": "usera@test.com",
  "bio": "這是測試用戶 A",
  "avatarUrl": null,
  "backgroundUrl": null,
  "_count": {
    "posts": 10,
    "followers": 5,
    "following": 3
  }
}
```

### 2. 檢查 Follow 狀態
```
GET /api/users/{userId}/follow-status
```

**需要認證：** 是

**回應：**
```json
{
  "isFollowing": true,
  "isFollowedBy": false
}
```

### 3. Follow/Unfollow 用戶
```
POST /api/users/{userId}/follow
```

**需要認證：** 是

**回應：**
```json
{
  "action": "followed" // 或 "unfollowed"
}
```

### 4. 獲取用戶的發文
```
GET /api/posts?filter=all&limit=50
```

然後在前端過濾出該用戶的發文。

## 資料流程

1. **頁面載入**
   - 從 URL 參數獲取 `userId`
   - 調用 `GET /api/users/{userId}` 獲取用戶資料
   - 如果不是自己的 Profile，調用 `GET /api/users/{userId}/follow-status` 檢查 Follow 狀態
   - 調用 `GET /api/posts?filter=all&limit=50` 獲取所有發文
   - 在前端過濾出該用戶的發文

2. **Follow/Unfollow 操作**
   - 點擊 Follow 按鈕
   - 調用 `POST /api/users/{userId}/follow`
   - 更新本地狀態
   - 重新獲取用戶資料以更新統計資訊
   - 重新獲取 Follow 狀態

3. **編輯個人資料**
   - 點擊 "Edit Profile" 按鈕
   - 打開編輯對話框
   - 修改名稱和簡介
   - 調用 `PUT /api/users/{userId}` 更新資料
   - 重新載入頁面

## 狀態管理

使用 React Hooks 管理頁面狀態：

- `user` - 用戶資料
- `posts` - 發文列表
- `likes` - 按讚列表
- `activeTab` - 當前選中的標籤
- `isFollowing` - 是否已關注該用戶
- `isFollowedBy` - 該用戶是否關注了我
- `loading` - 載入狀態

## 錯誤處理

- **用戶不存在**：顯示 "User not found"
- **資料庫連接錯誤**：顯示錯誤訊息，建議檢查連接設定
- **未授權**：重定向到登入頁面

## 實時更新

使用 Pusher 實現實時更新：

- 當用戶發文時，如果當前在該用戶的 Profile 頁面，會收到 `post:created` 事件
- 當用戶更新發文時，會收到 `post:updated` 事件
- 當用戶刪除發文時，會收到 `post:deleted` 事件

## 注意事項

1. **Next.js 15+ 的 params 處理**
   - `params` 現在是 Promise，需要使用 `await params` 來獲取值
   - 所有使用 `params` 的 API 路由都需要更新

2. **搜尋功能**
   - 用戶可以通過 Sidebar 的搜尋框搜尋其他用戶
   - 搜尋結果會顯示用戶的基本資訊和 Follow 狀態
   - 點擊搜尋結果會跳轉到該用戶的 Profile 頁面

3. **Follow 功能**
   - 用戶可以 Follow/Unfollow 其他用戶
   - Follow 狀態會即時更新
   - 統計資訊會自動更新

---

**最後更新：** 2024年（開發階段）







