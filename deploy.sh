#!/bin/bash

# Deployment script for Google Cloud Run
# Usage: ./deploy.sh PROJECT_ID REGION

set -e

# Check arguments
if [ "$#" -ne 2 ]; then
    echo "Usage: ./deploy.sh PROJECT_ID REGION"
    echo "Example: ./deploy.sh my-project us-central1"
    exit 1
fi

PROJECT_ID=$1
REGION=$2
SERVICE_NAME="insurance-ai-backend"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Starting deployment..."
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install it first."
    exit 1
fi

# Set project
echo "📋 Setting GCP project..."
gcloud config set project ${PROJECT_ID}

# Build and submit
echo "🏗️  Building Docker image..."
gcloud builds submit --tag ${IMAGE}

# Check if .env file exists for environment variables
if [ -f .env ]; then
    echo "⚠️  Found .env file. Make sure to set these variables in Cloud Run:"
    cat .env | grep -v '^#' | grep -v '^$'
    echo ""
fi

# Deploy to Cloud Run
echo "🚢 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 30 \
  --max-instances 10 \
  --min-instances 0

# Get service URL
echo ""
echo "✅ Deployment complete!"
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --format 'value(status.url)')

echo "🌐 Service URL: ${SERVICE_URL}"
echo ""
echo "📝 Next steps:"
echo "1. Set environment variables in Cloud Run console"
echo "2. Run smoke tests: ./smoke-test.sh ${SERVICE_URL}"
echo "3. Monitor logs: gcloud run services logs read ${SERVICE_NAME} --region ${REGION}"
