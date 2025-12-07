# Data Processing Scripts

This directory contains scripts for cleaning, chunking, and preparing insurance documents for the RAG system.

## Purpose

These scripts handle the data ingestion pipeline:
1. **Cleaning**: Remove HTML, fix encoding, normalize text
2. **Chunking**: Split documents into 500-1000 token chunks
3. **Embedding**: Generate 768-dimensional embeddings via Vertex AI
4. **Storage**: Save to Supabase with pgvector

## Structure

```
scripts/data-processing/
├── README.md                 # This file
├── 01-clean-documents.js     # Text cleaning and normalization
├── 02-chunk-documents.js     # Document chunking with overlap
├── 03-generate-embeddings.js # Vertex AI embedding generation
├── 04-upload-to-supabase.js  # Store chunks with embeddings
└── utils/
    ├── text-cleaner.js       # Text cleaning utilities
    ├── chunker.js            # Chunking algorithms
    └── progress-tracker.js   # Track processing progress
```

## Scripts Overview

### 01-clean-documents.js
Cleans raw insurance documents:
- Removes HTML tags
- Fixes encoding issues (German umlauts)
- Normalizes whitespace
- Removes special characters
- Output: Clean text files

### 02-chunk-documents.js
Splits documents into chunks:
- Target: 500-1000 tokens per chunk
- Overlap: 50-100 tokens between chunks
- Preserves sentence boundaries
- Maintains context
- Output: JSON with chunk metadata

### 03-generate-embeddings.js
Generates vector embeddings:
- Uses Vertex AI textembedding-gecko
- 768-dimensional vectors
- Batch processing (100 chunks at a time)
- Rate limiting and retry logic
- Output: JSON with embeddings

### 04-upload-to-supabase.js
Uploads to database:
- Inserts chunks with embeddings
- Links to documents and insurers
- Batch inserts for performance
- Progress tracking
- Output: Database populated

## Usage

### Sequential Processing
```bash
# Step 1: Clean documents
node scripts/data-processing/01-clean-documents.js --input raw-data/ --output clean-data/

# Step 2: Chunk documents
node scripts/data-processing/02-chunk-documents.js --input clean-data/ --output chunks/

# Step 3: Generate embeddings
node scripts/data-processing/03-generate-embeddings.js --input chunks/ --output embeddings/

# Step 4: Upload to Supabase
node scripts/data-processing/04-upload-to-supabase.js --input embeddings/
```

### Full Pipeline
```bash
# Run entire pipeline
npm run process-documents

# Or with specific source
npm run process-documents -- --source bafin-docs/
```

## Data Flow

```
Raw Documents (PDF, HTML, TXT)
         ↓
   [01-clean-documents.js]
         ↓
   Clean Text Files
         ↓
   [02-chunk-documents.js]
         ↓
   JSON: chunks with metadata
         ↓
   [03-generate-embeddings.js]
         ↓
   JSON: chunks + 768-dim vectors
         ↓
   [04-upload-to-supabase.js]
         ↓
   Supabase (document_chunks table)
```

## Configuration

Create `.env` with required variables:
```env
# Vertex AI Configuration
VERTEX_AI_PROJECT_ID=your-project-id
VERTEX_AI_LOCATION=europe-west3
VERTEX_AI_EMBEDDING_MODEL=textembedding-gecko@003

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Processing Configuration
CHUNK_SIZE=800              # Target tokens per chunk
CHUNK_OVERLAP=75            # Overlap between chunks
BATCH_SIZE=100              # Embeddings per batch
MAX_RETRIES=3               # Retry failed API calls
```

## Input Data Format

### Expected Directory Structure
```
raw-data/
├── allianz/
│   ├── health-insurance-terms.pdf
│   ├── life-insurance-policy.pdf
│   └── metadata.json
├── aok/
│   ├── benefits-catalog.html
│   └── metadata.json
└── ergo/
    ├── home-insurance-faq.txt
    └── metadata.json
```

### Metadata Format
```json
{
  "insurer_id": "uuid-of-insurer",
  "insurer_name": "Allianz Deutschland",
  "documents": [
    {
      "filename": "health-insurance-terms.pdf",
      "title": "Krankenversicherung - Allgemeine Bedingungen",
      "insurance_type": "health",
      "document_type": "terms",
      "source_url": "https://www.allianz.de/gesundheit/avb.pdf",
      "language": "de"
    }
  ]
}
```

## Error Handling

All scripts include:
- Retry logic with exponential backoff
- Progress tracking and resume capability
- Detailed error logging
- Validation of input/output

## Performance Considerations

### Batch Processing
- Embeddings: 100 chunks per batch (~10 seconds)
- Database inserts: 500 chunks per batch
- Total processing: ~2 hours for 250 documents

### Rate Limits
- Vertex AI: 300 requests/minute
- Supabase: No hard limit (but batch for performance)

### Memory Usage
- Clean: ~100MB for 1000 documents
- Chunk: ~200MB (keeps documents in memory)
- Embed: ~500MB (batch processing)
- Upload: ~100MB (streaming inserts)

## Monitoring

Track progress with:
```bash
# View processing logs
tail -f scripts/data-processing/logs/processing.log

# Check chunk count
node scripts/data-processing/utils/count-chunks.js

# Verify embeddings
node scripts/data-processing/utils/verify-embeddings.js
```

## Testing

Test with sample data:
```bash
# Process single document
node scripts/data-processing/01-clean-documents.js --input test-data/sample.pdf --output test-output/

# Generate test embeddings
node scripts/data-processing/03-generate-embeddings.js --input test-chunks/ --dry-run
```

## Troubleshooting

### Common Issues

**1. PDF Extraction Fails**
- Install pdf-parse: `npm install pdf-parse`
- Check PDF is not encrypted
- Try alternative extractor

**2. Embedding API Errors**
- Verify Vertex AI credentials
- Check API quota limits
- Ensure chunks are not too long (max 2000 tokens)

**3. Database Upload Fails**
- Check Supabase connection
- Verify schema is deployed
- Check for duplicate chunk IDs

**4. Out of Memory**
- Reduce BATCH_SIZE
- Process fewer documents at once
- Increase Node.js heap: `node --max-old-space-size=4096`

## Dependencies

Required npm packages:
```json
{
  "pdf-parse": "^1.1.1",
  "cheerio": "^1.0.0-rc.12",
  "tiktoken": "^1.0.10",
  "@google-cloud/aiplatform": "^3.10.0",
  "@supabase/supabase-js": "^2.38.0",
  "dotenv": "^16.3.1",
  "progress": "^2.0.3"
}
```

Install all:
```bash
npm install pdf-parse cheerio tiktoken @google-cloud/aiplatform progress
```

## Future Enhancements

- [ ] Parallel processing for faster throughput
- [ ] Incremental updates (only process new documents)
- [ ] Support for more document formats (DOCX, RTF)
- [ ] Automatic quality checking of embeddings
- [ ] Web UI for monitoring progress
- [ ] Deduplication of similar chunks

## References

- Vertex AI Embeddings: https://cloud.google.com/vertex-ai/docs/generative-ai/embeddings
- Chunking Best Practices: See `docs/day4-rag-diagrams.md`
- Database Schema: See `docs/day2-schema-design.md`

---

**Status**: Scripts structure ready, implementation pending (Day 6+)
