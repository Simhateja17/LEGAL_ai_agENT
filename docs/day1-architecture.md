# Day 1: Project Architecture & Conventions

## Overview

This document defines the folder structure, routing patterns, naming conventions, and architectural decisions for the German Insurance AI Backend project.

---

## 1. Folder Structure ✅

### Decided Structure

```
german_insurance_backend/
├── src/                           # Source code
│   ├── index.js                   # Application entry point
│   ├── routes/                    # Route definitions
│   │   ├── index.js              # Main router aggregator
│   │   ├── query.routes.js       # Query endpoint routes
│   │   └── insurers.routes.js    # Insurer CRUD routes
│   ├── controllers/               # Request handlers (HTTP layer)
│   │   ├── query.controller.js   # Query business logic
│   │   └── insurers.controller.js # Insurer operations
│   ├── services/                  # Business logic & orchestration
│   │   ├── rag.service.js        # RAG pipeline orchestration
│   │   ├── embedding.service.js  # Vector embedding generation
│   │   └── llm.service.js        # LLM API interactions
│   ├── middleware/                # Express middleware
│   │   ├── errorHandler.js       # Global error handling
│   │   ├── validation.js         # Request validation
│   │   └── requestLogger.js      # Request/response logging
│   ├── db/                        # Database layer
│   │   └── supabase.js           # Supabase client configuration
│   └── utils/                     # Utility functions
│       ├── retry.js              # Retry with exponential backoff
│       └── timeout.js            # Timeout utilities
├── db/                            # Database scripts
│   ├── schema.sql                # Database schema definition
│   └── verify-pgvector.sql       # pgvector verification
├── docs/                          # Documentation
│   ├── architecture.md           # System architecture
│   ├── data-flow.md              # Data flow diagrams
│   ├── supabase-setup.md         # Database setup guide
│   ├── day3-patterns.md          # Express patterns guide
│   ├── day5-completion.md        # Supabase setup completion
│   └── day1-architecture.md      # This file
├── test-connection.js             # Database connection test
├── test-query.js                  # API query test
├── .env                           # Environment variables (not committed)
├── .env.example                   # Environment template
├── .gitignore                     # Git ignore rules
├── package.json                   # NPM dependencies
└── README.md                      # Project overview

```

### Rationale

**Why this structure?**
- **Separation of Concerns**: Each folder has a single, clear responsibility
- **Scalability**: Easy to add new routes, controllers, services without refactoring
- **Testability**: Each layer can be unit tested independently
- **Standard Practice**: Follows Express.js and Node.js community conventions
- **Team Onboarding**: Clear structure makes it easy for new developers to understand

**Layer Responsibilities**:
- `routes/` - Define HTTP endpoints, attach middleware
- `controllers/` - Handle HTTP request/response, validation
- `services/` - Business logic, external API calls, orchestration
- `middleware/` - Cross-cutting concerns (logging, error handling, auth)
- `db/` - Database connection and configuration
- `utils/` - Reusable helper functions

---

## 2. Routing Pattern ✅

### Pattern: Route → Controller → Service → Database

This is a layered architecture pattern that separates HTTP concerns from business logic.

```
HTTP Request
     ↓
[Route + Middleware]
     ↓
[Controller]          ← Handles HTTP (req/res)
     ↓
[Service Layer]       ← Business logic
     ↓
[Database/APIs]       ← Data access
     ↓
[Controller]          ← Format response
     ↓
HTTP Response
```

### Example Implementation

#### **Route Definition** (`src/routes/query.routes.js`)
```javascript
import { Router } from 'express';
import { handleQuery } from '../controllers/query.controller.js';
import { validateQuery } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// POST /api/query - Submit insurance question
router.post('/', validateQuery, asyncHandler(handleQuery));

export default router;
```

**Responsibility**: 
- Define HTTP method and path
- Attach validation middleware
- Wrap async handlers for error catching
- Export router for aggregation

