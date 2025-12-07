# German Insurance AI Agent Backend

A backend API service for an intelligent insurance assistant that uses Retrieval-Augmented Generation (RAG) to answer questions about German insurance products and policies.

## 🎯 Project Purpose

This backend powers an AI-driven insurance assistant that:
- Answers customer questions about insurance products
- Retrieves relevant information from a vector database
- Provides accurate, context-aware responses using LLM technology
- Handles queries about German insurance companies and their offerings

## 🛠️ Tech Stack

- **Runtime**: Node.js with ES Modules
- **Framework**: Express.js
- **Database**: Supabase with pgvector extension
- **AI/ML**: Google Vertex AI (Embeddings + LLM)
- **Architecture**: RAG (Retrieval-Augmented Generation)

## 📡 API Endpoints

### Health Check
```
GET /api/health
```
Returns server health status.

**Response:**
```json
{
  "status": "ok"
}
```

### Query Insurance Information
```
POST /api/query
```
Submit a question about insurance products.

**Request Body:**
```json
{
  "question": "What types of health insurance are available in Germany?"
}
```

**Response:**
```json
{
  "question": "What types of health insurance are available in Germany?",
  "answer": "AI-generated answer based on retrieved context",
  "sources": []
}
```

## 📁 Project Structure

```
german_insurance_backend/
├── src/
│   ├── index.js                    # Express server entry point
│   ├── routes/
│   │   ├── index.js                # Main router
│   │   ├── query.routes.js         # Query endpoint routes
│   │   └── insurers.routes.js      # Insurer management routes
│   ├── controllers/
│   │   ├── query.controller.js     # Handles query requests
│   │   └── insurers.controller.js  # Handles insurer operations
│   ├── services/
│   │   ├── rag.service.js          # RAG pipeline orchestration
│   │   ├── embedding.service.js    # Text embedding generation
│   │   └── llm.service.js          # LLM interaction
│   ├── middleware/                 # Express middleware
│   │   ├── errorHandler.js         # Global error handling
│   │   ├── validation.js           # Request validation
│   │   └── requestLogger.js        # Request logging
│   ├── db/
│   │   └── supabase.js             # Supabase client configuration
│   └── utils/                      # Utility functions
│       ├── retry.js                # Retry with backoff
│       └── timeout.js              # Timeout utilities
├── db/
│   ├── schema.sql                  # Database schema
│   ├── verify-pgvector.sql         # pgvector verification
│   └── migrations/                 # Migration scripts
│       ├── 001_initial_schema.sql
│       ├── rollback_001_initial_schema.sql
│       └── 002_sample_data.sql
├── scripts/
│   ├── test-pipeline.js            # Test data processing pipeline
│   └── data-processing/            # Data ingestion pipeline
│       ├── README.md               # Processing guide
│       ├── 01-clean-documents.js   # Text cleaning
│       ├── 02-chunk-documents.js   # Document chunking
│       ├── 03-generate-embeddings.js # Embedding generation
│       ├── 04-upload-to-supabase.js  # Database upload
│       ├── utils/                  # Processing utilities
│       │   ├── text-cleaner.js     # Text cleaning functions
│       │   ├── chunker.js          # Chunking algorithms
│       │   └── progress-tracker.js # Progress tracking
│       └── logs/                   # Processing logs
├── data/
│   ├── raw/                        # Raw insurance documents
│   │   ├── *.txt                   # Sample documents
│   │   └── metadata.json           # Document metadata
│   └── processed/                  # Processed data
│       ├── clean/                  # Cleaned documents
│       ├── chunks/                 # Document chunks
│       └── embeddings/             # Chunks with embeddings
├── docs/
│   ├── architecture.md             # System architecture
│   ├── data-flow.md                # Data flow diagrams
│   ├── day1-architecture.md        # Architecture & conventions
│   ├── day2-schema-design.md       # Database schema design
│   ├── day3-patterns.md            # Express patterns guide
│   ├── day4-rag-diagrams.md        # RAG pipeline diagrams
│   ├── day9-schema-finalization.md # Schema finalization & migrations
│   └── supabase-setup.md           # Database setup guide
├── test-connection.js              # Database connection test
├── test-query.js                   # API query test
├── .env.example                    # Environment template
├── package.json
└── README.md
```

## 🏗️ Architecture

This project follows a **layered architecture** with clear separation of concerns:

### Route → Controller → Service → Database Pattern

```
HTTP Request
     ↓
[Route + Middleware]    ← Define endpoints, attach validation
     ↓
[Controller]            ← Handle HTTP (req/res)
     ↓
[Service Layer]         ← Business logic & orchestration
     ↓
[Database/APIs]         ← Data access (Supabase, Vertex AI)
     ↓
HTTP Response
```

**Key Principles**:
- **Routes**: Define HTTP endpoints and middleware
- **Controllers**: Handle request/response, delegate to services
- **Services**: Contain business logic, call external APIs
- **Middleware**: Cross-cutting concerns (logging, errors, validation)
- **Utils**: Reusable helper functions

