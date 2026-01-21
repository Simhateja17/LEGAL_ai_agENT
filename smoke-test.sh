#!/bin/bash

# Smoke Test Script
# Usage: ./smoke-test.sh STAGING_URL

set -e

if [ "$#" -ne 1 ]; then
    echo "Usage: ./smoke-test.sh STAGING_URL"
    echo "Example: ./smoke-test.sh https://insurance-ai-backend-abc123.run.app"
    exit 1
fi

STAGING_URL=$1
FAILED=0

echo "🧪 Running smoke tests for ${STAGING_URL}"
echo "================================================"
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
echo "--------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" ${STAGING_URL}/health)
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Health check passed (HTTP $HTTP_CODE)"
    RESPONSE=$(curl -s ${STAGING_URL}/health)
    echo "Response: $RESPONSE"
else
    echo "❌ Health check failed (HTTP $HTTP_CODE)"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 2: Root Endpoint
echo "Test 2: Root Endpoint (API Info)"
echo "--------------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" ${STAGING_URL}/)
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Root endpoint passed (HTTP $HTTP_CODE)"
    RESPONSE=$(curl -s ${STAGING_URL}/)
    echo "Response: $RESPONSE"
else
    echo "❌ Root endpoint failed (HTTP $HTTP_CODE)"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 3: Search Query (Health Insurance)
echo "Test 3: Search Query - Health Insurance"
echo "---------------------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${STAGING_URL}/api/query/search?q=health%20insurance")
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Health insurance query passed (HTTP $HTTP_CODE)"
    RESPONSE=$(curl -s "${STAGING_URL}/api/query/search?q=health%20insurance")
    echo "Response preview: ${RESPONSE:0:200}..."
else
    echo "❌ Health insurance query failed (HTTP $HTTP_CODE)"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 4: Search Query with Insurance Type Filter
echo "Test 4: Search with Insurance Type Filter"
echo "-----------------------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${STAGING_URL}/api/query/search?q=coverage&insurance_type=krankenversicherung")
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Filtered search passed (HTTP $HTTP_CODE)"
    RESPONSE=$(curl -s "${STAGING_URL}/api/query/search?q=coverage&insurance_type=krankenversicherung")
    echo "Response preview: ${RESPONSE:0:200}..."
else
    echo "❌ Filtered search failed (HTTP $HTTP_CODE)"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 5: Insurers Endpoint
echo "Test 5: Insurers Endpoint"
echo "------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${STAGING_URL}/api/insurers")
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Insurers endpoint passed (HTTP $HTTP_CODE)"
    RESPONSE=$(curl -s "${STAGING_URL}/api/insurers")
    echo "Response preview: ${RESPONSE:0:200}..."
else
    echo "❌ Insurers endpoint failed (HTTP $HTTP_CODE)"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 6: Stats Endpoint
echo "Test 6: Stats Endpoint"
echo "---------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${STAGING_URL}/api/stats")
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Stats endpoint passed (HTTP $HTTP_CODE)"
    RESPONSE=$(curl -s "${STAGING_URL}/api/stats")
    echo "Response preview: ${RESPONSE:0:200}..."
else
    echo "❌ Stats endpoint failed (HTTP $HTTP_CODE)"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 7: Invalid Query (Error Handling)
echo "Test 7: Error Handling - Invalid Query"
echo "--------------------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${STAGING_URL}/api/query/search")
if [ "$HTTP_CODE" -eq 400 ]; then
    echo "✅ Error handling works correctly (HTTP $HTTP_CODE)"
    RESPONSE=$(curl -s "${STAGING_URL}/api/query/search")
    echo "Error response: $RESPONSE"
else
    echo "❌ Error handling incorrect (expected 400, got HTTP $HTTP_CODE)"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 8: Invalid Insurance Type
echo "Test 8: Error Handling - Invalid Insurance Type"
echo "-----------------------------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${STAGING_URL}/api/query/search?q=test&insurance_type=invalid")
if [ "$HTTP_CODE" -eq 400 ]; then
    echo "✅ Validation works correctly (HTTP $HTTP_CODE)"
    RESPONSE=$(curl -s "${STAGING_URL}/api/query/search?q=test&insurance_type=invalid")
    echo "Error response: $RESPONSE"
else
    echo "❌ Validation incorrect (expected 400, got HTTP $HTTP_CODE)"
    FAILED=$((FAILED + 1))
fi
echo ""

# Summary
echo "================================================"
echo "Smoke Test Summary"
echo "================================================"
TOTAL=8
PASSED=$((TOTAL - FAILED))
echo "Total Tests: $TOTAL"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "✅ All smoke tests passed!"
    exit 0
else
    echo "❌ Some tests failed. Please review the output above."
    exit 1
fi