---

#### **Controller** (`src/controllers/query.controller.js`)
```javascript
import { runRagPipeline } from '../services/rag.service.js';

export const handleQuery = async (req, res) => {
  const { question } = req.body; // Already validated by middleware
  
  // Delegate to service layer
  const result = await runRagPipeline(question);
  
  // Format HTTP response
  res.json({
    success: true,
    data: {
      question,
      answer: result.answer,
      sources: result.sources
    }
  });
};
```

**Responsibility**:
- Extract data from request
- Call appropriate service
- Format response for client
- Handle HTTP status codes
- NO business logic here

---

#### **Service** (`src/services/rag.service.js`)
```javascript
import { createEmbedding } from './embedding.service.js';
import { callLLM } from './llm.service.js';
import supabase from '../db/supabase.js';

export async function runRagPipeline(question) {
  // Business logic orchestration
  const embedding = await createEmbedding(question);
  const chunks = await searchDatabase(embedding);
  const answer = await callLLM(buildPrompt(chunks, question));
  
  return { answer, sources: chunks };
}
```

**Responsibility**:
- Orchestrate business logic
- Call external APIs (Vertex AI, Supabase)
- Transform and combine data
- Handle retries and timeouts
- NO HTTP concerns here

---

### Why This Pattern?

1. **Separation of Concerns**: Each layer has one job
2. **Reusability**: Services can be called from multiple controllers or even CLI scripts
3. **Testability**: Mock services to test controllers in isolation
4. **Maintainability**: Changes to business logic don't affect HTTP handling
5. **Flexibility**: Easy to swap implementations (e.g., change database without touching controllers)

### Express Router Organization

```javascript
// src/routes/index.js - Main router aggregator
import { Router } from 'express';
import queryRoutes from './query.routes.js';
import insurersRoutes from './insurers.routes.js';

const router = Router();

router.use('/query', queryRoutes);
router.use('/insurers', insurersRoutes);

export default router;
```

```javascript
// src/index.js - Mount all routes
import routes from './routes/index.js';

app.use('/api', routes);
```

**Result**:
- `/api/query` → query.routes.js
- `/api/insurers` → insurers.routes.js
- Easy to add new resource routes

---

## 3. File Naming Conventions ✅

### Established Conventions

#### **General Rules**
- Use **kebab-case** for file names: `query-controller.js`, `embedding-service.js`
- Use **camelCase** for variables and functions: `handleQuery`, `runRagPipeline`
- Use **PascalCase** for classes and React components: `EmbeddingService`, `QueryController`

#### **File Suffixes**

| Type | Suffix | Example |
|------|--------|---------|
| Route definitions | `.routes.js` | `query.routes.js` |
| Controllers | `.controller.js` | `query.controller.js` |
| Services | `.service.js` | `rag.service.js` |
| Middleware | `.js` or `.middleware.js` | `errorHandler.js` |
| Utilities | `.js` | `retry.js`, `timeout.js` |
| Database scripts | `.sql` | `schema.sql` |
| Documentation | `.md` | `architecture.md` |
| Tests | `.test.js` or `.spec.js` | `query.test.js` |

#### **Directory Naming**
- Plural for collections: `routes/`, `controllers/`, `services/`
- Singular for single-purpose: `middleware/`, `db/`, `docs/`

#### **Module Exports**

**Named exports** (preferred for multiple functions):
```javascript
// Good
export const handleQuery = async (req, res) => { ... };
export const handleQueryById = async (req, res) => { ... };
```

**Default exports** (for single primary export):
```javascript
// Good for client/config
const supabase = createClient(url, key);
export default supabase;
```

#### **Import Paths**
- Always use `.js` extension in imports (ES modules requirement)
- Use relative paths within `src/`: `'../services/rag.service.js'`
- Use package names for node_modules: `'express'`, `'@supabase/supabase-js'`

---

