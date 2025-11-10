# API Testing Script for Windows PowerShell
# 
# This script tests all API endpoints
# 
# Usage:
#   .\test\scripts\test-api.ps1
# 
# Prerequisites:
#   - Server should be running on http://localhost:3000
#   - LOCAL_AUTH should be enabled for local auth tests

$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "🧪 Starting API Tests..." -ForegroundColor Cyan

# Test 1: Health Check / Session
Write-Host "`n1. Testing Auth Session..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/session" -Method Get
    Write-Host "   ✅ Session endpoint working" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Session endpoint failed: $_" -ForegroundColor Red
}

# Test 2: Get Posts
Write-Host "`n2. Testing Get Posts..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/posts?limit=5" -Method Get
    Write-Host "   ✅ Get posts working (found $($response.items.Count) posts)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Get posts failed: $_" -ForegroundColor Red
}

# Test 3: Get User (if test user exists)
Write-Host "`n3. Testing Get User..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/users/testuser1" -Method Get
    Write-Host "   ✅ Get user working" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Get user failed (user may not exist): $_" -ForegroundColor Yellow
}

# Test 4: Local Auth (if enabled)
if ($env:LOCAL_AUTH -eq "true") {
    Write-Host "`n4. Testing Local Auth..." -ForegroundColor Yellow
    try {
        $body = @{
            userId = "apitest"
            name = "API Test User"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/local" -Method Post -Body $body -Headers $headers
        Write-Host "   ✅ Local auth working" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Local auth failed: $_" -ForegroundColor Red
    }
}

Write-Host "`n✨ API Tests Completed!" -ForegroundColor Cyan
Write-Host "`nNote: Some tests may require authentication. Make sure to:" -ForegroundColor Yellow
Write-Host "  1. Set up authentication first" -ForegroundColor Yellow
Write-Host "  2. Include session cookies in requests" -ForegroundColor Yellow
Write-Host "  3. Check server logs for detailed errors" -ForegroundColor Yellow











