# Load Test Script (PowerShell version)
# Usage: .\load-test.ps1 -StagingUrl "https://your-staging-url" -ConcurrentRequests 10

param(
    [Parameter(Mandatory=$true)]
    [string]$StagingUrl,
    
    [Parameter(Mandatory=$false)]
    [int]$ConcurrentRequests = 10
)

Write-Host "🔥 Running load test for $StagingUrl" -ForegroundColor Cyan
Write-Host "Concurrent requests: $ConcurrentRequests" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$results = @{
    health = @()
    search = @()
    mixed = @()
}

# Test 1: Health endpoint load test
Write-Host "Test 1: Health Endpoint - $ConcurrentRequests concurrent requests" -ForegroundColor Yellow
Write-Host "-----------------------------------------------------------"
$startTime = Get-Date

$jobs = 1..$ConcurrentRequests | ForEach-Object {
    Start-Job -ScriptBlock {
        param($url)
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            $response = Invoke-WebRequest -Uri "$url/health" -Method Get -UseBasicParsing
            $sw.Stop()
            return @{
                StatusCode = $response.StatusCode
                Time = $sw.Elapsed.TotalSeconds
            }
        } catch {
            $sw.Stop()
            return @{
                StatusCode = 500
                Time = $sw.Elapsed.TotalSeconds
            }
        }
    } -ArgumentList $StagingUrl
}

$results.health = $jobs | Wait-Job | Receive-Job
$jobs | Remove-Job

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds
$success = ($results.health | Where-Object { $_.StatusCode -eq 200 }).Count
$fail = $ConcurrentRequests - $success
$avgTime = ($results.health | Measure-Object -Property Time -Average).Average

Write-Host "✅ Completed in $([math]::Round($duration, 2)) seconds" -ForegroundColor Green
Write-Host "   Total: $ConcurrentRequests, Success: $success, Failed: $fail"
Write-Host "   Average response time: $([math]::Round($avgTime, 3))s"
Write-Host ""

# Test 2: Search endpoint load test
Write-Host "Test 2: Search Endpoint - $ConcurrentRequests concurrent requests" -ForegroundColor Yellow
Write-Host "-----------------------------------------------------------"
$startTime = Get-Date

$queries = @(
    "health insurance coverage",
    "car insurance rates",
    "home insurance policy",
    "liability coverage",
    "insurance claims process",
    "premium calculation",
    "deductible options",
    "policy renewal",
    "insurance benefits",
    "coverage limits"
)

$jobs = 1..$ConcurrentRequests | ForEach-Object {
    Start-Job -ScriptBlock {
        param($url, $query)
        $encodedQuery = [System.Web.HttpUtility]::UrlEncode($query)
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            $response = Invoke-WebRequest -Uri "$url/api/query/search?q=$encodedQuery" -Method Get -UseBasicParsing
            $sw.Stop()
            return @{
                StatusCode = $response.StatusCode
                Time = $sw.Elapsed.TotalSeconds
            }
        } catch {
            $sw.Stop()
            return @{
                StatusCode = 500
                Time = $sw.Elapsed.TotalSeconds
            }
        }
    } -ArgumentList $StagingUrl, $queries[$_ % 10]
}

$results.search = $jobs | Wait-Job | Receive-Job
$jobs | Remove-Job

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds
$success = ($results.search | Where-Object { $_.StatusCode -eq 200 }).Count
$fail = $ConcurrentRequests - $success
$avgTime = ($results.search | Measure-Object -Property Time -Average).Average

Write-Host "✅ Completed in $([math]::Round($duration, 2)) seconds" -ForegroundColor Green
Write-Host "   Total: $ConcurrentRequests, Success: $success, Failed: $fail"
Write-Host "   Average response time: $([math]::Round($avgTime, 3))s"
Write-Host ""

# Test 3: Mixed endpoint load test
Write-Host "Test 3: Mixed Endpoints - $ConcurrentRequests concurrent requests" -ForegroundColor Yellow
Write-Host "-----------------------------------------------------------"
$startTime = Get-Date

$jobs = 1..$ConcurrentRequests | ForEach-Object {
    Start-Job -ScriptBlock {
        param($url, $index)
        $endpoint = switch ($index % 4) {
            0 { "$url/health" }
            1 { "$url/api/insurers" }
            2 { "$url/api/stats" }
            3 { "$url/api/query/search?q=insurance" }
        }
        
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            $response = Invoke-WebRequest -Uri $endpoint -Method Get -UseBasicParsing
            $sw.Stop()
            return @{
                StatusCode = $response.StatusCode
                Time = $sw.Elapsed.TotalSeconds
            }
        } catch {
            $sw.Stop()
            return @{
                StatusCode = 500
                Time = $sw.Elapsed.TotalSeconds
            }
        }
    } -ArgumentList $StagingUrl, $_
}

$results.mixed = $jobs | Wait-Job | Receive-Job
$jobs | Remove-Job

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds
$success = ($results.mixed | Where-Object { $_.StatusCode -eq 200 }).Count
$fail = $ConcurrentRequests - $success
$avgTime = ($results.mixed | Measure-Object -Property Time -Average).Average

Write-Host "✅ Completed in $([math]::Round($duration, 2)) seconds" -ForegroundColor Green
Write-Host "   Total: $ConcurrentRequests, Success: $success, Failed: $fail"
Write-Host "   Average response time: $([math]::Round($avgTime, 3))s"
Write-Host ""

# Summary
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Load Test Summary" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

$totalRequests = $ConcurrentRequests * 3
$totalSuccess = ($results.health | Where-Object { $_.StatusCode -eq 200 }).Count + 
                ($results.search | Where-Object { $_.StatusCode -eq 200 }).Count + 
                ($results.mixed | Where-Object { $_.StatusCode -eq 200 }).Count
$totalFail = $totalRequests - $totalSuccess
$successRate = [math]::Round(($totalSuccess / $totalRequests) * 100, 2)

Write-Host "Total Requests: $totalRequests"
Write-Host "Successful: $totalSuccess" -ForegroundColor Green
Write-Host "Failed: $totalFail" -ForegroundColor $(if ($totalFail -eq 0) { "Green" } else { "Red" })
Write-Host "Success Rate: $successRate%"
Write-Host ""

# Calculate overall metrics
$allResults = $results.health + $results.search + $results.mixed
$overallAvg = ($allResults | Measure-Object -Property Time -Average).Average
Write-Host "Overall Average Response Time: $([math]::Round($overallAvg, 3))s"

# Calculate percentiles
Write-Host ""
Write-Host "Response Time Percentiles:" -ForegroundColor Yellow
Write-Host "-------------------------"
$sortedTimes = $allResults | Sort-Object -Property Time | Select-Object -ExpandProperty Time
$count = $sortedTimes.Count
$p50 = $sortedTimes[[math]::Floor($count * 0.50)]
$p95 = $sortedTimes[[math]::Floor($count * 0.95)]
$p99 = $sortedTimes[[math]::Floor($count * 0.99)]

Write-Host "P50 (median): $([math]::Round($p50, 3))s"
Write-Host "P95: $([math]::Round($p95, 3))s"
Write-Host "P99: $([math]::Round($p99, 3))s"
Write-Host ""

# Exit status
if ($totalFail -eq 0) {
    Write-Host "✅ All load tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Check /api/stats endpoint for detailed metrics:" -ForegroundColor Cyan
    Write-Host "   Invoke-WebRequest -Uri $StagingUrl/api/stats" -ForegroundColor Gray
    exit 0
} else {
    Write-Host "⚠️  Some requests failed. Success rate: $successRate%" -ForegroundColor Yellow
    exit 1
}
