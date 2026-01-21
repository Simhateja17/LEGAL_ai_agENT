# API Documentation - GET /api/insurers Endpoint

## Overview

The `/api/insurers` endpoint provides a powerful search and filtering interface for insurance companies with full support for German characters and pagination.

## Base URL

```
GET /api/insurers
```

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `search` | string | No | - | Search term for insurer name (case-insensitive, supports German characters ä, ö, ü, ß) |
| `bafin_id` | string | No | - | Filter by BaFin registration ID (requires schema update) |
| `insurance_type` | string | No | - | Filter by insurance type: `health`, `auto`, `life`, `home`, `liability` |
| `limit` | integer | No | 20 | Number of results per page (max: 100) |
| `offset` | integer | No | 0 | Number of results to skip (for pagination) |

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Allianz Versicherung",
      "description": "Leading German insurance company",
      "insurance_types": ["health", "life", "auto", "home"],
      "website": "https://www.allianz.de",
      "contact_email": "info@allianz.de",
      "contact_phone": "+49 89 3800 0",
      "created_at": "2025-12-09T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "count": 20,
    "limit": 20,
    "offset": 0,
    "page": 1,
    "totalPages": 8,
    "hasMore": true,
    "nextOffset": 20
  }
}
```

### Pagination Metadata

- `total`: Total number of insurers matching the query
- `count`: Number of insurers in current response
- `limit`: Results per page (from request)
- `offset`: Current offset (from request)
- `page`: Current page number (calculated)
- `totalPages`: Total pages available
- `hasMore`: Whether more results are available
- `nextOffset`: Offset for next page (null if no more results)

## Examples

### 1. Get All Insurers

```bash
GET /api/insurers
```

Returns first 20 insurers, ordered by name.

### 2. Search by Name

```bash
GET /api/insurers?search=Allianz
```

Returns insurers with "Allianz" in their name (case-insensitive).

### 3. Search with German Characters

```bash
# Search for Ärzte
GET /api/insurers?search=Ärzte

# Search for München
GET /api/insurers?search=München

# Search for Öffentliche
GET /api/insurers?search=Öffentliche
```

German characters (ä, ö, ü, ß) are fully supported in search.

### 4. Filter by Insurance Type

```bash
# Get health insurance providers
GET /api/insurers?insurance_type=health

# Get auto insurance providers
GET /api/insurers?insurance_type=auto

# Get life insurance providers
GET /api/insurers?insurance_type=life
```

### 5. Combined Search and Filter

```bash
GET /api/insurers?search=versicherung&insurance_type=health
```

Search for "versicherung" in name AND filter by health insurance type.

### 6. Pagination

```bash
# First page (default)
GET /api/insurers?limit=10

# Second page
GET /api/insurers?limit=10&offset=10

# Third page
GET /api/insurers?limit=10&offset=20
```

### 7. Case-Insensitive Search

```bash
# These return the same results:
GET /api/insurers?search=ALLIANZ
GET /api/insurers?search=allianz
GET /api/insurers?search=Allianz
```

## Error Responses

### 400 Bad Request

Invalid query parameters.

```json
{
  "success": false,
  "error": "Invalid limit parameter"
}
```

### 500 Internal Server Error

Database error or server issue.

```json
{
  "success": false,
  "error": "Failed to fetch insurers: Database connection failed"
}
```

### 504 Gateway Timeout

Query took too long (> 5 seconds).

```json
{
  "success": false,
  "error": "Database query timed out"
}
```

## Implementation Details

### Search Functionality

- Uses PostgreSQL `ILIKE` for case-insensitive pattern matching
- Supports partial matches (e.g., "vers" matches "Versicherung")
- Properly handles German characters without special encoding
- Searches the `name` field only

### Pagination

- Maximum 100 results per page
- Results ordered alphabetically by name
- Offset-based pagination (not cursor-based)
- Includes helpful metadata for building pagination UI

### Performance

- Query timeout: 5 seconds
- Indexed on `name` field for fast searches
- GIN index on `insurance_types` array for type filters
- Results are cached by the database

## Testing

### Setup Test Data

```bash
node test-insurers-endpoint.js
```

This creates sample insurers including ones with German characters.

### Manual Testing

```bash
# Start the server
npm start

