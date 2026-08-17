# 🏗️ Coach Genie AI — Complete System Flow Diagram

> Full end-to-end flow of how every layer of the project works together.

---

## 1. 🌐 Top-Level Architecture Flow

```mermaid
flowchart TD
    subgraph BROWSER["🌐 User Browser / Device"]
        U1["👤 Admin User"]
        U2["🎓 Student User"]
        U3["👨‍👩‍👧 Parent User"]
    end

    subgraph FRONTEND["📦 Frontend Monorepo (PNPM + Turborepo)"]
        A1["apps/admin\n(Next.js 15)"]
        A2["apps/student\n(Next.js 15)"]
        A3["apps/parent\n(Next.js 15)"]
        PKG1["@coachgenie/api-client\n(Axios + Zustand + React Query)"]
        PKG2["@coachgenie/ui\n(Shared Component Library)"]
        MW["Next.js Middleware\n(JWT Verify + Route Guard)"]
    end

    subgraph BACKEND["⚙️ FastAPI Backend (Python 3.11)"]
        BE_MW["Middleware Layer\n(CORS · Rate Limiter · Exception Handler)"]
        BE_DEP["Dependency Injection\n(get_db · get_tenant · get_current_user · require_roles)"]
        BE_ROUTERS["API Routers /api/v1/...\nauth · students · fees · batches\nattendance · exams · dashboard\nleads · admissions · ai · reports"]
        BE_SVC["Services Layer\nfee.py · batch.py · notification.py"]
        BE_SCHED["Background Scheduler\n(APScheduler — Cron Jobs)"]
    end

    subgraph DB["🗄️ Data Layer"]
        PG[("PostgreSQL\nMain DB")]
        PGV[("pgvector\nVector Store")]
        REDIS[("Redis\nCache + Queues")]
    end

    subgraph AI["🤖 AI Copilot Microservice (FastAPI)"]
        AI_ROUTE["Routes\n/copilot · /reports"]
        AI_ORCH["Orchestrators\n(LangChain Agent)"]
        AI_RAG["RAG Pipeline\n(pgvector retrieval)"]
        AI_LLM["LLM Inference\n(Groq API)"]
        AI_PDF["PDF Generator\n(WeasyPrint)"]
    end

    subgraph NOTIF["📬 Notifications"]
        EMAIL["Email Provider\n(SMTP)"]
        NOTIF_DB["Notification Templates\n(PostgreSQL)"]
    end

    U1 --> A1
    U2 --> A2
    U3 --> A3

    A1 & A2 & A3 --> MW
    MW -->|"Valid JWT → inject headers"| PKG1
    MW -->|"No/Invalid JWT → redirect /login"| A1

    A1 & A2 & A3 --> PKG2

    PKG1 -->|"HTTP + Bearer Token\n+ x-tenant-id header"| BE_MW

    BE_MW --> BE_DEP
    BE_DEP --> BE_ROUTERS
    BE_ROUTERS --> BE_SVC
    BE_SVC --> PG
    BE_SVC --> REDIS

    BE_SCHED -->|"Overdue Fees\nLow Attendance Alerts"| NOTIF_DB
    BE_SCHED --> EMAIL

    BE_ROUTERS -->|"AI Insights Request"| AI_ROUTE
    AI_ROUTE --> AI_ORCH
    AI_ORCH --> AI_RAG
    AI_RAG --> PGV
    AI_ORCH --> AI_LLM
    AI_LLM --> AI_PDF
    AI_ORCH -->|"JSON Response"| BE_ROUTERS
    AI_PDF -->|"PDF Download"| BE_ROUTERS

    PG <-->|"SQLAlchemy Async ORM"| BE_SVC
    PGV <-->|"Vector Embeddings"| AI_RAG
```

---

## 2. 🔐 Authentication Flow (Login → JWT → Protected Request)

