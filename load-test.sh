#!/bin/bash

# Load Test Script
# Usage: ./load-test.sh STAGING_URL CONCURRENT_REQUESTS

set -e

if [ "$#" -lt 1 ]; then
    echo "Usage: ./load-test.sh STAGING_URL [CONCURRENT_REQUESTS]"
    echo "Example: ./load-test.sh https://insurance-ai-backend-abc123.run.app 10"
    exit 1
fi

STAGING_URL=$1
CONCURRENT=${2:-10}

echo "🔥 Running load test for ${STAGING_URL}"
echo "Concurrent requests: ${CONCURRENT}"
echo "================================================"
echo ""

# Check if curl is available
if ! command -v curl &> /dev/null; then
    echo "❌ curl not found. Please install curl first."
    exit 1
fi

# Create a temporary directory for results
TEMP_DIR=$(mktemp -d)
echo "📁 Temporary directory: ${TEMP_DIR}"

# Test 1: Health endpoint load test
echo "Test 1: Health Endpoint - ${CONCURRENT} concurrent requests"
echo "-----------------------------------------------------------"
START_TIME=$(date +%s)

for i in $(seq 1 $CONCURRENT); do
    (
        RESULT=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" ${STAGING_URL}/health)
        echo "$RESULT" >> ${TEMP_DIR}/health_results.txt
    ) &
done

wait

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Analyze results
TOTAL=$(wc -l < ${TEMP_DIR}/health_results.txt)
SUCCESS=$(grep -c "^200," ${TEMP_DIR}/health_results.txt || true)
FAIL=$((TOTAL - SUCCESS))

echo "✅ Completed in ${DURATION} seconds"
echo "   Total: ${TOTAL}, Success: ${SUCCESS}, Failed: ${FAIL}"

# Calculate average response time
if [ -f ${TEMP_DIR}/health_results.txt ]; then
    AVG_TIME=$(awk -F',' '{sum+=$2; count++} END {if(count>0) print sum/count; else print 0}' ${TEMP_DIR}/health_results.txt)
    echo "   Average response time: ${AVG_TIME}s"
fi
echo ""

# Test 2: Search endpoint load test
echo "Test 2: Search Endpoint - ${CONCURRENT} concurrent requests"
echo "-----------------------------------------------------------"
START_TIME=$(date +%s)

QUERIES=(
    "health insurance coverage"
    "car insurance rates"
    "home insurance policy"
    "liability coverage"
    "insurance claims process"
    "premium calculation"
    "deductible options"
    "policy renewal"
    "insurance benefits"
    "coverage limits"
)

for i in $(seq 1 $CONCURRENT); do
    (
        QUERY_INDEX=$((i % 10))
        QUERY="${QUERIES[$QUERY_INDEX]}"
        ENCODED_QUERY=$(echo "$QUERY" | sed 's/ /%20/g')
        RESULT=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" "${STAGING_URL}/api/query/search?q=${ENCODED_QUERY}")
        echo "$RESULT" >> ${TEMP_DIR}/search_results.txt
    ) &
done

wait

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Analyze results
TOTAL=$(wc -l < ${TEMP_DIR}/search_results.txt)
SUCCESS=$(grep -c "^200," ${TEMP_DIR}/search_results.txt || true)
FAIL=$((TOTAL - SUCCESS))

echo "✅ Completed in ${DURATION} seconds"
echo "   Total: ${TOTAL}, Success: ${SUCCESS}, Failed: ${FAIL}"

# Calculate average response time
if [ -f ${TEMP_DIR}/search_results.txt ]; then
    AVG_TIME=$(awk -F',' '{sum+=$2; count++} END {if(count>0) print sum/count; else print 0}' ${TEMP_DIR}/search_results.txt)
    echo "   Average response time: ${AVG_TIME}s"
fi
echo ""

# Test 3: Mixed endpoint load test
echo "Test 3: Mixed Endpoints - ${CONCURRENT} concurrent requests"
echo "-----------------------------------------------------------"
START_TIME=$(date +%s)

