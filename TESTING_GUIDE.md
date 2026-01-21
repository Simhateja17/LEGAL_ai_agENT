# Testing Guide

## Overview

This guide explains how to test the German Insurance Backend API both locally and in staging/production environments.

---

## Local Testing

### Prerequisites

1. **Environment Setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase and Vertex AI credentials
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Create Database Indexes**:
   ```bash
   # Run the indexes SQL file on your Supabase database
   psql -h your-supabase-host -f db/create-indexes.sql
   ```

4. **Start Server**:
   ```bash
   npm start
   # Server runs on http://localhost:3000
   ```

### Manual Testing

#### Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 123.45,
    "database": "connected",
    "cache": "enabled"
  }
}
```

#### Search Query
```bash
curl "http://localhost:3000/api/query/search?q=health%20insurance"
```

#### Search with Filter
```bash
curl "http://localhost:3000/api/query/search?q=coverage&insurance_type=krankenversicherung"
```

#### List Insurers
```bash
curl http://localhost:3000/api/insurers
```

#### Get Statistics
```bash
curl http://localhost:3000/api/stats
```

### Automated Local Tests

#### Jest Test Suite
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test tests/api.test.js
```

---

## Staging/Production Testing

### Smoke Tests

Smoke tests verify basic functionality of all endpoints.

#### Linux/Mac (Bash)
```bash
chmod +x smoke-test.sh
./smoke-test.sh https://your-staging-url.run.app
```

#### Windows (PowerShell)
```powershell
.\smoke-test.ps1 -StagingUrl "https://your-staging-url.run.app"
```

#### What Smoke Tests Cover
1. ✅ Health check endpoint
2. ✅ Root endpoint (API info)
3. ✅ Search query functionality
4. ✅ Insurance type filtering
5. ✅ Insurers endpoint
6. ✅ Stats endpoint
7. ✅ Error handling (invalid inputs)
8. ✅ Input validation

---

### Load Tests

Load tests measure performance under concurrent requests.

#### Linux/Mac (Bash)
```bash
chmod +x load-test.sh

# Default: 10 concurrent requests
./load-test.sh https://your-staging-url.run.app

# Custom: 50 concurrent requests
./load-test.sh https://your-staging-url.run.app 50
```

#### Windows (PowerShell)
```powershell
# Default: 10 concurrent requests
.\load-test.ps1 -StagingUrl "https://your-staging-url.run.app"

# Custom: 50 concurrent requests
.\load-test.ps1 -StagingUrl "https://your-staging-url.run.app" -ConcurrentRequests 50
```

#### What Load Tests Measure
- **Response Time**: Average, P50, P95, P99
- **Success Rate**: Percentage of successful requests
- **Throughput**: Requests per second
- **Endpoint Performance**: Health, Search, Mixed traffic

#### Expected Performance
- P95 response time: < 500ms
- P99 response time: < 1000ms
- Success rate: > 99%
- Cache hit rate: > 30% (after warm-up)

---

## Advanced Testing

### Testing Rate Limiting

```bash
# Send 150 requests rapidly (exceeds default limit of 100)
for i in {1..150}; do
  curl -s http://localhost:3000/health &
done
wait

# Check rate limit headers
curl -i http://localhost:3000/health | grep -i rate
```

Expected behavior:
- First 100 requests: HTTP 200
- Remaining requests: HTTP 429 (Too Many Requests)

### Testing Caching

```bash
# First request (cache miss)
time curl "http://localhost:3000/api/query/search?q=test"

# Second request (cache hit - should be faster)
time curl "http://localhost:3000/api/query/search?q=test"

# Check cache stats
curl http://localhost:3000/api/stats | jq '.data.cache'
```

Expected cache metrics:
```json
{
  "enabled": true,
  "hits": 1,
  "misses": 1,
  "hitRate": 50.0,
  "keys": 1
}
```

### Testing Error Handling

#### Missing Required Parameter
```bash
curl -i http://localhost:3000/api/query/search
# Expected: HTTP 400 with validation error
```