```mermaid
sequenceDiagram
    actor User
    participant FE as Next.js Frontend
    participant MW as Next.js Middleware
    participant AX as Axios (api-client)
    participant BE as FastAPI Backend
    participant DB as PostgreSQL

    User->>FE: Enter email + password on /login
    FE->>AX: POST /api/v1/auth/login
    AX->>BE: HTTP POST (no auth token yet)
    BE->>DB: SELECT User WHERE email=? AND tenant_id=?
    DB-->>BE: User row returned
    BE->>BE: bcrypt.verify(password, hash)
    BE-->>AX: { access_token, refresh_token, user }
    AX-->>FE: Store tokens in cookie (cg_access_token)\n+ Zustand store

    Note over FE,MW: Subsequent Navigation

    User->>FE: Navigate to /dashboard
    FE->>MW: Intercept request
    MW->>MW: Read cg_access_token cookie
    MW->>MW: jwtVerify(token, SECRET_KEY)
    MW-->>FE: Inject x-user-id, x-tenant-id, x-user-role headers
    FE->>AX: Fetch dashboard data
    AX->>BE: GET /api/v1/dashboard\n+ Authorization: Bearer <token>\n+ x-tenant-id: <tid>

    Note over BE: Dependency chain runs

    BE->>DB: Tenant lookup by x-tenant-id
    DB-->>BE: Tenant record (is_active=true)
    BE->>BE: decode_access_token(JWT)
    BE->>DB: SELECT User WHERE id=sub AND tenant_id=?
    DB-->>BE: User record
    BE-->>AX: { success: true, data: {...} }
    AX-->>FE: Render dashboard

    Note over AX,BE: Token Expiry Scenario

    AX->>BE: Any API call with expired token
    BE-->>AX: 401 Unauthorized
    AX->>AX: _retry flag set
    AX->>BE: POST /api/v1/auth/refresh\n{ refresh_token }
    BE-->>AX: { access_token, refresh_token }
    AX->>AX: Update Zustand store
    AX->>BE: Retry original request with new token
```

---

## 3. ⚙️ Backend Request Lifecycle (Dependency Injection Chain)

```mermaid
flowchart LR
    REQ["📨 Incoming HTTP Request\nPOST /api/v1/fees/invoices"]

    subgraph MIDDLEWARE["Middleware Pipeline"]
        M1["CORS Check\n(AllowedOrigins)"]
        M2["Rate Limiter\n(SlowAPI – IP based)"]
        M3["Exception Handler\n(Global try/except)"]
    end

    subgraph DEPS["Dependency Injection"]
        D1["get_db()\nOpen AsyncSession\n(PostgreSQL)"]
        D2["get_tenant()\nRead X-Tenant-Subdomain/ID\nValidate tenant.is_active"]
        D3["get_current_user()\nVerify JWT Bearer token\nLoad User model"]
        D4["require_roles('owner','counselor')\nCheck user.role\n→ ForbiddenError if denied"]
    end

    subgraph HANDLER["Route Handler"]
        H1["fees.router\ncreate_invoice()"]
        H2["fee_service\n(business logic)"]
        H3["FeeInvoice model\n(SQLAlchemy)"]
    end

    subgraph DB["Data Layer"]
        DB1[("PostgreSQL\n(scoped by tenant_id)")]
        DB2[("Redis Cache")]
    end

    REQ --> M1 --> M2 --> M3
    M3 --> D1 --> D2 --> D3 --> D4
    D4 --> H1
    H1 --> H2
    H2 --> H3
    H3 -->|"INSERT + COMMIT"| DB1
    H2 -->|"Cache invalidate"| DB2
    DB1 -->|"Row returned"| H2
    H2 -->|"Pydantic serialize"| H1
    H1 -->|"{ success: true, data: {...} }"| REQ
```

---

## 4. 🤖 AI Copilot Flow (RAG + LLM Report Generation)

```mermaid
sequenceDiagram
    actor Admin
    participant UI as Frontend (Admin App)
    participant BE as FastAPI Backend
    participant CP as Copilot Engine (FastAPI)
    participant ORCH as LangChain Orchestrator
    participant RAG as RAG Pipeline
    participant VDB as pgvector DB
    participant LLM as Groq LLM API
    participant PDF as WeasyPrint

    Admin->>UI: Click "Generate Weak Student Report"
    UI->>BE: POST /api/v1/ai-reports/weak-students\n+ Bearer Token + x-tenant-id
    BE->>BE: Auth + Tenant validation (deps)
    BE->>CP: Internal HTTP call → /reports/weak-students\n{ tenant_id, filters }

    CP->>ORCH: Invoke AI Agent
    ORCH->>RAG: Query: "fetch student performance data"
    RAG->>VDB: pgvector similarity search\n+ raw SQL for exam/attendance stats
    VDB-->>RAG: Student vectors + structured data
    RAG-->>ORCH: Context chunks assembled

    ORCH->>LLM: Prompt + Context → Groq API (llama3/mixtral)
    LLM-->>ORCH: AI-generated insights text

    ORCH->>PDF: Render HTML template\n+ inject AI text + charts
    PDF-->>ORCH: PDF binary (bytes)

    ORCH-->>CP: { report_url, insights_json }
    CP-->>BE: 200 OK { data }
    BE-->>UI: PDF download URL + AI insights JSON
    UI->>Admin: Display insights + Download PDF button
```

---

## 5. ⏰ Background Scheduler Flow (Automated Jobs)

