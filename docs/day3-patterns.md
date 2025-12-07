# Day 3: Express Architecture & AI Backend Patterns

## ✅ Completion Summary

This document details the Express.js architecture patterns, middleware implementation, and AI-specific backend patterns implemented for robust LLM operations.

---

## 1. Production-Ready Folder Structure

```
german_insurance_backend/
├── src/
│   ├── index.js                 # Server entry + middleware setup
│   ├── routes/                  # Route definitions (RESTful endpoints)
│   │   ├── index.js            # Main router
│   │   ├── query.routes.js     # Query endpoints
│   │   └── insurers.routes.js  # Insurer CRUD endpoints
│   ├── controllers/             # Request handlers (HTTP layer)
│   │   ├── query.controller.js
│   │   └── insurers.controller.js
│   ├── services/                # Business logic layer
│   │   ├── rag.service.js      # RAG pipeline orchestration
│   │   ├── embedding.service.js # Vector embedding generation
│   │   └── llm.service.js      # LLM API calls
│   ├── middleware/              # Express middleware
│   │   ├── errorHandler.js     # Global error handling
│   │   ├── validation.js       # Request validation
│   │   └── requestLogger.js    # Request/response logging
│   ├── db/                      # Database layer
│   │   └── supabase.js         # Supabase client
│   └── utils/                   # Utility functions
│       ├── retry.js            # Retry logic with backoff
│       └── timeout.js          # Timeout utilities
├── db/
│   └── schema.sql              # Database schema
└── docs/
    └── day3-patterns.md        # This file
```

### Why This Structure?

- **Separation of Concerns**: Each layer has a single responsibility
- **Scalability**: Easy to add new routes, controllers, services
- **Testability**: Each component can be unit tested independently
- **Maintainability**: Clear structure makes onboarding easier

---

## 2. Middleware Patterns

### A. Request Logging (`requestLogger.js`)

**Purpose**: Monitor all incoming requests and responses

```javascript
// Usage in index.js
app.use(requestLogger);
```

**What it does**:
- Logs timestamp, method, path for every request
- Logs request body for POST/PUT requests
- Logs response status code and duration
- Essential for debugging and monitoring

**Output example**:
```
[2025-12-06T10:30:45.123Z] POST /api/query
Request body: { "question": "What is health insurance?" }
[2025-12-06T10:30:46.234Z] POST /api/query - 200 (1111ms)
```

---

### B. Validation Middleware (`validation.js`)

**Purpose**: Validate and sanitize input before it reaches controllers

**Example: Query Validation**
```javascript
export const validateQuery = (req, res, next) => {
  const { question } = req.body;
  
  if (!question) {
    // Creates ValidationError
    return next(error);
  }
  
  // Sanitize and continue
  req.body.question = question.trim();
  next();
};
```

**Benefits**:
- Prevents invalid data from reaching business logic
- Centralized validation rules
- Consistent error responses
- Security: prevents injection attacks

**Applied in routes**:
```javascript
router.post('/', validateQuery, asyncHandler(handleQuery));
```

---

### C. Error Handling (`errorHandler.js`)

**Purpose**: Centralized error handling for graceful degradation

**Key Features**:

1. **Specific Error Types**
   - `ValidationError` → 400 Bad Request
   - `TimeoutError` → 504 Gateway Timeout
   - Rate limits → 429 Too Many Requests
   - Connection errors → 503 Service Unavailable

2. **Graceful Degradation**
   ```javascript
   if (err.name === 'TimeoutError') {
     return res.status(504).json({
       error: 'Request Timeout',
       message: 'The AI service took too long',
       fallback: 'Service temporarily unavailable'
     });
   }
   ```

3. **Async Error Wrapper**
   ```javascript
   export const asyncHandler = (fn) => {
     return (req, res, next) => {
       Promise.resolve(fn(req, res, next)).catch(next);
     };
   };
   ```
   
   **Why needed**: Express doesn't catch async errors automatically
   
   **Usage**:
   ```javascript
   router.post('/', asyncHandler(handleQuery)); // Catches all async errors
   ```

---

## 3. Async/Await Patterns for LLM APIs

### A. Timeout Handling (`timeout.js`)

**Problem**: LLM APIs can hang indefinitely

**Solution**: Wrap promises with timeout

```javascript
const answer = await withTimeout(
  callLLM(prompt),
  30000, // 30 second timeout
  'LLM generation timed out'
);
```