# Test with curl
curl "http://localhost:3000/api/insurers?search=Allianz"

# Test German characters
curl "http://localhost:3000/api/insurers?search=Ärzte"

# Test pagination
curl "http://localhost:3000/api/insurers?limit=5&offset=0"
```

### Browser Testing

Open in browser:
- http://localhost:3000/api/insurers
- http://localhost:3000/api/insurers?search=Allianz
- http://localhost:3000/api/insurers?insurance_type=health
- http://localhost:3000/api/insurers?limit=5

## Completion Checklist

- ✅ **GET /api/insurers endpoint is implemented**
  - RESTful design
  - Proper error handling
  - Timeout protection

- ✅ **Search by name works correctly**
  - Case-insensitive search
  - Partial matching
  - ILIKE pattern matching

- ✅ **Pagination is functional**
  - Configurable limit (max 100)
  - Offset-based navigation
  - Complete pagination metadata
  - Next page offset included

- ✅ **German characters (ä, ö, ü) are searchable**
  - No encoding issues
  - Works with ILIKE
  - Proper Unicode support

- ✅ **Endpoint returns proper JSON**
  - Consistent structure
  - Success flag
  - Data array
  - Pagination metadata

- ✅ **Endpoint is documented**
  - Query parameters explained
  - Examples provided
  - Error responses documented
  - Testing instructions included

## Notes

### BaFin ID Support

The `bafin_id` parameter is documented but not yet functional. To enable:

1. Add `bafin_id` column to insurers table:
```sql
ALTER TABLE insurers ADD COLUMN bafin_id VARCHAR(50);
CREATE INDEX idx_insurers_bafin_id ON insurers(bafin_id);
```

2. Update the controller to uncomment the bafin_id filter

### Future Enhancements

- Add cursor-based pagination for better performance
- Support multiple insurance types in one query
- Add full-text search with ranking
- Add response caching
- Add rate limiting

## Related Endpoints

- `GET /api/insurers/:id` - Get specific insurer by ID
- `POST /api/query` - RAG-based question answering with insurance type filtering

---

# API Documentation - POST /api/query (RAG Search)

## Overview

The `/api/query` endpoint provides intelligent question answering using Retrieval-Augmented Generation (RAG). It searches through insurance documents using vector similarity and supports filtering by insurance type.

## Base URL

```
POST /api/query
```

## Request Body

```json
{
  "query": "Was ist eine Krankenversicherung?",
  "insuranceTypes": ["health", "life"],
  "matchCount": 5,
  "matchThreshold": 0.7
}
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | **Yes** | - | The question or search query in German or English |
| `insuranceTypes` | string or array | No | null | Filter results by insurance type(s). Single value: `"health"` or multiple: `["health", "life"]` |
| `matchCount` | integer | No | 5 | Number of similar document chunks to retrieve (1-20) |
| `matchThreshold` | float | No | 0.7 | Similarity threshold (0-1). Higher = more strict matching |
| `insurerId` | string (UUID) | No | null | Filter results to a specific insurer |

### Supported Insurance Types