## 4. Architecture Alignment with Backend Diagram ✅

### System Architecture

Our implementation aligns with the standard three-tier architecture:

```
┌─────────────────────────────────────────────────────┐
│                  Presentation Layer                  │
│              (Client Applications)                   │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP/REST
                      ↓
┌─────────────────────────────────────────────────────┐
│                  Application Layer                   │
│                 (Express Backend)                    │
│                                                      │
│  Routes → Controllers → Services                    │
│    ↓          ↓             ↓                       │
│  HTTP      Validation    Business Logic             │
│  Routing   Response      Orchestration              │
│            Formatting    External APIs              │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ↓                           ↓
┌────────────────┐          ┌────────────────┐
│  Data Layer    │          │  External APIs │
│   (Supabase)   │          │  (Vertex AI)   │
│                │          │                │
│ • PostgreSQL   │          │ • Embeddings   │
│ • pgvector     │          │ • LLM (Gemini) │
│ • Tables       │          │                │
└────────────────┘          └────────────────┘
```

### How Our Code Maps to the Diagram

| Diagram Component | Our Implementation |
|-------------------|-------------------|
| **Client Layer** | External (web/mobile app) |
| **Routes** | `src/routes/*.routes.js` |
| **Controllers** | `src/controllers/*.controller.js` |
| **Services** | `src/services/*.service.js` |
| **Middleware** | `src/middleware/*.js` |
| **Database** | `src/db/supabase.js` + Supabase cloud |
| **External APIs** | Vertex AI (called from services) |

### RAG Pipeline Architecture

```
User Question
     ↓
[POST /api/query]
     ↓
[Query Controller] ───────→ [RAG Service]
                                 │
                     ┌───────────┼───────────┐
                     ↓           ↓           ↓
              [Embedding    [Vector     [LLM
               Service]     Search]     Service]
                  ↓            ↓            ↓
              [Vertex AI]  [Supabase]  [Vertex AI]
                  ↓            ↓            ↓
              768-dim      Relevant      Generated
              vector       chunks        answer
                     ↓           ↓           ↓
                     └───────────┼───────────┘
                                 ↓
                          [RAG Service]
                                 ↓
                          [Controller]
                                 ↓
                          JSON Response
```

**Implemented in**:
- `src/services/rag.service.js` - Orchestrates the pipeline
- `src/services/embedding.service.js` - Step 1: Generate query embedding
- `src/db/supabase.js` - Step 2: Vector similarity search
- `src/services/llm.service.js` - Step 3: Generate answer

---

## 5. Team Alignment Document ✅

### For New Developers

#### **Getting Started**

1. **Clone and Setup**
   ```bash
   git clone [repository-url]
   cd german_insurance_backend
   npm install
   cp .env.example .env
   # Edit .env with your credentials
   ```

2. **Verify Setup**
   ```bash
   node test-connection.js  # Test Supabase connection
   npm run dev              # Start development server
   ```

3. **Test API**
   ```bash
   curl http://localhost:3000/api/health
   ```

#### **Development Workflow**

1. **Creating a New Endpoint**
   ```
   Step 1: Define route in src/routes/[resource].routes.js
   Step 2: Create controller in src/controllers/[resource].controller.js
   Step 3: Implement service in src/services/[resource].service.js
   Step 4: Add validation middleware if needed
   Step 5: Test with curl or Postman
   ```

2. **Code Style**
   - Use ES modules (import/export)
   - Use async/await for async operations
   - Wrap async route handlers with `asyncHandler`
   - Add JSDoc comments for public functions
   - Use destructuring for cleaner code

3. **Error Handling**
   - All routes wrapped with `asyncHandler`
   - Throw errors in services, catch in error middleware
   - Use appropriate HTTP status codes
   - Provide user-friendly error messages

#### **Key Principles**

