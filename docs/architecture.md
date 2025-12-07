# Architecture Documentation

This document describes the system architecture for the German Insurance AI Agent backend.

> **📊 For complete visual RAG pipeline diagrams, see [`day4-rag-diagrams.md`](day4-rag-diagrams.md)**

## System Overview

The backend is a Node.js/Express API that implements a Retrieval-Augmented Generation (RAG) pipeline to answer questions about German insurance products using vector similarity search and Large Language Models.

## High-Level Architecture

```
┌─────────────────┐
│   User/Client   │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────────────────────┐
│              Express Backend (Node.js)               │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │   Routes     │→ │ Controllers │→ │  Services   ││
│  │ /api/query   │  │   Handlers  │  │  RAG Logic  ││
│  └──────────────┘  └─────────────┘  └─────────────┘│
└────────┬────────────────────────────────────┬───────┘
         │                                     │
         ↓                                     ↓
┌─────────────────────┐           ┌──────────────────────┐
│   Vertex AI (GCP)   │           │  Supabase PostgreSQL │
│  ┌───────────────┐  │           │   ┌──────────────┐   │
│  │  Embeddings   │  │           │   │  pgvector    │   │
│  │   Model       │  │           │   │  Extension   │   │
│  └───────────────┘  │           │   └──────────────┘   │
│  ┌───────────────┐  │           │   ┌──────────────┐   │
│  │  LLM Model    │  │           │   │   Tables     │   │
│  │  (Gemini)     │  │           │   │ • insurers   │   │
│  └───────────────┘  │           │   │ • documents  │   │
└─────────────────────┘           │   │ • chunks     │   │
                                  │   └──────────────┘   │
                                  └──────────────────────┘
```

## 1. RAG Data Ingestion Flow

This process populates the vector database with insurance information.

```
┌──────────────┐
│  BaFin Data  │  (German financial regulatory documents,
│   Sources    │   insurance company policies, FAQs, etc.)
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────────────────────┐
│              Data Cleaning                        │
│  • Remove HTML/formatting                         │
│  • Extract text content                           │
│  • Normalize German characters (ä, ö, ü, ß)      │
│  • Filter irrelevant sections                     │
└──────────────────┬───────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────┐
│              Text Chunking                        │
│  • Split into semantic chunks (~500-1000 tokens) │
│  • Maintain context overlap (50-100 tokens)      │
│  • Preserve document metadata                    │
│  • Store chunk index and position                │
└──────────────────┬───────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────┐
│         Embedding Generation (Vertex AI)          │
│  • Convert each chunk to 768-dim vector          │
│  • Use textembedding-gecko or similar            │
│  • Batch process for efficiency                  │
└──────────────────┬───────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────┐
│      Store in Supabase (pgvector)                │
│  • INSERT into document_chunks table             │
│  • Store: text + embedding + metadata            │
│  • Automatically indexed with IVFFlat            │
└──────────────────────────────────────────────────┘
```

### Data Ingestion Steps

1. **Source Collection**: Gather insurance documents from BaFin, company websites, policy PDFs
2. **Cleaning**: Remove noise, extract clean text, normalize formatting
3. **Chunking**: Split documents into semantic chunks with overlap
4. **Embedding**: Generate vector embeddings using Vertex AI
5. **Storage**: Save chunks with embeddings in pgvector database

## 2. Query Pipeline (Runtime)

This is the flow when a user asks a question.

```
┌──────────────┐
│     User     │
└──────┬───────┘
       │
       │ POST {"question": "What is health insurance?"}
       ↓
┌─────────────────────────────────────────────────────┐
│          Express API: POST /api/query                │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────┐
│         Query Controller (query.controller.js)       │
│  • Extract question from request body                │
│  • Call RAG service                                  │
│  • Format response                                   │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────┐
│         RAG Service (rag.service.js)                 │
│                                                      │
│  Step 1: Create Query Embedding                     │
│  ┌────────────────────────────────────────────────┐ │
│  │ embedding.service.createEmbedding(question)    │ │
│  │          ↓                                     │ │
│  │   Vertex AI Embedding Model                    │ │
│  │          ↓                                     │ │
│  │   Returns: [0.23, -0.45, 0.12, ...] (768-dim) │ │
│  └────────────────────────────────────────────────┘ │
│                   │                                  │
│                   ↓                                  │
│  Step 2: Vector Similarity Search                   │
│  ┌────────────────────────────────────────────────┐ │
│  │ Query Supabase pgvector                        │ │
│  │ SELECT * FROM document_chunks                  │ │
│  │ ORDER BY embedding <=> query_embedding         │ │
│  │ LIMIT 5;                                       │ │
│  │          ↓                                     │ │
│  │ Returns: Top 5 most similar chunks            │ │
│  └────────────────────────────────────────────────┘ │
│                   │                                  │
│                   ↓                                  │
│  Step 3: Prompt Assembly                            │
│  ┌────────────────────────────────────────────────┐ │
│  │ Build prompt with:                             │ │
│  │ • System instructions                          │ │
│  │ • Retrieved context chunks                     │ │
│  │ • User question                                │ │
│  │ • Response format guidelines                   │ │
│  └────────────────────────────────────────────────┘ │
│                   │                                  │
│                   ↓                                  │
│  Step 4: LLM Call                                   │
│  ┌────────────────────────────────────────────────┐ │
│  │ llm.service.callLLM(prompt)                    │ │
│  │          ↓                                     │ │
│  │   Vertex AI LLM (Gemini)                       │ │
│  │          ↓                                     │ │
│  │   Returns: Generated answer                    │ │
│  └────────────────────────────────────────────────┘ │
│                   │                                  │
└───────────────────┼──────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────┐
│         Format JSON Response                         │
│  {                                                   │
│    "question": "What is health insurance?",          │
│    "answer": "Health insurance in Germany is...",    │
│    "sources": [                                      │
│      { "document_id": "...", "similarity": 0.89 }    │
│    ]                                                 │
│  }                                                   │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
┌──────────────┐
│     User     │  Receives answer
└──────────────┘
```