**How it works**:
```javascript
export function withTimeout(promise, timeoutMs, errorMessage) {
  return Promise.race([
    promise, // The actual operation
    new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error(errorMessage);
        error.name = 'TimeoutError';
        reject(error);
      }, timeoutMs);
    })
  ]);
}
```

**Promise.race**: Returns the first promise to resolve/reject

---

### B. Retry Logic with Exponential Backoff (`retry.js`)

**Problem**: Transient network failures, rate limits

**Solution**: Retry with increasing delays

```javascript
const result = await retryWithBackoff(
  async () => callAPI(),
  {
    maxRetries: 3,
    initialDelay: 1000,    // Start with 1s
    backoffMultiplier: 2,  // Double each time: 1s, 2s, 4s
    shouldRetry: isRetryableError
  }
);
```

**Retry Strategy**:
- Attempt 1: Immediate
- Attempt 2: Wait 1s
- Attempt 3: Wait 2s  
- Attempt 4: Wait 4s
- Then fail

**Smart Retry**: Only retry certain errors
```javascript
export function isRetryableError(error) {
  // Network errors
  if (error.code === 'ETIMEDOUT') return true;
  
  // HTTP errors
  const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
  if (retryableStatusCodes.includes(error.statusCode)) return true;
  
  return false; // Don't retry validation errors (400, 404)
}
```

---

### C. Complete RAG Pipeline with Error Handling

```javascript
export async function runRagPipeline(question) {
  try {
    // Step 1: Generate embedding WITH timeout
    const embedding = await withTimeout(
      createEmbedding(question),
      10000
    );

    // Step 2: Database query WITH retry
    const chunks = await retryWithBackoff(
      async () => {
        const { data, error } = await supabase.rpc('match_documents', {
          query_embedding: embedding
        });
        if (error) throw error;
        return data;
      },
      { maxRetries: 2, shouldRetry: isRetryableError }
    );

    // Step 3: Build context
    const context = chunks.map(c => c.chunk_text).join('\n\n');
    const prompt = buildPrompt(context, question);

    // Step 4: LLM call WITH timeout AND retry
    const answer = await withTimeout(
      retryWithBackoff(
        async () => callLLM(prompt),
        { maxRetries: 2 }
      ),
      30000
    );

    return { answer, sources: chunks };

  } catch (error) {
    // Graceful degradation
    if (error.name === 'TimeoutError') {
      throw error; // Let error handler provide user-friendly message
    }
    throw new Error(`Unable to process question: ${error.message}`);
  }
}
```

**Key Patterns**:
1. Each async operation has timeout protection
2. External API calls have retry logic
3. Errors are logged and transformed into user-friendly messages
4. Graceful degradation when services fail

---

## 4. RESTful API Design

### Endpoint Structure

```
GET    /api/health              # Health check
POST   /api/query               # Submit insurance question
GET    /api/insurers            # List all insurers
GET    /api/insurers/:id        # Get specific insurer
```

### Response Format

**Success Response**:
```json
{
  "success": true,
  "data": {
    "question": "What is health insurance?",
    "answer": "Health insurance covers...",
    "sources": [...],
    "metadata": {
      "processingTime": 1234,
      "timestamp": "2025-12-06T10:30:45.123Z"
    }
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Question is required",
  "details": {
    "field": "question",
    "issue": "missing"
  }
}
```

### HTTP Status Codes

- `200` OK - Successful request
- `400` Bad Request - Validation error
- `404` Not Found - Resource doesn't exist
- `429` Too Many Requests - Rate limited
- `500` Internal Server Error - Server error
- `503` Service Unavailable - External service down
- `504` Gateway Timeout - Request timed out

---

## 5. Controller → Service → Database Pattern

### Flow Diagram

```
Client Request
      ↓
  [Route + Validation Middleware]
      ↓
  [Controller]        ← HTTP concerns (req/res)
      ↓
  [Service Layer]     ← Business logic, orchestration
      ↓
  [Database/APIs]     ← Data access, external calls
      ↓
  [Controller]        ← Format response
      ↓
  Client Response
```

### Example: Query Processing

**1. Route** (`query.routes.js`)
```javascript
router.post('/', 
  validateQuery,           // Validate input
  asyncHandler(handleQuery) // Catch async errors
);
```