1. **Single Responsibility**: Each function/module does one thing well
2. **Don't Repeat Yourself (DRY)**: Extract common logic to utilities
3. **Fail Fast**: Validate early, fail loudly with clear errors
4. **Log Everything**: Use console.log or proper logger for debugging
5. **Test First**: Write tests before implementing features (when possible)

#### **Common Tasks**

**Adding a new route:**
```javascript
// 1. src/routes/new-resource.routes.js
import { Router } from 'express';
import { handleGet } from '../controllers/new-resource.controller.js';

const router = Router();
router.get('/', handleGet);
export default router;

// 2. src/routes/index.js
import newResourceRoutes from './new-resource.routes.js';
router.use('/new-resource', newResourceRoutes);
```

**Adding middleware:**
```javascript
// src/middleware/auth.js
export const authenticate = async (req, res, next) => {
  // Auth logic
  next();
};

// Use in route
router.get('/', authenticate, handleGet);
```

**Adding a service:**
```javascript
// src/services/new-feature.service.js
export async function processData(input) {
  // Business logic
  return result;
}
```

#### **Resources**

- **Documentation**: Check `docs/` for detailed guides
- **Architecture**: `docs/architecture.md` for system design
- **API Patterns**: `docs/day3-patterns.md` for Express patterns
- **Database**: `docs/supabase-setup.md` for Supabase setup

---

## 6. Architecture Decision Records

### ADR-001: Use ES Modules
**Decision**: Use ES modules (import/export) instead of CommonJS (require/module.exports)

**Rationale**:
- Modern JavaScript standard
- Better tree-shaking for production builds
- Native browser support
- Async module loading

**Implementation**: Add `"type": "module"` to package.json

---

### ADR-002: Controller → Service Separation
**Decision**: Separate HTTP handling (controllers) from business logic (services)

**Rationale**:
- Services can be reused across different controllers
- Easier to test business logic without HTTP mocking
- Business logic can be called from CLI scripts, jobs, etc.
- Clear separation of concerns

---

### ADR-003: Use Supabase for Database
**Decision**: Use Supabase (PostgreSQL + pgvector) instead of MongoDB or other NoSQL

**Rationale**:
- pgvector extension for efficient vector similarity search
- Strong data consistency (ACID transactions)
- Rich query capabilities with SQL
- Managed service with automatic backups

---

### ADR-004: Use Vertex AI for LLM
**Decision**: Use Google Vertex AI instead of OpenAI or other providers

**Rationale**:
- Enterprise-grade scalability
- Data residency compliance (important for German data)
- Integrated with Google Cloud ecosystem
- Cost-effective for production workloads

---

### ADR-005: Express Middleware for Error Handling
**Decision**: Use centralized error handling middleware instead of try-catch in every route

**Rationale**:
- DRY principle - single place for error formatting
- Consistent error responses across all endpoints
- Graceful degradation with user-friendly messages
- Easy to add logging/monitoring

---

## 7. Next Steps

### Immediate Tasks
- ✅ Folder structure defined
- ✅ Routing pattern established
- ✅ Naming conventions documented
- ✅ Architecture diagram aligned
- ✅ Team alignment guide created

### Future Enhancements
- [ ] Add unit tests for services
- [ ] Add integration tests for endpoints
- [ ] Set up CI/CD pipeline
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Implement authentication middleware
- [ ] Add rate limiting
- [ ] Set up monitoring and logging (e.g., Winston, Datadog)

---

## Summary

This document establishes the foundational architecture and conventions for the German Insurance AI Backend project. All team members should follow these patterns to ensure consistency, maintainability, and scalability.

**Key Takeaways**:
1. **Folder structure** follows industry best practices with clear separation
2. **Routing pattern** implements Route → Controller → Service → Database
3. **Naming conventions** use kebab-case for files, suffixes for types
4. **Architecture** aligns with three-tier design and RAG pipeline
5. **Team alignment** ensures everyone follows the same patterns

For questions or suggestions, refer to the team lead or create an issue in the project repository.
