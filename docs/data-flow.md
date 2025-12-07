# Data Flow Diagram

This document visualizes the data flow through the German Insurance AI Agent backend system.

## Query Processing Flow

```
┌─────────────────────┐
│    User / Client    │
│  (Web/Mobile App)   │
└──────────┬──────────┘
           │
           │ POST Request
           │ { "question": "What is health insurance?" }
           │
           ↓
┌─────────────────────────────────────────────┐
│         Express API Server                   │
│                                              │
│         POST /api/query                      │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │   query.controller.js                  │ │
│  │   • Validate request                   │ │
│  │   • Extract question                   │ │
│  │   • Call RAG service                   │ │
│  └────────────────┬───────────────────────┘ │
└───────────────────┼─────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────────┐
│                   RAG Service                            │
│               (rag.service.js)                           │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  STEP 1: Generate Query Embedding                  │ │
│  │                                                     │ │
│  │  question: "What is health insurance?"             │ │
│  │       ↓                                            │ │
│  │  embedding.service.createEmbedding(question)       │ │
│  │       ↓                                            │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │      Vertex AI Embedding API                 │ │ │
│  │  │   (textembedding-gecko@latest)               │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  │       ↓                                            │ │
│  │  embedding: [0.234, -0.456, 0.789, ...] (768-dim) │ │
│  └────────────────────────────────────────────────────┘ │
│                    │                                     │
│                    ↓                                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │  STEP 2: Vector Similarity Search                  │ │
│  │                                                     │ │
│  │  embedding → Supabase Query                        │ │
│  │       ↓                                            │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │      Supabase PostgreSQL + pgvector          │ │ │
│  │  │                                              │ │ │
│  │  │  SELECT chunk_text, metadata                 │ │ │
│  │  │  FROM document_chunks                        │ │ │
│  │  │  ORDER BY embedding <=> $1                   │ │ │
│  │  │  LIMIT 5;                                    │ │ │
│  │  │                                              │ │ │
│  │  │  (Uses IVFFlat index for fast search)       │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  │       ↓                                            │ │
│  │  relevantChunks: [                                 │ │
│  │    { text: "Health insurance covers...", ... },   │ │
│  │    { text: "In Germany, there are two...", ... }, │ │
│  │    { text: "Private health insurance...", ... }   │ │
│  │  ]                                                 │ │
│  └────────────────────────────────────────────────────┘ │
│                    │                                     │
│                    ↓                                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │  STEP 3: Build Contextual Prompt                   │ │
│  │                                                     │ │
│  │  prompt = `                                        │ │
│  │    System: You are an insurance expert...         │ │
│  │                                                     │ │
│  │    Context:                                        │ │
│  │    ${relevantChunks.join('\n\n')}                 │ │
│  │                                                     │ │
│  │    Question: ${question}                           │ │
│  │                                                     │ │
│  │    Answer in German, be concise...                │ │
│  │  `                                                 │ │
│  └────────────────────────────────────────────────────┘ │
│                    │                                     │
│                    ↓                                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │  STEP 4: Generate Answer with LLM                  │ │
│  │                                                     │ │
│  │  prompt → llm.service.callLLM(prompt)              │ │
│  │       ↓                                            │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │      Vertex AI LLM API                       │ │ │
│  │  │   (gemini-pro or gemini-1.5-flash)           │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  │       ↓                                            │ │
│  │  answer: "Health insurance in Germany is..."      │ │
│  └────────────────────────────────────────────────────┘ │
│                    │                                     │
└────────────────────┼─────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────┐
│      Format JSON Response                    │
│                                              │
│  {                                           │
│    "question": "What is health insurance?",  │
│    "answer": "Health insurance in...",       │
│    "sources": [                              │
│      {                                       │
│        "document_id": "uuid-123",            │
│        "similarity": 0.89,                   │
│        "text": "Health insurance..."         │
│      }                                       │
│    ]                                         │
│  }                                           │
└──────────────────┬──────────────────────────┘
                   │
                   │ HTTP Response (200 OK)
                   │
                   ↓
┌─────────────────────┐
│    User / Client    │
│  Receives Answer    │
└─────────────────────┘
```

## Simplified Overview

```
User Query
    ↓
Express API (/api/query)
    ↓
RAG Service
    ├─ Embedding Service → Vertex AI (Create embedding)
    │                         ↓
    ├─ Vector Search → Supabase/pgvector (Find similar chunks)
    │                         ↓
    └─ LLM Service → Vertex AI (Generate answer)
    ↓
JSON Response
    ↓
User
```

## Component Interactions

