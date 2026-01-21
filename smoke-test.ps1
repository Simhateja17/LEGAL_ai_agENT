# Smoke Test Script (PowerShell version)
# Usage: .\smoke-test.ps1 -StagingUrl "https://your-staging-url"

param(
    [Parameter(Mandatory=$true)]
    [string]$StagingUrl
)

$Failed = 0
$Total = 8

Write-Host "🧪 Running smoke tests for $StagingUrl" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
Write-Host "--------------------"
try {
    $response = Invoke-WebRequest -Uri "$StagingUrl/health" -Method Get -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Health check passed (HTTP $($response.StatusCode))" -ForegroundColor Green
        Write-Host "Response: $($response.Content)"
    }
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
    $Failed++
}
Write-Host ""

# Test 2: Root Endpoint
Write-Host "Test 2: Root Endpoint (API Info)" -ForegroundColor Yellow
Write-Host "--------------------------------"
try {
    $response = Invoke-WebRequest -Uri "$StagingUrl/" -Method Get -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Root endpoint passed (HTTP $($response.StatusCode))" -ForegroundColor Green
        Write-Host "Response: $($response.Content)"
    }
} catch {
    Write-Host "❌ Root endpoint failed: $_" -ForegroundColor Red
    $Failed++
}
Write-Host ""

# Test 3: Search Query (Health Insurance)
Write-Host "Test 3: Search Query - Health Insurance" -ForegroundColor Yellow
Write-Host "---------------------------------------"
try {
    $response = Invoke-WebRequest -Uri "$StagingUrl/api/query/search?q=health%20insurance" -Method Get -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Health insurance query passed (HTTP $($response.StatusCode))" -ForegroundColor Green
        $preview = $response.Content.Substring(0, [Math]::Min(200, $response.Content.Length))
        Write-Host "Response preview: $preview..."
    }
} catch {
    Write-Host "❌ Health insurance query failed: $_" -ForegroundColor Red
    $Failed++
}
Write-Host ""

# Test 4: Search Query with Insurance Type Filter
Write-Host "Test 4: Search with Insurance Type Filter" -ForegroundColor Yellow
Write-Host "-----------------------------------------"
try {
    $response = Invoke-WebRequest -Uri "$StagingUrl/api/query/search?q=coverage&insurance_type=krankenversicherung" -Method Get -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Filtered search passed (HTTP $($response.StatusCode))" -ForegroundColor Green
        $preview = $response.Content.Substring(0, [Math]::Min(200, $response.Content.Length))
        Write-Host "Response preview: $preview..."
    }
} catch {
    Write-Host "❌ Filtered search failed: $_" -ForegroundColor Red
    $Failed++
}
Write-Host ""

# Test 5: Insurers Endpoint
Write-Host "Test 5: Insurers Endpoint" -ForegroundColor Yellow
Write-Host "------------------------"
try {
    $response = Invoke-WebRequest -Uri "$StagingUrl/api/insurers" -Method Get -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Insurers endpoint passed (HTTP $($response.StatusCode))" -ForegroundColor Green
        $preview = $response.Content.Substring(0, [Math]::Min(200, $response.Content.Length))
        Write-Host "Response preview: $preview..."
    }
} catch {
    Write-Host "❌ Insurers endpoint failed: $_" -ForegroundColor Red
    $Failed++
}
Write-Host ""

# Test 6: Stats Endpoint
Write-Host "Test 6: Stats Endpoint" -ForegroundColor Yellow
Write-Host "---------------------"
try {
    $response = Invoke-WebRequest -Uri "$StagingUrl/api/stats" -Method Get -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Stats endpoint passed (HTTP $($response.StatusCode))" -ForegroundColor Green
        $preview = $response.Content.Substring(0, [Math]::Min(200, $response.Content.Length))
        Write-Host "Response preview: $preview..."
    }
} catch {
    Write-Host "❌ Stats endpoint failed: $_" -ForegroundColor Red
    $Failed++
}
Write-Host ""

# Test 7: Invalid Query (Error Handling)
Write-Host "Test 7: Error Handling - Invalid Query" -ForegroundColor Yellow
Write-Host "--------------------------------------"
try {
    $response = Invoke-WebRequest -Uri "$StagingUrl/api/query/search" -Method Get -UseBasicParsing
    Write-Host "❌ Error handling incorrect (expected 400, got $($response.StatusCode))" -ForegroundColor Red
    $Failed++
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) {
        Write-Host "✅ Error handling works correctly (HTTP 400)" -ForegroundColor Green
        Write-Host "Error response: Expected validation error"
    } else {
        Write-Host "❌ Error handling incorrect: $_" -ForegroundColor Red
        $Failed++
    }
}
Write-Host ""

# Test 8: Invalid Insurance Type
Write-Host "Test 8: Error Handling - Invalid Insurance Type" -ForegroundColor Yellow
Write-Host "-----------------------------------------------"
try {
    $response = Invoke-WebRequest -Uri "$StagingUrl/api/query/search?q=test&insurance_type=invalid" -Method Get -UseBasicParsing
    Write-Host "❌ Validation incorrect (expected 400, got $($response.StatusCode))" -ForegroundColor Red
    $Failed++
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) {
        Write-Host "✅ Validation works correctly (HTTP 400)" -ForegroundColor Green
        Write-Host "Error response: Expected validation error"
    } else {
        Write-Host "❌ Validation incorrect: $_" -ForegroundColor Red
        $Failed++
    }
}
Write-Host ""

# Summary
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Smoke Test Summary" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
$Passed = $Total - $Failed
Write-Host "Total Tests: $Total"
Write-Host "Passed: $Passed" -ForegroundColor Green
Write-Host "Failed: $Failed" -ForegroundColor $(if ($Failed -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($Failed -eq 0) {
    Write-Host "✅ All smoke tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Some tests failed. Please review the output above." -ForegroundColor Red
    exit 1
}