for i in $(seq 1 $CONCURRENT); do
    (
        case $((i % 4)) in
            0)
                ENDPOINT="${STAGING_URL}/health"
                ;;
            1)
                ENDPOINT="${STAGING_URL}/api/insurers"
                ;;
            2)
                ENDPOINT="${STAGING_URL}/api/stats"
                ;;
            3)
                ENDPOINT="${STAGING_URL}/api/query/search?q=insurance"
                ;;
        esac
        
        RESULT=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" "${ENDPOINT}")
        echo "$RESULT" >> ${TEMP_DIR}/mixed_results.txt
    ) &
done

wait

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Analyze results
TOTAL=$(wc -l < ${TEMP_DIR}/mixed_results.txt)
SUCCESS=$(grep -c "^200," ${TEMP_DIR}/mixed_results.txt || true)
FAIL=$((TOTAL - SUCCESS))

echo "✅ Completed in ${DURATION} seconds"
echo "   Total: ${TOTAL}, Success: ${SUCCESS}, Failed: ${FAIL}"

# Calculate average response time
if [ -f ${TEMP_DIR}/mixed_results.txt ]; then
    AVG_TIME=$(awk -F',' '{sum+=$2; count++} END {if(count>0) print sum/count; else print 0}' ${TEMP_DIR}/mixed_results.txt)
    echo "   Average response time: ${AVG_TIME}s"
fi
echo ""

# Summary
echo "================================================"
echo "Load Test Summary"
echo "================================================"

TOTAL_REQUESTS=$((CONCURRENT * 3))
TOTAL_SUCCESS=$(($(grep -c "^200," ${TEMP_DIR}/health_results.txt || true) + $(grep -c "^200," ${TEMP_DIR}/search_results.txt || true) + $(grep -c "^200," ${TEMP_DIR}/mixed_results.txt || true)))
TOTAL_FAIL=$((TOTAL_REQUESTS - TOTAL_SUCCESS))
SUCCESS_RATE=$(awk "BEGIN {printf \"%.2f\", ($TOTAL_SUCCESS / $TOTAL_REQUESTS) * 100}")

echo "Total Requests: ${TOTAL_REQUESTS}"
echo "Successful: ${TOTAL_SUCCESS}"
echo "Failed: ${TOTAL_FAIL}"
echo "Success Rate: ${SUCCESS_RATE}%"
echo ""

# Calculate overall average response time
cat ${TEMP_DIR}/health_results.txt ${TEMP_DIR}/search_results.txt ${TEMP_DIR}/mixed_results.txt > ${TEMP_DIR}/all_results.txt
OVERALL_AVG=$(awk -F',' '{sum+=$2; count++} END {if(count>0) print sum/count; else print 0}' ${TEMP_DIR}/all_results.txt)
echo "Overall Average Response Time: ${OVERALL_AVG}s"

# Calculate percentiles
echo ""
echo "Response Time Percentiles:"
echo "-------------------------"
awk -F',' '{print $2}' ${TEMP_DIR}/all_results.txt | sort -n > ${TEMP_DIR}/sorted_times.txt
TOTAL_LINES=$(wc -l < ${TEMP_DIR}/sorted_times.txt)
P50_LINE=$(awk "BEGIN {printf \"%d\", $TOTAL_LINES * 0.50}")
P95_LINE=$(awk "BEGIN {printf \"%d\", $TOTAL_LINES * 0.95}")
P99_LINE=$(awk "BEGIN {printf \"%d\", $TOTAL_LINES * 0.99}")

P50=$(sed -n "${P50_LINE}p" ${TEMP_DIR}/sorted_times.txt)
P95=$(sed -n "${P95_LINE}p" ${TEMP_DIR}/sorted_times.txt)
P99=$(sed -n "${P99_LINE}p" ${TEMP_DIR}/sorted_times.txt)

echo "P50 (median): ${P50}s"
echo "P95: ${P95}s"
echo "P99: ${P99}s"
echo ""

# Cleanup
rm -rf ${TEMP_DIR}

# Exit status
if [ $TOTAL_FAIL -eq 0 ]; then
    echo "✅ All load tests passed!"
    echo ""
    echo "📊 Check /api/stats endpoint for detailed metrics:"
    echo "   curl ${STAGING_URL}/api/stats"
    exit 0
else
    echo "⚠️  Some requests failed. Success rate: ${SUCCESS_RATE}%"
    exit 1
fi