```
┌──────────────────┐
│  Express Routes  │ ────────┐
└──────────────────┘         │
                             │
┌──────────────────┐         │
│   Controllers    │ ←───────┘
└──────────────────┘
         │
         ↓
┌──────────────────┐
│   RAG Service    │
└──────────────────┘
    │    │    │
    │    │    └──────────────────┐
    │    │                       │
    │    └───────────┐           │
    │                │           │
    ↓                ↓           ↓
┌─────────────┐  ┌─────────┐  ┌──────────┐
│ Embedding   │  │ Vector  │  │   LLM    │
│  Service    │  │ Search  │  │ Service  │
└─────────────┘  └─────────┘  └──────────┘
    │                │              │
    ↓                ↓              ↓
┌─────────────┐  ┌─────────┐  ┌──────────┐
│ Vertex AI   │  │Supabase │  │Vertex AI │
│ Embeddings  │  │pgvector │  │   LLM    │
└─────────────┘  └─────────┘  └──────────┘
```

## Data Transformation at Each Stage

```
INPUT (User)
├─ Raw text question: "What is health insurance?"
│
STAGE 1 (Embedding Service)
├─ Vector representation: [0.234, -0.456, 0.789, ..., 0.123]
│  (768 floating-point numbers)
│
STAGE 2 (Vector Search)
├─ Relevant context chunks:
│  [
│    "Health insurance in Germany provides coverage for...",
│    "There are two main types: public (GKV) and private (PKV)...",
│    "Employees earning below €69,300 must join GKV..."
│  ]
│
STAGE 3 (Prompt Building)
├─ Structured prompt:
│  System: You are an expert...
│  Context: [chunks]
│  Question: What is health insurance?
│  Instructions: Answer in German...
│
STAGE 4 (LLM Generation)
├─ Generated answer:
│  "Health insurance in Germany (Krankenversicherung) is a mandatory
│   form of coverage that ensures all residents have access to
│   healthcare services..."
│
OUTPUT (Response)
└─ JSON response with answer, sources, metadata
```

## Error Flow

```
User Query
    ↓
Express API
    ↓
Try {
    RAG Service
        ├─ Embedding Service → [ERROR: Vertex AI timeout]
        ├─ Vector Search → [ERROR: Supabase connection failed]
        └─ LLM Service → [ERROR: Rate limit exceeded]
}
    ↓
Catch (error) {
    ↓
    HTTP 500 Response
    {
      "error": "Failed to process query: Vertex AI timeout"
    }
}
    ↓
User receives error message
```

## Parallel vs Sequential Operations

```
SEQUENTIAL (Current Implementation)
────────────────────────────────
Time →
├─ Create Embedding (200ms)
│   ↓
├─ Vector Search (50ms)
│   ↓
├─ Build Prompt (5ms)
│   ↓
└─ LLM Call (1000ms)
    ↓
Total: ~1255ms


POTENTIAL OPTIMIZATION (Future)
────────────────────────────────
Time →
├─ Create Embedding (200ms) ┐
│                            ├─ Run in parallel
├─ Fetch Metadata (50ms)    ┘
│   ↓
├─ Vector Search (50ms)
│   ↓
├─ Build Prompt (5ms)
│   ↓
└─ LLM Call (1000ms)
    ↓
Total: ~1255ms (similar, but could cache embeddings)
```

## External API Calls

```
Backend Service
    │
    ├─→ Vertex AI Embedding API
    │   └─ POST https://...googleapis.com/v1/models/textembedding-gecko:predict
    │      Request: { "instances": [{"content": "question text"}] }
    │      Response: { "predictions": [{"embeddings": {...}}] }
    │
    ├─→ Supabase REST API
    │   └─ POST https://xxxxx.supabase.co/rest/v1/rpc/search_similar_chunks
    │      Request: { "query_embedding": [...], "match_count": 5 }
    │      Response: [{ "id": "...", "chunk_text": "...", "similarity": 0.89 }]
    │
    └─→ Vertex AI LLM API
        └─ POST https://...googleapis.com/v1/models/gemini-pro:generateContent
           Request: { "contents": [{"parts": [{"text": "prompt"}]}] }
           Response: { "candidates": [{"content": {"parts": [{"text": "answer"}]}}] }
```

## Summary

The data flows through four main stages:

1. **Embedding**: Text → Vector (768 dimensions)
2. **Retrieval**: Vector → Similar document chunks (top 5)
3. **Augmentation**: Chunks + Question → Contextual prompt
4. **Generation**: Prompt → AI-generated answer

Each stage transforms the data into a format suitable for the next stage, ultimately producing a natural language answer grounded in the insurance document database.