#### Invalid Insurance Type
```bash
curl -i "http://localhost:3000/api/query/search?q=test&insurance_type=invalid"
# Expected: HTTP 400 with validation error
```

#### Timeout Simulation
```bash
# Set a very short timeout in .env
SERVER_TIMEOUT_MS=100

# Make a complex query that takes longer
curl "http://localhost:3000/api/query/search?q=complex%20query"
# Expected: HTTP 504 (Gateway Timeout)
```

---

## Performance Benchmarking

### Using Apache Bench (ab)

```bash
# Install ab (Apache Bench)
sudo apt-get install apache2-utils  # Ubuntu/Debian
brew install apache2-utils           # macOS

# Test health endpoint
ab -n 1000 -c 10 http://localhost:3000/health

# Test search endpoint
ab -n 100 -c 5 "http://localhost:3000/api/query/search?q=insurance"
```

### Using wrk

```bash
# Install wrk
brew install wrk  # macOS
# or download from https://github.com/wg/wrk

# Run benchmark
wrk -t4 -c10 -d30s http://localhost:3000/health
```

---

## Monitoring During Tests

### Real-time Logs

#### Local Development
```bash
# Logs are written to logs/combined.log and logs/error.log
tail -f logs/combined.log
```

#### Cloud Run
```bash
gcloud run services logs read insurance-ai-backend \
  --region us-central1 \
  --limit 50 \
  --format json
```

### Live Metrics

#### Application Metrics
```bash
# Watch stats endpoint
watch -n 1 'curl -s http://localhost:3000/api/stats | jq ".data.requests, .data.performance, .data.cache"'
```

#### Cloud Run Metrics
- Open Cloud Run console
- Select your service
- View Metrics tab for:
  - Request count
  - Request latency
  - Container CPU utilization
  - Container memory utilization

---

## Test Reports

### Generating Test Reports

#### Jest Coverage Report
```bash
npm test -- --coverage --coverageReporters=html
# Open coverage/index.html in browser
```

#### Load Test Report
```bash
# Save load test output
./load-test.sh https://your-url.run.app > load-test-report.txt

# View summary
cat load-test-report.txt | grep -A 20 "Load Test Summary"
```

---

## Continuous Integration Testing

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

---

## Troubleshooting Tests

### Common Issues

#### Database Connection Errors
```bash
# Verify Supabase credentials
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# Test connection
node test-connection.js
```

#### Timeout Errors
```bash
# Increase timeout in .env
SERVER_TIMEOUT_MS=60000

# Check database performance
curl http://localhost:3000/api/stats | jq '.data.performance.queryLatency'
```

#### Cache Issues
```bash
# Disable cache temporarily
CACHE_ENABLED=false npm start

# Clear cache and restart
# Cache is in-memory, so just restart the server
```

---

## Best Practices

### Before Deploying
1. ✅ Run all Jest tests locally
2. ✅ Run smoke tests against local server
3. ✅ Run load tests with 10 concurrent requests
4. ✅ Check logs for errors
5. ✅ Verify all endpoints return expected responses

### After Deploying
1. ✅ Run smoke tests against staging URL
2. ✅ Run load tests with increasing concurrency (10, 25, 50)
3. ✅ Monitor Cloud Run metrics for 15 minutes
4. ✅ Check error rates and response times
5. ✅ Verify cache hit rate > 30%

### Regular Monitoring
1. Check `/api/stats` daily
2. Monitor Cloud Run metrics weekly
3. Review logs for errors
4. Track performance trends
5. Set up alerts for high error rates

---

## Test Checklist

Use this checklist before marking deployment complete:

- [ ] Local Jest tests pass
- [ ] Health check returns 200
- [ ] Search endpoint works
- [ ] Insurance type filtering works
- [ ] Error handling validated
- [ ] Rate limiting tested
- [ ] Cache hit rate > 30%
- [ ] Smoke tests pass (staging)
- [ ] Load tests pass (10+ concurrent)
- [ ] Performance meets targets (p95 < 500ms)
- [ ] No errors in logs
- [ ] Monitoring configured