**2. Controller** (`query.controller.js`)
```javascript
export const handleQuery = async (req, res) => {
  const { question } = req.body; // Already validated
  
  // Delegate to service
  const result = await runRagPipeline(question);
  
  // Format HTTP response
  res.json({
    success: true,
    data: result
  });
};
```

**3. Service** (`rag.service.js`)
```javascript
export async function runRagPipeline(question) {
  // Business logic
  const embedding = await createEmbedding(question);
  const chunks = await searchDatabase(embedding);
  const answer = await callLLM(buildPrompt(chunks, question));
  
  return { answer, sources: chunks };
}
```

**4. Database/APIs** (`embedding.service.js`, `supabase.js`)
```javascript
export async function createEmbedding(text) {
  // Call Vertex AI API
  const response = await vertexAI.embed(text);
  return response.vector;
}
```

### Benefits

- **Separation of Concerns**: Each layer has one job
- **Reusability**: Services can be called from multiple controllers
- **Testability**: Mock services to test controllers
- **Flexibility**: Swap database/APIs without changing controllers

---

## 6. Streaming Support for LLM

### Why Streaming?

- Provides immediate feedback to users
- Better UX for long responses
- Reduces perceived latency

### Implementation

```javascript
export async function streamLLM(prompt, onChunk) {
  const stream = await model.generateContentStream(prompt);
  
  for await (const chunk of stream.stream) {
    onChunk(chunk.text()); // Callback for each piece
  }
}
```

### Controller with Streaming

```javascript
export const handleStreamingQuery = async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  
  await streamLLM(prompt, (chunk) => {
    res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
  });
  
  res.end();
};
```

---

## 7. Error Handling Strategies

### A. Timeout Errors

**Scenario**: LLM takes too long

**Handling**:
```javascript
try {
  const answer = await withTimeout(callLLM(prompt), 30000);
} catch (error) {
  if (error.name === 'TimeoutError') {
    return res.status(504).json({
      error: 'Request Timeout',
      message: 'AI service took too long. Please try a simpler question.'
    });
  }
}
```

### B. Rate Limiting

**Scenario**: Too many API calls

**Handling**:
```javascript
if (error.statusCode === 429) {
  return res.status(429).json({
    error: 'Rate Limit Exceeded',
    message: 'Too many requests. Please wait 60 seconds.',
    retryAfter: 60
  });
}
```

### C. Service Unavailable

**Scenario**: External API is down

**Handling**:
```javascript
if (error.code === 'ECONNREFUSED') {
  return res.status(503).json({
    error: 'Service Unavailable',
    message: 'AI service is temporarily down. Please try again later.',
    fallback: 'You can contact support at support@example.com'
  });
}
```

---

## 8. Testing the Implementation

### 1. Start the server
```bash
npm run dev
```

### 2. Test health check
```bash
curl http://localhost:3000/api/health
```

### 3. Test query with validation
```bash
# Valid request
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is health insurance?"}'

# Invalid request (missing question)
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 4. Check logs
You should see:
```
[2025-12-06T10:30:45.123Z] POST /api/query
Request body: { "question": "What is health insurance?" }
Step 1: Generating embedding for question...
Step 2: Searching for relevant documents...
Step 3: Building prompt with 5 relevant chunks...
Step 4: Generating answer with LLM...
Query processed in 1234ms
[2025-12-06T10:30:46.234Z] POST /api/query - 200 (1234ms)
```

---

## ✅ Day 3 Completion Checklist

- ✅ **Production folder structure** - Organized with routes, controllers, services, middleware, utils
- ✅ **Middleware patterns** - Logging, validation, error handling implemented
- ✅ **Async LLM handling** - Timeout and retry patterns for all AI operations
- ✅ **Architecture documentation** - This comprehensive guide
- ✅ **Controller → Service → Database** - Clear separation demonstrated in all endpoints

---

## Key Takeaways

1. **Middleware Order Matters**: Request logger → Routes → Error handler
2. **Always Use asyncHandler**: Wrap async route handlers to catch errors
3. **Timeout Everything**: External APIs must have timeout protection
4. **Retry Smartly**: Only retry transient errors, not validation failures
5. **Graceful Degradation**: Always provide helpful error messages
6. **Separate Concerns**: Controller (HTTP) → Service (Logic) → Database (Data)
7. **Log Everything**: Critical for debugging async operations
