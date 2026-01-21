# Deployment Guide

## Prerequisites

- Google Cloud Platform account
- Docker installed locally
- gcloud CLI installed and configured
- Supabase database setup and running

## Environment Variables

Ensure these environment variables are set in your deployment:

```bash
# Required
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
VERTEX_PROJECT_ID=your-gcp-project-id
VERTEX_LOCATION=us-central1

# Optional (with defaults)
PORT=8080
NODE_ENV=production
SERVER_TIMEOUT_MS=30000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CACHE_ENABLED=true
CACHE_TTL_SECONDS=300
CACHE_MAX_KEYS=1000
LOG_LEVEL=info
```

## Deployment Steps

### 1. Build Docker Image

```bash
# Build and tag the image
docker build -t gcr.io/PROJECT_ID/insurance-ai-backend .

# Test locally
docker run -p 8080:8080 \
  -e SUPABASE_URL=your-url \
  -e SUPABASE_ANON_KEY=your-key \
  -e VERTEX_PROJECT_ID=your-project \
  gcr.io/PROJECT_ID/insurance-ai-backend
```

### 2. Push to Google Container Registry

```bash
# Configure Docker to use gcloud
gcloud auth configure-docker

# Push the image
docker push gcr.io/PROJECT_ID/insurance-ai-backend
```

### 3. Deploy to Cloud Run

```bash
# Deploy with environment variables
gcloud run deploy insurance-ai-backend \
  --image gcr.io/PROJECT_ID/insurance-ai-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "SUPABASE_URL=your-url,SUPABASE_ANON_KEY=your-key,VERTEX_PROJECT_ID=your-project,VERTEX_LOCATION=us-central1,NODE_ENV=production,PORT=8080" \
  --memory 512Mi \
  --cpu 1 \
  --timeout 30 \
  --max-instances 10 \
  --min-instances 0
```

### 4. Get Deployment URL

```bash
# Get the service URL
gcloud run services describe insurance-ai-backend \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)'
```

## Alternative: Deploy Script

Use the provided deployment script:

```bash
# Make executable
chmod +x deploy.sh

# Run deployment
./deploy.sh YOUR_PROJECT_ID us-central1
```

## Verification

After deployment, verify:

1. **Health check:**
   ```bash
   curl https://YOUR_STAGING_URL/health
   ```

2. **API info:**
   ```bash
   curl https://YOUR_STAGING_URL/
   ```

3. **Search query:**
   ```bash
   curl -X GET "https://YOUR_STAGING_URL/api/query/search?q=health+insurance"
   ```

## Monitoring

- **Cloud Run Console:** https://console.cloud.google.com/run
- **Logs:** `gcloud run services logs read insurance-ai-backend --region us-central1`
- **Metrics:** View in Cloud Run console or use `/api/stats` endpoint

## Rollback

```bash
# List revisions
gcloud run revisions list --service insurance-ai-backend --region us-central1

# Rollback to previous revision
gcloud run services update-traffic insurance-ai-backend \
  --to-revisions REVISION_NAME=100 \
  --region us-central1
```

## Troubleshooting

### Container fails to start
- Check logs: `gcloud run services logs read insurance-ai-backend`
- Verify environment variables are set
- Test Docker image locally

### 502/503 errors
- Check if server is listening on PORT environment variable
- Verify database connection
- Check memory limits

### High latency
- Review `/api/stats` endpoint
- Check database indexes are created
- Verify cache is enabled
- Consider increasing resources (CPU/memory)

## Security

- Keep `SUPABASE_ANON_KEY` and other secrets secure
- Use Secret Manager for production:
  ```bash
  gcloud run services update insurance-ai-backend \
    --update-secrets SUPABASE_ANON_KEY=supabase-key:latest \
    --region us-central1
  ```
- Review IAM permissions
- Enable Cloud Armor for DDoS protection

## Cost Optimization

- Set `--min-instances 0` to scale to zero when not in use
- Monitor usage in Cloud Console
- Set up billing alerts
- Use caching to reduce database queries

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - id: auth
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
      
      - name: Build and push
        run: |
          gcloud builds submit --tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/insurance-ai-backend
      
      - name: Deploy
        run: |
          gcloud run deploy insurance-ai-backend \
            --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/insurance-ai-backend \
            --platform managed \
            --region us-central1 \
            --allow-unauthenticated
```