### Query Pipeline Steps

1. **Receive Question**: User sends POST request to `/api/query`
2. **Create Embedding**: Convert question to vector using Vertex AI
3. **Vector Search**: Query pgvector for similar document chunks (cosine similarity)
4. **Prompt Assembly**: Build context-rich prompt with retrieved chunks
5. **LLM Generation**: Send prompt to Vertex AI LLM for answer generation
6. **Return Response**: Send structured JSON with answer and sources

## 3. System Components

### Backend Services

```
src/
├── index.js                 # Express server setup
├── routes/                  # API endpoint definitions
│   ├── index.js            # Main router
│   ├── query.routes.js     # Query endpoints
│   └── insurers.routes.js  # Insurer management
├── controllers/             # Request handlers
│   ├── query.controller.js # Processes query requests
│   └── insurers.controller.js
├── services/                # Business logic
│   ├── rag.service.js      # RAG orchestration
│   ├── embedding.service.js # Vertex AI embeddings
│   └── llm.service.js      # Vertex AI LLM calls
└── db/
    └── supabase.js         # Database client
```

### Component Responsibilities

#### **Express Backend**
- REST API endpoints
- Request validation
- Error handling
- Response formatting
- CORS and security middleware

#### **RAG Service** (`rag.service.js`)
- Orchestrates the RAG pipeline
- Coordinates embedding, search, and LLM calls
- Manages context window
- Implements retrieval strategies

#### **Embedding Service** (`embedding.service.js`)
- Interfaces with Vertex AI embedding model
- Converts text to 768-dimensional vectors
- Handles batching for efficiency
- Caches embeddings when appropriate

#### **LLM Service** (`llm.service.js`)
- Interfaces with Vertex AI LLM (Gemini)
- Manages prompts and system instructions
- Handles response streaming (if needed)
- Implements retry logic and error handling

#### **Supabase PostgreSQL**
- Relational database for structured data
- Stores insurers, documents, and metadata
- Hosts pgvector extension
- Provides vector similarity search

#### **pgvector Extension**
- Enables vector storage in PostgreSQL
- Provides similarity search operations (cosine, L2, inner product)
- Supports indexes (IVFFlat, HNSW) for fast queries
- Scales to millions of vectors

### External Dependencies

```
┌─────────────────────────────────────────┐
│         Google Cloud Platform           │
│  ┌────────────────────────────────────┐ │
│  │      Vertex AI                     │ │
│  │  • textembedding-gecko (768-dim)   │ │
│  │  • gemini-pro (LLM)                │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│           Supabase Cloud                │
│  ┌────────────────────────────────────┐ │
│  │   PostgreSQL + pgvector            │ │
│  │  • Managed hosting                 │ │
│  │  • Automatic backups               │ │
│  │  • API access layer                │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## 4. Data Flow Diagram (Complete)

```
┌─────────────────────────────────────────────────────────────┐
│                    INGESTION PHASE (Once)                    │
└─────────────────────────────────────────────────────────────┘
        │
        ↓
  Raw Documents → Cleaning → Chunking → Embedding → pgvector
        │            │           │           │            │
     PDFs, Web    Remove    500-1000     Vertex AI    Supabase
     Content      Noise      tokens       768-dim     PostgreSQL

┌─────────────────────────────────────────────────────────────┐
│                    QUERY PHASE (Per Request)                 │
└─────────────────────────────────────────────────────────────┘