```mermaid
flowchart TD
    APP["FastAPI App Startup\n(lifespan event)"]
    SCHED["APScheduler\nAsyncIOScheduler"]

    subgraph JOBS["Cron Jobs"]
        J1["🕛 notify_overdue_fees()\nDaily at midnight\nQuery: FeeInvoice.status IN pending,partial\nAND due_date < today"]
        J2["📉 Low Attendance Alerts\nWeekly cron\nAttendance % < threshold"]
        J3["📋 create_default_templates()\nStartup — seed Notification Templates\nfor all active tenants"]
    end

    subgraph ACTIONS["Actions"]
        A1["Load NotificationTemplate\nfrom DB"]
        A2["Render message body\n(studentName, amount, dueDate)"]
        A3["send_notifications()\nRoute: email / SMS"]
        A4["Log delivery status\nback to DB"]
    end

    APP --> SCHED
    SCHED --> J1
    SCHED --> J2
    SCHED --> J3

    J1 --> A1 --> A2 --> A3 --> A4
    J2 --> A1
```

---

## 6. 🏢 Multi-Tenancy Flow

```mermaid
flowchart LR
    subgraph TENANTS["Institute Tenants"]
        T1["Institute A\nsubdomain: inst-a"]
        T2["Institute B\nsubdomain: inst-b"]
        T3["Institute C\nsubdomain: inst-c"]
    end

    subgraph HEADERS["Every API Request"]
        H["x-tenant-id: <uuid>\nOR\nX-Tenant-Subdomain: inst-a"]
    end

    subgraph BACKEND["Backend Isolation"]
        TL["get_tenant()\nLookup Tenant table\nVerify is_active=true"]
        SQ["All DB queries scoped:\nWHERE tenant_id = tenant.id"]
    end

    subgraph DB["Single PostgreSQL Instance"]
        DB1[("Shared DB\n(Row-level tenant isolation)")]
    end

    T1 & T2 & T3 --> HEADERS
    HEADERS --> TL --> SQ --> DB1
```

---

## 7. 🗂️ Data Model Relationships

```mermaid
erDiagram
    TENANT {
        uuid id PK
        string subdomain
        bool is_active
    }
    USER {
        uuid id PK
        uuid tenant_id FK
        string email
        string role
        string password_hash
    }
    STUDENT {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        string name
    }
    BATCH {
        uuid id PK
        uuid tenant_id FK
        string name
        string subject
    }
    ATTENDANCE {
        uuid id PK
        uuid student_id FK
        uuid batch_id FK
        date date
        string status
    }
    EXAM {
        uuid id PK
        uuid batch_id FK
        uuid student_id FK
        int marks_obtained
        int total_marks
    }
    FEE_INVOICE {
        uuid id PK
        uuid student_id FK
        uuid tenant_id FK
        decimal amount
        date due_date
        string status
    }
    PAYMENT {
        uuid id PK
        uuid invoice_id FK
        decimal amount_paid
        date paid_on
    }

    TENANT ||--o{ USER : "has"
    TENANT ||--o{ STUDENT : "has"
    TENANT ||--o{ BATCH : "has"
    USER ||--|| STUDENT : "linked to"
    STUDENT ||--o{ ATTENDANCE : "records"
    BATCH ||--o{ ATTENDANCE : "tracks"
    STUDENT ||--o{ EXAM : "appears in"
    BATCH ||--o{ EXAM : "conducts"
    STUDENT ||--o{ FEE_INVOICE : "billed via"
    FEE_INVOICE ||--o{ PAYMENT : "settled by"
```

---

## 📋 Complete Stack Summary

| Layer | Technology | Key Files |
|:---|:---|:---|
| **Frontend Apps** | Next.js 15, Tailwind CSS, TypeScript | `client/apps/admin`, `student`, `parent` |
| **Route Guard** | Next.js Middleware (jose JWT) | `client/apps/admin/middleware.ts` |
| **API Client** | Axios, Zustand, React Query | `client/packages/api-client/src/` |
| **UI Library** | React, Tailwind | `client/packages/ui/` |
| **Backend Entry** | FastAPI, Uvicorn, asyncio | `backend/app/main.py` |
| **Middleware** | CORS, SlowAPI rate limiter | `backend/app/main.py` |
| **Auth & Deps** | JWT decode, bcrypt, RBAC | `backend/app/dependencies.py` |
| **Business Logic** | Service layer (fee, batch, notifications) | `backend/app/services/` |
| **DB Layer** | SQLAlchemy Async 2.0, Pydantic | `backend/app/models/`, `backend/app/database.py` |
| **Scheduler** | APScheduler (AsyncIO) | `backend/app/scheduler.py` |
| **AI Copilot** | FastAPI, LangChain, Groq LLM | `copilot_engine/` |
| **RAG** | pgvector, embedding retrieval | `copilot_engine/rag/` |
| **PDF Reports** | WeasyPrint | `copilot_engine/reports/` |
| **Database** | PostgreSQL + pgvector | Render hosted |
| **Cache** | Redis | Session / queue |
| **Deployment** | Render (Backend), Vercel (Frontend) | `render.yaml` |