For detailed architecture documentation, see [`docs/day1-architecture.md`](docs/day1-architecture.md)

## 🔄 RAG Pipeline Explanation

The Retrieval-Augmented Generation pipeline works in four steps:

1. **Embedding Generation**: User questions are converted into vector embeddings using Vertex AI's embedding model
2. **Semantic Search**: The embedding is used to query Supabase/pgvector for the most relevant insurance document chunks
3. **Context Building**: Retrieved chunks are formatted into a prompt with the original question
4. **LLM Response**: The prompt is sent to Vertex AI's LLM, which generates a contextually accurate answer

This approach ensures responses are grounded in actual insurance documentation rather than relying solely on the LLM's training data.

**📊 For detailed visual diagrams and flow documentation, see:**
- [`docs/day4-rag-diagrams.md`](docs/day4-rag-diagrams.md) - Complete RAG pipeline diagrams
- [`docs/data-flow.md`](docs/data-flow.md) - Detailed data flow visualization
- [`docs/architecture.md`](docs/architecture.md) - System architecture overview

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Supabase account with pgvector enabled
- Google Cloud account with Vertex AI access

### Installation

1. Clone the repository
```bash
cd german_insurance_backend
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables

Create a `.env` file in the root directory:
```env
PORT=3000
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

4. Start the server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000`

## 📦 Data Processing Pipeline

### Process Sample Documents

Test the complete data ingestion pipeline:

```bash
# Run complete test with sample data
node scripts/test-pipeline.js

# Or run individual steps
npm run process:clean    # Clean raw documents
npm run process:chunk    # Chunk cleaned documents
npm run process:embed    # Generate embeddings
npm run process:upload   # Upload to Supabase
```

### Process Your Own Documents

1. **Add your documents** to `data/raw/` directory
2. **Update metadata** in `data/raw/metadata.json`
3. **Run the pipeline**:
```bash
npm run process:all
```

See `scripts/data-processing/README.md` for detailed documentation.

## 🧪 Testing the API

Test the health endpoint:
```bash
curl http://localhost:3000/api/health
```

Test database connection:
```bash
npm test
# or
node test-connection.js
```

Test a query:
```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is private health insurance?"}'
```

## 📝 Development Status

### Completed
- ✅ **Task 1-7**: Express server, routes, controllers, services, middleware
- ✅ **Task 8 (Day 2)**: Database schema design (3 tables, pgvector)
- ✅ **Task 9 (Day 9)**: Schema finalization & migrations (20+ indexes, 4 functions)
- ✅ **Task 10 (Day 10)**: Project organization & team coordination
- ✅ **Task 11 (Day 11)**: Git repository & configuration (.gitignore, package.json)
- ✅ **Task 12 (Day 12)**: Supabase setup & backend connection
- ✅ **Task 13 (Day 13)**: Data ingestion pipeline (4 scripts, 3 utilities, tested)

### In Progress
- 🔄 **Task 14**: Vertex AI embedding integration (production)
- 🔄 **Task 15**: RAG pipeline implementation & end-to-end testing

### Planned
- 📋 **Task 16+**: Production deployment, monitoring, optimization

## 📚 Documentation

### Core Documentation
- **Architecture**: [`docs/day1-architecture.md`](docs/day1-architecture.md) - Complete architecture guide
- **Database Schema**: [`docs/day2-schema-design.md`](docs/day2-schema-design.md) - Table designs & pgvector
- **Express Patterns**: [`docs/day3-patterns.md`](docs/day3-patterns.md) - Middleware & async patterns
- **RAG Pipeline**: [`docs/day4-rag-diagrams.md`](docs/day4-rag-diagrams.md) - Visual diagrams & data flow

### Implementation Guides
- **Schema Finalization**: [`docs/day9-schema-finalization.md`](docs/day9-schema-finalization.md) - Migration scripts & deployment
- **Supabase Setup**: [`docs/supabase-setup.md`](docs/supabase-setup.md) - Database configuration & connection
- **Team Coordination**: [`docs/coordination-guide.md`](docs/coordination-guide.md) - Workflow & responsibilities

### Evidence Guides
- **Day 2 Evidence**: [`docs/day2-evidence-guide.md`](docs/day2-evidence-guide.md) - Schema design verification
- **Day 9 Evidence**: [`docs/day9-evidence-guide.md`](docs/day9-evidence-guide.md) - Migration deployment
- **Day 10 Evidence**: [`docs/task10-evidence-guide.md`](docs/task10-evidence-guide.md) - Project organization
- **Day 12 Evidence**: [`docs/task12-evidence-guide.md`](docs/task12-evidence-guide.md) - Supabase setup verification

## 🤝 Contributing

This is a backend service for the German Insurance AI Agent project. For questions or contributions, please refer to the main project documentation.
