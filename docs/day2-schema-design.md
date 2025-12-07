# Day 2: Database Schema Design

Complete database schema design for the German Insurance AI Backend with pgvector support.

---

## Table of Contents

1. [Schema Overview](#1-schema-overview)
2. [Table Designs](#2-table-designs)
3. [Relationships](#3-relationships)
4. [pgvector Configuration](#4-pgvector-configuration)
5. [Indexes & Performance](#5-indexes--performance)
6. [Completion Checklist](#6-completion-checklist)

---

## 1. Schema Overview

The database schema consists of **three core tables** designed to support RAG (Retrieval-Augmented Generation) operations:

```
┌─────────────────┐
│    insurers     │  ← Company information from BaFin
└────────┬────────┘
         │ 1
         │
         │ N
┌────────┴────────┐
│   documents     │  ← Full insurance documents
└────────┬────────┘
         │ 1
         │
         │ N
┌────────┴────────────────┐
│  document_chunks        │  ← Chunked text + embeddings
│  (with VECTOR column)   │
└─────────────────────────┘
```

**Purpose**: Store insurance company data, documents, and text chunks with vector embeddings for semantic search.

---

## 2. Table Designs

### 2.1 `insurers` Table

Stores information about German insurance companies.

**Columns**:

| Column            | Type                      | Description                                  |
|-------------------|---------------------------|----------------------------------------------|
| `id`              | UUID (PK)                 | Unique identifier                            |
| `name`            | VARCHAR(255) NOT NULL     | Insurance company name                       |
| `description`     | TEXT                      | Company description                          |
| `website`         | VARCHAR(500)              | Company website URL                          |
| `insurance_types` | TEXT[]                    | Array of insurance types (health, auto, etc.)|
| `contact_email`   | VARCHAR(255)              | Contact email                                |
| `contact_phone`   | VARCHAR(50)               | Contact phone number                         |
| `created_at`      | TIMESTAMPTZ               | Record creation timestamp                    |
| `updated_at`      | TIMESTAMPTZ               | Last update timestamp                        |

**Example Data**:
```sql
INSERT INTO insurers (name, description, website, insurance_types) VALUES
('Allianz Deutschland', 'Leading German insurance provider', 'https://www.allianz.de', 
 ARRAY['health', 'life', 'auto', 'home']),
('AOK', 'Statutory health insurance', 'https://www.aok.de', 
 ARRAY['health']);
```

**Indexes**:
- Primary key on `id`
- Index on `name` for lookups
- GIN index on `insurance_types` for array searches

---

### 2.2 `documents` Table

Stores full insurance documents and policies.

**Columns**:

| Column          | Type                      | Description                                |
|-----------------|---------------------------|--------------------------------------------|
| `id`            | UUID (PK)                 | Unique identifier                          |
| `insurer_id`    | UUID (FK)                 | References `insurers(id)` ON DELETE CASCADE|
| `title`         | VARCHAR(500) NOT NULL     | Document title                             |
| `insurance_type`| VARCHAR(100)              | e.g., 'health', 'life', 'auto'             |
| `document_type` | VARCHAR(100)              | e.g., 'policy', 'terms', 'faq', 'brochure' |
| `source_url`    | VARCHAR(1000)             | Original document URL                      |
| `file_path`     | VARCHAR(500)              | Local file storage path                    |
| `language`      | VARCHAR(10)               | Document language (default 'de')           |
| `metadata`      | JSONB                     | Flexible additional metadata               |
| `created_at`    | TIMESTAMPTZ               | Record creation timestamp                  |
| `updated_at`    | TIMESTAMPTZ               | Last update timestamp                      |

**Example Data**:
```sql
INSERT INTO documents (insurer_id, title, insurance_type, document_type, source_url) VALUES
('uuid-of-allianz', 
 'Allianz Krankenversicherung - Allgemeine Versicherungsbedingungen', 
 'health', 
 'terms', 
 'https://www.allianz.de/gesundheit/krankenversicherung/avb.pdf');
```

**Indexes**:
- Primary key on `id`
- Foreign key index on `insurer_id`
- Index on `insurance_type` for filtering
- Index on `document_type` for filtering
- Index on `title` for text searches

---

### 2.3 `document_chunks` Table

Stores text chunks with vector embeddings for RAG pipeline.

**Columns**:

| Column        | Type                      | Description                                  |
|---------------|---------------------------|----------------------------------------------|
| `id`          | UUID (PK)                 | Unique identifier                            |
| `document_id` | UUID (FK)                 | References `documents(id)` ON DELETE CASCADE |
| `insurer_id`  | UUID (FK)                 | References `insurers(id)` ON DELETE CASCADE  |
| `chunk_text`  | TEXT NOT NULL             | Text content of the chunk                    |
| `chunk_index` | INTEGER NOT NULL          | Position in original document                |
| `token_count` | INTEGER                   | Number of tokens in chunk                    |
| `embedding`   | **VECTOR(768)**           | 768-dimensional embedding vector             |
| `metadata`    | JSONB                     | Additional metadata (page, section, etc.)    |
| `created_at`  | TIMESTAMPTZ               | Record creation timestamp                    |

**Key Features**:
- **`embedding VECTOR(768)`**: Stores 768-dimensional vectors from Vertex AI textembedding-gecko model
- **`chunk_text`**: Original text content (500-1000 tokens per chunk)
- **`chunk_index`**: Maintains original document order
- **`metadata`**: Stores flexible data like `{"page": 5, "section": "Leistungen"}`

**Example Data**:
```sql
INSERT INTO document_chunks (document_id, insurer_id, chunk_text, chunk_index, embedding) VALUES
('uuid-of-document', 
 'uuid-of-allianz',
 'Die Krankenversicherung übernimmt die Kosten für ambulante Behandlungen...',
 0,
 '[0.123, -0.456, 0.789, ...]'::vector); -- 768-dim vector
```

**Indexes**:
- Primary key on `id`
- Foreign key indexes on `document_id` and `insurer_id`
- Index on `chunk_index` for ordering
- **IVFFlat index on `embedding`** for fast vector similarity search (see below)

---

## 3. Relationships

### 3.1 Entity Relationship Diagram

```
insurers (1) ──────< (N) documents (1) ──────< (N) document_chunks
   │                       │                          │
   └───────────────────────┴──────────────────────────┘
   (document_chunks also references insurers directly)
```

### 3.2 Foreign Key Constraints

**`documents` → `insurers`**:
```sql
insurer_id UUID REFERENCES insurers(id) ON DELETE CASCADE
```
- One insurer can have many documents
- Deleting an insurer cascades to delete all its documents

**`document_chunks` → `documents`**:
```sql
document_id UUID REFERENCES documents(id) ON DELETE CASCADE
```
- One document can have many chunks
- Deleting a document cascades to delete all its chunks

**`document_chunks` → `insurers`**:
```sql
insurer_id UUID REFERENCES insurers(id) ON DELETE CASCADE
```
- Direct reference for quick insurer-filtered searches
- Denormalized for performance (avoids join in queries)

### 3.3 Cascade Behavior

**Example**: Deleting Allianz from `insurers`:
1. Deletes all Allianz documents from `documents`
2. Deletes all chunks from those documents in `document_chunks`
3. Maintains referential integrity automatically

---

## 4. pgvector Configuration

### 4.1 Extension Setup

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Enables pgvector extension for vector operations in PostgreSQL.

### 4.2 Vector Column Definition

```sql
embedding VECTOR(768)
```

**Key Details**:
- **Dimension**: 768 (matches Vertex AI textembedding-gecko model)
- **Data Type**: `VECTOR(768)` - native pgvector type
- **Storage**: ~3KB per embedding (768 floats × 4 bytes)
- **Purpose**: Store dense vector representations for semantic similarity search

### 4.3 Vector Similarity Operators

pgvector supports three distance metrics:

| Operator | Distance Type      | Use Case                          |
|----------|--------------------|-----------------------------------|
| `<=>`    | Cosine Distance    | **Recommended** for text embeddings |
| `<->`    | Euclidean (L2)     | Spatial data                      |
| `<#>`    | Inner Product      | Normalized vectors                |

**Cosine Distance** is used in this schema:
```sql
1 - (embedding <=> query_embedding) AS similarity
```
- Returns value between 0 (dissimilar) and 1 (identical)
- Invariant to vector magnitude (only direction matters)

### 4.4 Why 768 Dimensions?

**Vertex AI textembedding-gecko** outputs 768-dimensional vectors:
- Matches the embedding model dimension exactly
- No dimension reduction needed
- Optimal for semantic similarity in German text
- Industry standard (BERT-based models use 768)

---

## 5. Indexes & Performance

### 5.1 Vector Index: IVFFlat

```sql
CREATE INDEX idx_chunks_embedding_ivfflat 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**IVFFlat (Inverted File with Flat Compression)**:
- **Algorithm**: Approximate Nearest Neighbor (ANN) search
- **Lists Parameter**: 100 (recommended for ~10,000 rows)
  - Formula: `lists ≈ sqrt(number_of_rows)`
  - Adjust based on dataset size
- **Trade-off**: Speed vs. accuracy (95-99% recall)

**Performance**:
- **Without Index**: O(N) - scans all rows
- **With IVFFlat**: O(sqrt(N)) - scans ~100 lists
- **Speed Improvement**: 10-100x faster on large datasets

### 5.2 Alternative: HNSW Index

```sql
-- Commented out in schema.sql (uncomment if preferred)
CREATE INDEX idx_chunks_embedding_hnsw 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**HNSW (Hierarchical Navigable Small World)**:
- **Pros**: Generally faster than IVFFlat
- **Cons**: Uses more memory (~2-3x)
- **Use Case**: When memory is not a constraint

**Recommendation**: Start with IVFFlat, switch to HNSW if needed.

### 5.3 Standard Indexes

**Insurers**:
- `idx_insurers_name` on `name` (B-tree)
- `idx_insurers_insurance_types` on `insurance_types` (GIN - for array searches)

**Documents**:
- `idx_documents_insurer_id` on `insurer_id` (B-tree)
- `idx_documents_insurance_type` on `insurance_type` (B-tree)
- `idx_documents_document_type` on `document_type` (B-tree)

**Document Chunks**:
- `idx_chunks_document_id` on `document_id` (B-tree)
- `idx_chunks_insurer_id` on `insurer_id` (B-tree)
- `idx_chunks_chunk_index` on `chunk_index` (B-tree)

---

## 6. Query Functions

### 6.1 Vector Similarity Search Function

```sql
CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding VECTOR(768),
  match_count INTEGER DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  insurer_id UUID,
  chunk_text TEXT,
  similarity FLOAT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.insurer_id,
    dc.chunk_text,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    dc.metadata
  FROM document_chunks dc
  WHERE 1 - (dc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

**Usage Example**:
```javascript
// In Node.js with Supabase client
const { data, error } = await supabase.rpc('search_similar_chunks', {
  query_embedding: [0.123, -0.456, ...], // 768-dim array
  match_count: 5,
  similarity_threshold: 0.7
});
```

**Parameters**:
- `query_embedding`: 768-dimensional vector from user query
- `match_count`: Number of results to return (default: 5)
- `similarity_threshold`: Minimum similarity score (default: 0.7)

**Returns**:
- Top N most similar chunks with similarity scores
- Ordered by similarity (highest first)
- Includes metadata for context

---

## 7. Automatic Timestamp Updates

### 7.1 Trigger Function

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 7.2 Applied Triggers

```sql
CREATE TRIGGER update_insurers_updated_at
  BEFORE UPDATE ON insurers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Purpose**: Automatically update `updated_at` timestamp on record modification.

---

## 8. Sample Queries

### 8.1 Insert Sample Insurer

```sql
INSERT INTO insurers (name, description, website, insurance_types)
VALUES (
  'Allianz Deutschland',
  'One of the largest insurance providers in Germany',
  'https://www.allianz.de',
  ARRAY['health', 'life', 'auto', 'home', 'travel']
)
RETURNING id;
```

### 8.2 Insert Sample Document

```sql
INSERT INTO documents (insurer_id, title, insurance_type, document_type, source_url)
VALUES (
  'uuid-from-above',
  'Krankenversicherung - Allgemeine Bedingungen',
  'health',
  'terms',
  'https://www.allianz.de/gesundheit/krankenversicherung/avb.pdf'
)
RETURNING id;
```

### 8.3 Insert Sample Chunk with Embedding

```sql
INSERT INTO document_chunks (
  document_id, 
  insurer_id, 
  chunk_text, 
  chunk_index, 
  token_count,
  embedding,
  metadata
)
VALUES (
  'document-uuid',
  'insurer-uuid',
  'Die private Krankenversicherung bietet umfassenden Schutz...',
  0,
  150,
  '[0.123, -0.456, 0.789, ...]'::vector, -- 768 dimensions
  '{"page": 1, "section": "Leistungsumfang"}'::jsonb
);
```

### 8.4 Vector Similarity Search

```sql
-- Using the helper function
SELECT * FROM search_similar_chunks(
  '[0.987, -0.654, ...]'::vector, -- query embedding
  5,    -- top 5 results
  0.75  -- minimum 75% similarity
);

-- Or direct query
SELECT 
  id,
  chunk_text,
  1 - (embedding <=> '[0.987, -0.654, ...]'::vector) AS similarity
FROM document_chunks
ORDER BY embedding <=> '[0.987, -0.654, ...]'::vector
LIMIT 5;
```

### 8.5 Get All Chunks for a Document

```sql
SELECT 
  chunk_index,
  chunk_text,
  token_count,
  metadata
FROM document_chunks
WHERE document_id = 'specific-document-uuid'
ORDER BY chunk_index;
```

### 8.6 Find Documents by Insurer and Type

```sql
SELECT 
  d.title,
  d.document_type,
  d.source_url,
  i.name AS insurer_name
FROM documents d
JOIN insurers i ON d.insurer_id = i.id
WHERE i.name ILIKE '%Allianz%'
  AND d.insurance_type = 'health';
```

---

## 9. Schema Validation Checklist

### ✅ Completion Criteria

- [x] **All three tables designed** with appropriate columns
  - `insurers` - 9 columns with proper data types
  - `documents` - 10 columns with flexible metadata
  - `document_chunks` - 9 columns including vector embedding

- [x] **Relationships defined** between tables
  - `documents.insurer_id` → `insurers.id` (CASCADE)
  - `document_chunks.document_id` → `documents.id` (CASCADE)
  - `document_chunks.insurer_id` → `insurers.id` (CASCADE)

- [x] **Vector column matches embedding model**
  - `VECTOR(768)` matches Vertex AI textembedding-gecko
  - Cosine distance operator configured
  - IVFFlat index created for performance

- [x] **Schema documented and reviewed**
  - Complete table descriptions
  - Column purpose explained
  - Relationship diagram provided
  - Sample queries included

- [x] **Schema ready for implementation**
  - Located at `db/schema.sql`
  - Can be executed directly in Supabase
  - Includes indexes and helper functions
  - Production-ready with best practices

---

## 10. Next Steps

1. **Execute Schema**: Run `db/schema.sql` in Supabase SQL Editor
2. **Verify pgvector**: Use `db/verify-pgvector.sql` to check extension
3. **Test Connection**: Run `node test-connection.js` to validate setup
4. **Seed Data**: Insert sample insurers and documents for testing
5. **Generate Embeddings**: Implement data ingestion pipeline (Day 6+)

---

## 11. Performance Considerations

### Storage Estimates

For **1,000 documents** with **10,000 chunks**:
- `document_chunks` table: ~30MB (3KB per embedding)
- `documents` table: ~2MB
- `insurers` table: ~100KB
- **Total**: ~35MB

### Query Performance

With IVFFlat index on 100K chunks:
- Vector search: **50-100ms**
- Without index: **5-10 seconds**

### Scaling Recommendations

| Dataset Size | Lists (IVFFlat) | Expected Performance |
|--------------|-----------------|----------------------|
| 10K chunks   | 100             | 50ms                 |
| 100K chunks  | 300             | 100ms                |
| 1M chunks    | 1000            | 200ms                |

---

## 12. References

- **pgvector Documentation**: https://github.com/pgvector/pgvector
- **Supabase Vector Guide**: https://supabase.com/docs/guides/ai/vector-columns
- **Vertex AI Embeddings**: https://cloud.google.com/vertex-ai/docs/generative-ai/embeddings/get-text-embeddings
- **Schema File**: `db/schema.sql`
- **Verification Script**: `db/verify-pgvector.sql`

---

**Day 2 Complete! ✅** All database tables designed, relationships defined, and pgvector configured for RAG operations.