User Question
     ↓
  /api/query
     ↓
┌─────────────────────────────────────────────┐
│  1. Question → Embedding Service            │
│     "What is health insurance?"             │
│              ↓                              │
│     Vertex AI Embeddings                    │
│              ↓                              │
│     [0.23, -0.45, ...] (768-dim vector)     │
└─────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────┐
│  2. Vector → Supabase pgvector              │
│     SELECT ... ORDER BY embedding <=>       │
│              ↓                              │
│     Top 5 Similar Chunks                    │
│     • "Health insurance is..."              │
│     • "In Germany, there are..."            │
│     • "Private vs public..."                │
└─────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────┐
│  3. Context + Question → Prompt             │
│     System: You are an insurance expert...  │
│     Context: [retrieved chunks]             │
│     Question: What is health insurance?     │
└─────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────┐
│  4. Prompt → LLM Service                    │
│     Vertex AI (Gemini)                      │
│              ↓                              │
│     Generated Answer                        │
└─────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────┐
│  5. Format Response                         │
│     {                                       │
│       question: "...",                      │
│       answer: "...",                        │
│       sources: [...]                        │
│     }                                       │
└─────────────────────────────────────────────┘
     ↓
  JSON Response to User
```

## 5. Deployment Architecture (Future)

```
┌────────────────────────────────────────────────────┐
│              Google Cloud Platform                  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │         Cloud Run (Serverless)               │  │
│  │  ┌────────────────────────────────────────┐  │  │
│  │  │   Express Backend Container            │  │  │
│  │  │   • Auto-scaling                       │  │  │
│  │  │   • HTTPS endpoint                     │  │  │
│  │  │   • Environment variables              │  │  │
│  │  └────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────┘  │
│         │                                           │
│         ↓                                           │
│  ┌──────────────────────────────────────────────┐  │
│  │         Vertex AI Services                   │  │
│  │  • Embedding Model                           │  │
│  │  • LLM Model (Gemini)                        │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
         │
         ↓
┌────────────────────────────────────────────────────┐
│              Supabase (External)                    │
│  PostgreSQL + pgvector                             │
└────────────────────────────────────────────────────┘
```

### Deployment Features
- **Cloud Run**: Serverless container deployment with auto-scaling
- **Environment Variables**: Secure credential management
- **CI/CD**: Automated deployments from GitHub
- **Monitoring**: Cloud Logging and Error Reporting
- **Cost Optimization**: Pay-per-request pricing

## 6. Security Considerations

```
┌─────────────────────────────────────────────────┐
│              Security Layers                     │
├─────────────────────────────────────────────────┤
│  1. API Level                                   │
│     • Rate limiting                             │
│     • Input validation                          │
│     • CORS policies                             │
│                                                 │
│  2. Authentication (Future)                     │
│     • JWT tokens                                │
│     • API keys                                  │
│                                                 │
│  3. Database                                    │
│     • Service role key (backend only)           │
│     • Row-level security (RLS)                  │
│     • Encrypted connections                     │
│                                                 │
│  4. Secrets Management                          │
│     • Environment variables                     │
│     • Never commit .env to Git                  │
│     • Cloud Secret Manager (production)         │
└─────────────────────────────────────────────────┘
```

## 7. Performance Optimization

### Vector Search Optimization
- **IVFFlat Index**: Fast approximate nearest neighbor search
- **Appropriate `lists` parameter**: Balance speed vs accuracy
- **Query Limit**: Retrieve top 3-5 chunks (not 100)
- **Embedding Cache**: Cache frequent queries

### API Performance
- **Response Streaming**: Stream LLM responses for faster perceived performance
- **Batch Processing**: Process multiple embeddings together
- **Connection Pooling**: Reuse database connections
- **CDN**: Cache static responses when appropriate

## 8. Monitoring & Observability

```
Key Metrics to Track:
├── API Performance
│   ├── Response time (p50, p95, p99)
│   ├── Request rate
│   └── Error rate
├── RAG Pipeline
│   ├── Embedding generation time
│   ├── Vector search latency
│   ├── LLM response time
│   └── End-to-end query time
├── Database
│   ├── Query performance
│   ├── Connection pool usage
│   └── Storage size
└── Costs
    ├── Vertex AI API calls
    ├── Supabase usage
    └── Cloud Run execution time
```

## Summary

This architecture provides:
- ✅ Scalable RAG pipeline for insurance queries
- ✅ Efficient vector similarity search with pgvector
- ✅ Clean separation of concerns (routes → controllers → services)
- ✅ Integration with Google Vertex AI for embeddings and LLM
- ✅ Managed PostgreSQL with Supabase
- ✅ Ready for serverless deployment on Cloud Run

The system is designed to be modular, testable, and production-ready with clear data flows and component responsibilities.