- `health` - Health insurance (Krankenversicherung)
- `life` - Life insurance (Lebensversicherung)
- `auto` - Auto insurance (Autoversicherung)
- `home` - Home insurance (Wohngebäudeversicherung)
- `household` - Household contents (Hausratversicherung)
- `liability` - Liability insurance (Haftpflichtversicherung)

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "answer": "Eine Krankenversicherung ist eine Versicherung, die...",
  "sources": [
    {
      "text": "Die Krankenversicherung deckt medizinische Kosten...",
      "similarity": 0.89,
      "insurerId": "uuid",
      "insuranceType": "health",
      "rank": 1
    }
  ],
  "stats": {
    "totalResults": 5,
    "embeddingTime": "120ms",
    "searchTime": "85ms",
    "totalTime": "205ms",
    "matchThreshold": 0.7,
    "matchCount": 5,
    "insuranceTypesFilter": ["health"],
    "filteredByType": true
  }
}
```

### Response Fields

#### `answer`
The generated answer from the LLM based on retrieved context.

#### `sources`
Array of relevant document chunks used to generate the answer:
- `text`: Preview of the document chunk (first 200 characters)
- `similarity`: Cosine similarity score (0-1, higher = more relevant)
- `insurerId`: UUID of the insurer
- `insuranceType`: Type of insurance document
- `rank`: Result ranking (1 = most similar)

#### `stats`
Performance and filter metadata:
- `totalResults`: Number of chunks retrieved
- `embeddingTime`: Time to generate query embedding
- `searchTime`: Time to search vector database
- `totalTime`: Total query processing time
- `matchThreshold`: Similarity threshold used
- `matchCount`: Maximum results requested
- `insuranceTypesFilter`: Applied insurance type filter(s) or "none"
- `filteredByType`: Whether type filtering was applied

### Error Responses

#### 400 Bad Request - Missing Query
```json
{
  "success": false,
  "error": "Query parameter is required"
}
```

#### 400 Bad Request - Invalid Parameters
```json
{
  "success": false,
  "error": "Invalid matchCount: must be between 1 and 20"
}
```

#### 404 Not Found - No Results
```json
{
  "success": true,
  "answer": "Keine relevanten Informationen gefunden.",
  "sources": [],
  "stats": {
    "totalResults": 0,
    "insuranceTypesFilter": ["health"],
    "filteredByType": true
  }
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Search timed out after 5000ms"
}
```

## Examples

### 1. Basic Query (No Filter)

**Request:**
```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Was ist eine Krankenversicherung?"
  }'
```

**Response:**
```json
{
  "success": true,
  "answer": "Eine Krankenversicherung ist eine Versicherung...",
  "sources": [
    {
      "text": "Die gesetzliche Krankenversicherung (GKV) deckt...",
      "similarity": 0.92,
      "insuranceType": "health",
      "rank": 1
    }
  ],
  "stats": {
    "totalResults": 5,
    "totalTime": "234ms",
    "insuranceTypesFilter": "none",
    "filteredByType": false
  }
}
```

### 2. Query with Single Type Filter

**Request:**
```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Welche Leistungen sind abgedeckt?",
    "insuranceTypes": "health"
  }'
```

Filters results to only health insurance documents.

### 3. Query with Multiple Type Filters (OR Logic)

**Request:**
```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Versicherung für Familie",
    "insuranceTypes": ["health", "life"],
    "matchCount": 10,
    "matchThreshold": 0.75
  }'
```

Returns documents from **either** health **OR** life insurance (OR logic).

### 4. Query with Custom Parameters

**Request:**
```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Autoversicherung Kosten",
    "insuranceTypes": "auto",
    "matchCount": 3,
    "matchThreshold": 0.8
  }'
```

**Explanation:**
- `insuranceTypes: "auto"` - Only auto insurance documents
- `matchCount: 3` - Return top 3 most similar chunks
- `matchThreshold: 0.8` - Only chunks with >80% similarity

### 5. Query with Insurer Filter

**Request:**
```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Krankenversicherung Leistungen",
    "insurerId": "123e4567-e89b-12d3-a456-426614174000",
    "insuranceTypes": "health"
  }'
```

Filters to specific insurer AND health insurance type.

## Filter Behavior

### Single vs Multiple Types

- **Single type:** `"insuranceTypes": "health"`
  - Returns only health insurance documents
  
- **Multiple types:** `"insuranceTypes": ["health", "life"]`
  - Returns documents matching **any** of the specified types (OR logic)
  - Results are ranked by similarity across all matching types

### Filter Processing

1. **Validation:** Invalid types are filtered out (empty strings, null, etc.)
2. **Normalization:** Types are converted to lowercase
3. **Database Filtering:** Filter applied at SQL level (efficient)
4. **Similarity Ranking:** Results ranked by cosine similarity **after** filtering

### Edge Cases Handled

| Case | Behavior |
|------|----------|
| Empty array `[]` | Treated as no filter (returns all types) |
| Invalid types `["", null, "health"]` | Filters out invalid, keeps "health" |
| Unknown type `["xyz"]` | Returns empty results with appropriate message |
| No matching results | Returns empty sources array, informative message |

## Performance

### Typical Response Times

| Operation | Target | Typical |
|-----------|--------|---------|
| Embedding generation | <200ms | 50-150ms |
| Vector search | <300ms | 50-200ms |
| LLM answer generation | <5000ms | 1000-3000ms |
| **Total (with filter)** | <6000ms | 2000-4000ms |

### Optimization Tips

1. **Use filters:** Reduces search space, improves speed
2. **Lower matchCount:** Fewer results = faster (3-5 recommended)
3. **Higher threshold:** More strict matching = fewer results
4. **Batch queries:** If multiple queries, process in parallel

## Filtering vs Similarity

### Combined Approach

The endpoint uses a **filter-first, then rank** approach:

1. **Step 1 - Filter:** Database filters by insurance type (fast)
2. **Step 2 - Vector Search:** Searches within filtered documents
3. **Step 3 - Rank:** Results ranked by similarity score
4. **Step 4 - Return:** Top-k results returned

### Benefits

- ✅ **Efficient:** Filtering at database level (indexed)
- ✅ **Accurate:** Similarity ranking ensures relevance
- ✅ **Fast:** Combined approach optimizes both speed and quality
- ✅ **Flexible:** Can use filters independently or together

## Testing

### Setup

Ensure database has:
1. ✅ Insurers loaded
2. ✅ Documents with `insurance_type` field
3. ✅ Document chunks with embeddings
4. ✅ Vector index created

### Test Queries

```bash
# Test 1: No filter (all types)
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Versicherung"}'

# Test 2: Single type filter
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Versicherung", "insuranceTypes": "health"}'

# Test 3: Multiple types (OR)
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Versicherung", "insuranceTypes": ["health", "life"]}'

# Test 4: Invalid filter (should handle gracefully)
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Versicherung", "insuranceTypes": ["", null, "health"]}'

# Test 5: Empty results
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "xyz", "insuranceTypes": "unknown_type"}'
```

### Expected Behavior

✅ **Test 1:** Returns results from all insurance types  
✅ **Test 2:** Returns only health insurance results  
✅ **Test 3:** Returns health OR life insurance results  
✅ **Test 4:** Filters out invalid values, uses "health"  
✅ **Test 5:** Returns empty sources, no error

## Completion Checklist

- ✅ **Single insurance type filter works**
  - Accepts single string value
  - Filters results correctly
  - Returns only matching type

- ✅ **Multiple type filter works (array)**
  - Accepts array of strings
  - OR logic (matches any type)
  - Results ranked by similarity

- ✅ **Invalid filter values are handled gracefully**
  - Empty strings filtered out
  - Null values ignored
  - Invalid types handled
  - Logs warnings for debugging

- ✅ **Empty results return appropriate response**
  - No error thrown
  - Empty sources array
  - Informative stats
  - Proper message

- ✅ **API documentation is updated**
  - New parameters documented
  - Examples provided
  - Edge cases explained
  - Testing instructions included

- ✅ **Tested with various filter combinations**
  - Single type
  - Multiple types
  - Invalid values
  - No filter
  - Empty results

## Implementation Details

### SQL Function

The filtering is implemented in the `search_similar_chunks_filtered` PostgreSQL function:

```sql
CREATE OR REPLACE FUNCTION search_similar_chunks_filtered(
  query_embedding VECTOR(768),
  match_count INTEGER DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.7,
  insurance_types TEXT[] DEFAULT NULL
)
-- Function filters by insurance type at database level
-- before vector similarity search
```

### Service Function

Located in `src/services/rag.service.js`:

```javascript
export async function searchSimilarChunks(queryText, options = {}) {
  // Validates and normalizes insurance types
  // Calls search_similar_chunks_filtered
  // Returns enriched results with type info
}
```

### Validation Logic

1. Convert single value to array
2. Filter out empty/null/invalid values
3. Normalize to lowercase
4. Pass to SQL function
5. Log warnings for invalid inputs

## Future Enhancements

- Add insurance type autocomplete/suggestions
- Support complex filters (AND + OR combinations)
- Add date range filtering (document publication date)
- Cache frequently queried type combinations
- Add analytics for popular type combinations

## Related Documentation

- [RAG Search Completion](RAG_SEARCH_COMPLETION.md) - Implementation details
- [Smoke Test Guide](SMOKE_TEST_GUIDE.md) - Testing procedures
- [PGVECTOR Setup](PGVECTOR_SETUP_GUIDE.md) - Vector database setup

## Support

For issues or questions:
1. Check request body format
2. Verify insurance types are valid
3. Check database has documents of requested type
4. Review server logs for detailed errors
5. Ensure embeddings are loaded
