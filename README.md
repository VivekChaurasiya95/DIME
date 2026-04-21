# DIME

Design and Development of a Data-Driven Idea Exploration and Market Analysis Platform

# DIME – Data-Driven Idea & Market Evaluation Platform

> **Master Technical & Product Document — v1.0 MVP**
> _Single source of truth for building DIME. Use this in any vibe-coding or AI-assisted IDE (Cursor, Windsurf, Antigravity, GitHub Copilot Agents) to scaffold and develop the platform._

---

**Project Name:** DIME – Data-Driven Idea & Market Evaluation Platform  
**Version:** v1.0 (MVP)  
**Project Type:** Web-based SaaS Analytics Dashboard  
**Document Type:** Master PRD + Design + Technical Specification  
**Project Owner:** Vivek Chaurasiya  
**Document Status:** Ready for Development  
**Target Environment:** React + Node.js + Python (ML)

---

## Table of Contents

1. [Executive Product Overview](#1-executive-product-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Schema](#4-database-schema)
5. [API Specification](#5-api-specification)
6. [Feature Specifications](#6-feature-specifications)
7. [UI/UX Design System](#7-uiux-design-system)
8. [Recommended Project Structure](#8-recommended-project-structure)
9. [Development Phases & Milestones](#9-development-phases--milestones)
10. [Dataset Strategy](#10-dataset-strategy)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [AI-Assisted Development Prompting Guide](#12-ai-assisted-development-prompting-guide)
13. [Future Roadmap](#13-future-roadmap)
14. [MVP Success Criteria](#14-mvp-success-criteria)

---

## 1. Executive Product Overview

DIME is a modern SaaS analytics web application designed to help developers, students, and startup founders **validate software ideas before investing time and resources into building them.**

The platform bridges a critical gap in early-stage product development: most builders start coding before verifying whether a problem actually exists in the market, whether competitors already dominate the space, and whether the technical feasibility matches the team's capacity. DIME solves this by providing structured, data-backed analysis through interactive visual dashboards.

### 1.1 Problem Statement

Engineers and students regularly build products that fail — not because of poor execution, but because the idea was never validated. Key failure drivers include:

- **No market research before building** — leading to building for no audience
- **Ignoring competitor saturation** — entering a market already dominated by mature products
- **Overestimating feasibility** — teams underestimate the complexity of implementation
- **Failure to identify real user pain points** — building features users don't actually need

### 1.2 Solution

DIME analyzes a software idea submitted by the user and generates structured insights across five key dimensions:

| Dimension         | What It Measures                                     | Data Source                         |
| ----------------- | ---------------------------------------------------- | ----------------------------------- |
| Novelty Index     | How unique the idea is compared to existing projects | GitHub repos, App Store data        |
| Market Saturation | Competitor density across relevant domains           | App review datasets, market surveys |
| Feasibility Score | Technical, team, legal, and capital feasibility      | Developer survey datasets           |
| Opportunity Score | Unexplored market gaps worth pursuing                | Trend datasets, complaint clusters  |
| Risk Indicator    | Overall risk level based on all dimensions           | Composite score                     |

### 1.3 Target Users

| User Type            | Profile                             | Primary Use Case                                  |
| -------------------- | ----------------------------------- | ------------------------------------------------- |
| Engineering Students | Final year / hackathon participants | Validate project ideas for college submissions    |
| Indie Developers     | Solo devs, freelancers              | Market-validate a side project before building    |
| Startup Founders     | Early-stage, pre-seed               | Data-backed pitch preparation and pivot decisions |
| Product Managers     | Mid-level PMs at startups           | Competitive landscape research                    |
| Tech Researchers     | Academic / industry researchers     | Market trend and opportunity analysis             |

### 1.4 Product Goals

**Primary Goals**

1. Provide a structured idea validation workflow from input to visual insights
2. Offer interactive analytics dashboards driven by real datasets
3. Help users identify market opportunities before coding begins
4. Enable users to organise, track, and compare multiple ideas in one workspace

**Secondary Goals**

1. Serve as an educational tool to teach data-driven product thinking
2. Function as a hackathon ideation assistant
3. Build intuition for market research through visual exploration

---

## 2. System Architecture

DIME follows a layered, decoupled architecture. The frontend and backend are independently deployable. The ML/data processing layer is a standalone Python service.

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│              Presentation Layer                     │
│     React + TypeScript + Tailwind CSS + Recharts    │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP / REST
┌─────────────────────▼───────────────────────────────┐
│               API Gateway Layer                     │
│            Node.js + Express + Zod                  │
└──────────┬──────────────────────┬───────────────────┘
           │                      │ HTTP
┌──────────▼──────────┐  ┌────────▼──────────────────┐
│  Business Logic     │  │   ML / Data Processing    │
│  Node.js Services   │  │  Python + FastAPI         │
│  Auth, CRUD, Cache  │  │  Pandas + Scikit-learn    │
└──────────┬──────────┘  └────────┬──────────────────┘
           │                      │
┌──────────▼──────────────────────▼──────────────────┐
│              Data Storage Layer                     │
│       PostgreSQL (primary) + Redis (cache)          │
└─────────────────────────────────────────────────────┘
```

| Layer                      | Responsibility                                                   | Technology                     |
| -------------------------- | ---------------------------------------------------------------- | ------------------------------ |
| Presentation Layer         | React dashboard UI, routing, state management, chart rendering   | React + TypeScript             |
| API Gateway Layer          | REST API endpoints, auth middleware, request validation          | Node.js + Express              |
| Business Logic Layer       | Idea analysis orchestration, score computation, data aggregation | Node.js services               |
| ML / Data Processing Layer | Dataset preprocessing, NLP on reviews, scoring algorithms        | Python + Pandas + Scikit-learn |
| Data Storage Layer         | User data, idea records, analysis results, dataset metadata      | PostgreSQL + Redis (cache)     |
| Static Assets              | UI assets, dataset previews, generated icons                     | Vercel CDN / S3                |

### 2.2 Data Flow

The complete idea analysis flow follows these steps:

1. User submits idea form (title, description, domain, tech familiarity, team size, timeline)
2. Frontend sends `POST /api/analyze` to the Node.js API
3. API validates input and dispatches request to the Python ML service
4. Python service loads relevant datasets, runs NLP and scoring models
5. Scores (Novelty, Saturation, Feasibility, Opportunity, Risk) are returned as JSON
6. API stores result in PostgreSQL and returns structured payload to frontend
7. React dashboard renders charts and insight panels with the received data

### 2.3 ML / Scoring Engine Design

The core intelligence of DIME lives in the Python processing layer.

#### Novelty Index Algorithm

Measures how unique the idea is relative to existing GitHub repositories and App Store categories.

- **Input:** idea title + description (as text)
- **Process:** TF-IDF vectorisation of idea text → cosine similarity against GitHub repo descriptions
- **Score:** `100 - (max_similarity * 100)` → higher score = more novel
- **Output:** 0–100 integer (e.g., 84)

#### Market Saturation Score

Measures how crowded the chosen market segment is.

- **Input:** selected domain (e.g., SaaS, AI/ML, FinTech)
- **Process:** count of active projects in domain from App Store + GitHub data → normalised against total dataset
- **Score:** logarithmic scale 0–100 (100 = very saturated)
- **Output:** integer with direction label: Low / Moderate / High / Saturated

#### Feasibility Score

Multi-dimensional feasibility scored across four pillars:

| Pillar               | Weight | How It Is Scored                                           |
| -------------------- | ------ | ---------------------------------------------------------- |
| Technology Readiness | 35%    | Cross-referenced against tech stack familiarity input      |
| Team Capacity        | 25%    | Based on team size vs project complexity estimate          |
| Capital Requirements | 20%    | Estimated based on domain and timeline                     |
| Legal & Compliance   | 20%    | Hardcoded risk levels per domain (e.g., HealthTech = high) |

#### Opportunity Score

Identifies white-space opportunities by analysing user complaint clusters from App Store review datasets.

- NLP clustering (K-Means or DBSCAN) on negative reviews to identify recurring pain points
- Pain points not addressed by top 10 competitors in the domain = opportunities
- `Score = (unaddressed pain clusters / total pain clusters) * 100`

#### Risk Indicator

Composite risk score combining all four metrics:

```
Risk = (Saturation × 0.3) + (1 - Feasibility) × 0.4 + (1 - Novelty) × 0.3
```

**Output:** Low Risk / Moderate Risk / High Risk / Critical Risk

---

## 3. Technology Stack

### 3.1 Frontend Stack

| Technology                 | Version / Notes | Purpose                                                        |
| -------------------------- | --------------- | -------------------------------------------------------------- |
| React                      | v18+            | Core UI library                                                |
| TypeScript                 | v5+             | Type safety, better IDE autocomplete                           |
| Tailwind CSS               | v3+             | Utility-first styling — fast UI development                    |
| React Router               | v6              | Client-side page routing                                       |
| Recharts                   | v2+             | Line, bar, radar charts — React-native, responsive             |
| Chart.js + react-chartjs-2 | v4              | Additional chart types (bubble/scatter for Opportunity Matrix) |
| Zustand                    | v4              | Lightweight global state management                            |
| Lucide React               | Latest          | Minimal outline icon set                                       |
| Shadcn/ui                  | Latest          | Pre-built accessible UI primitives                             |
| Framer Motion              | v10+ (Phase 4)  | Animations — add after MVP is stable                           |

### 3.2 Backend Stack

| Technology         | Version / Notes | Purpose                                  |
| ------------------ | --------------- | ---------------------------------------- |
| Node.js            | v20 LTS         | Runtime for API server                   |
| Express.js         | v4              | HTTP server and routing                  |
| Zod                | v3              | Runtime schema validation for API inputs |
| JWT (jsonwebtoken) | v9              | Stateless authentication tokens          |
| bcryptjs           | v2              | Password hashing                         |
| Axios              | v1              | HTTP client for internal service calls   |
| dotenv             | v16             | Environment variable management          |
| cors               | v2              | CORS middleware                          |
| helmet             | v7              | Security headers                         |

### 3.3 Data / ML Stack (Python)

| Technology   | Version / Notes | Purpose                                            |
| ------------ | --------------- | -------------------------------------------------- |
| Python       | 3.11+           | Runtime for ML processing                          |
| FastAPI      | v0.110+         | Lightweight API wrapper for ML service             |
| Pandas       | v2+             | Dataset loading and manipulation                   |
| Scikit-learn | v1.4+           | TF-IDF, K-Means clustering, cosine similarity      |
| NumPy        | v1.26+          | Numerical operations                               |
| NLTK / spaCy | Latest          | Text preprocessing, tokenisation, stopword removal |
| Uvicorn      | Latest          | ASGI server to run FastAPI                         |

### 3.4 Database

| Technology     | Purpose                      | Notes                                                  |
| -------------- | ---------------------------- | ------------------------------------------------------ |
| PostgreSQL v16 | Primary relational database  | Stores users, ideas, analysis results                  |
| Redis v7       | Caching layer                | Cache analysis results for 24h to avoid re-computation |
| Prisma ORM     | Database access from Node.js | Type-safe queries, migrations                          |

### 3.5 Deployment & Infrastructure

| Service             | Purpose                      | Notes                                       |
| ------------------- | ---------------------------- | ------------------------------------------- |
| Vercel              | Frontend deployment          | Auto CI/CD from GitHub, CDN, edge functions |
| Railway / Render    | Backend API deployment       | Node.js + PostgreSQL hosting                |
| Fly.io / Modal      | Python ML service deployment | Serverless GPU-optional Python containers   |
| GitHub Actions      | CI/CD pipeline               | Lint, test, deploy on merge to main         |
| Supabase (optional) | Managed PostgreSQL + Auth    | Can replace custom auth for MVP speed       |

---

## 4. Database Schema

Use Prisma migrations to manage schema evolution.

### 4.1 Users Table

| Column          | Type                | Notes                             |
| --------------- | ------------------- | --------------------------------- |
| id              | UUID (PK)           | Auto-generated primary key        |
| name            | VARCHAR(100)        | Display name                      |
| email           | VARCHAR(255) UNIQUE | Login email                       |
| password_hash   | TEXT                | bcrypt hashed password            |
| avatar_url      | TEXT                | Profile image URL                 |
| bio             | TEXT                | Short user bio                    |
| role            | VARCHAR(50)         | e.g., Student, Developer, Founder |
| skills          | TEXT[]              | Array of skill tags               |
| tech_stack      | TEXT[]              | Preferred technologies            |
| created_at      | TIMESTAMP           | Account creation time             |
| activity_streak | INTEGER             | Consecutive active days           |

### 4.2 Ideas Table

| Column           | Type              | Notes                              |
| ---------------- | ----------------- | ---------------------------------- |
| id               | UUID (PK)         |                                    |
| user_id          | UUID (FK → users) | Owner of the idea                  |
| title            | VARCHAR(200)      | Idea title                         |
| description      | TEXT              | Full idea description              |
| domain           | VARCHAR(50)       | e.g., AI/ML, SaaS, FinTech         |
| tech_familiarity | VARCHAR(20)       | Beginner / Intermediate / Advanced |
| team_size        | INTEGER           | Number of team members             |
| timeline_months  | INTEGER           | Expected build duration in months  |
| status           | VARCHAR(20)       | Draft / In Review / Validated      |
| created_at       | TIMESTAMP         |                                    |
| updated_at       | TIMESTAMP         |                                    |

### 4.3 Analysis Results Table

| Column                | Type              | Notes                                            |
| --------------------- | ----------------- | ------------------------------------------------ |
| id                    | UUID (PK)         |                                                  |
| idea_id               | UUID (FK → ideas) |                                                  |
| novelty_index         | DECIMAL(5,2)      | 0–100                                            |
| market_saturation     | DECIMAL(5,2)      | 0–100                                            |
| feasibility_score     | DECIMAL(5,2)      | 0–100                                            |
| opportunity_score     | DECIMAL(5,2)      | 0–100                                            |
| risk_level            | VARCHAR(20)       | Low / Moderate / High / Critical                 |
| similar_projects      | JSONB             | Array of `{ name, url, similarity_pct }`         |
| market_trend_data     | JSONB             | Array of `{ month, value }` for line chart       |
| competitor_data       | JSONB             | Array of `{ sector, count }` for bar chart       |
| feasibility_breakdown | JSONB             | `{ tech, team, capital, legal }` for radar chart |
| analyst_verdict       | TEXT              | AI-generated summary text                        |
| computed_at           | TIMESTAMP         |                                                  |

### 4.4 Notes Table

| Column     | Type                        | Notes                           |
| ---------- | --------------------------- | ------------------------------- |
| id         | UUID (PK)                   |                                 |
| user_id    | UUID (FK → users)           |                                 |
| idea_id    | UUID (FK → ideas, nullable) | Optional link to an idea        |
| content    | TEXT                        | Note body text                  |
| tags       | TEXT[]                      | User-defined tags               |
| color      | VARCHAR(7)                  | Hex colour for sticky note card |
| created_at | TIMESTAMP                   |                                 |
| updated_at | TIMESTAMP                   |                                 |

### Prisma Schema Snippet

```prisma
model User {
  id             String   @id @default(uuid())
  name           String
  email          String   @unique
  password_hash  String
  avatar_url     String?
  bio            String?
  role           String?
  skills         String[]
  tech_stack     String[]
  activity_streak Int     @default(0)
  created_at     DateTime @default(now())
  ideas          Idea[]
  notes          Note[]
}

model Idea {
  id               String    @id @default(uuid())
  user_id          String
  title            String
  description      String
  domain           String
  tech_familiarity String
  team_size        Int
  timeline_months  Int
  status           String    @default("Draft")
  created_at       DateTime  @default(now())
  updated_at       DateTime  @updatedAt
  user             User      @relation(fields: [user_id], references: [id])
  analysis         AnalysisResult[]
  notes            Note[]
}

model AnalysisResult {
  id                    String   @id @default(uuid())
  idea_id               String
  novelty_index         Float
  market_saturation     Float
  feasibility_score     Float
  opportunity_score     Float
  risk_level            String
  similar_projects      Json
  market_trend_data     Json
  competitor_data       Json
  feasibility_breakdown Json
  analyst_verdict       String
  computed_at           DateTime @default(now())
  idea                  Idea     @relation(fields: [idea_id], references: [id])
}

model Note {
  id         String   @id @default(uuid())
  user_id    String
  idea_id    String?
  content    String
  tags       String[]
  color      String   @default("#FEF9C3")
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  user       User     @relation(fields: [user_id], references: [id])
  idea       Idea?    @relation(fields: [idea_id], references: [id])
}
```

---

## 5. API Specification

All API endpoints follow REST conventions.  
**Base URL (development):** `http://localhost:4000/api`  
**Auth:** All protected routes require `Authorization: Bearer <JWT>` header.

### 5.1 Authentication Endpoints

| Method + Path         | Description                                   | Auth Required |
| --------------------- | --------------------------------------------- | ------------- |
| `POST /auth/register` | Register new user with name, email, password  | No            |
| `POST /auth/login`    | Login and receive JWT token                   | No            |
| `GET /auth/me`        | Get current user profile from JWT             | Yes           |
| `PUT /auth/me`        | Update user profile (name, bio, skills, tech) | Yes           |

**Register Request Body:**

```json
{
  "name": "Vivek Chaurasiya",
  "email": "vivek@dime.dev",
  "password": "securepassword123"
}
```

**Login Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "Vivek Chaurasiya",
    "email": "vivek@dime.dev"
  }
}
```

### 5.2 Idea Endpoints

| Method + Path             | Description                                     | Auth Required |
| ------------------------- | ----------------------------------------------- | ------------- |
| `POST /ideas`             | Create a new idea record                        | Yes           |
| `GET /ideas`              | List all ideas for current user                 | Yes           |
| `GET /ideas/:id`          | Get single idea by ID                           | Yes           |
| `PUT /ideas/:id`          | Update idea details                             | Yes           |
| `DELETE /ideas/:id`       | Delete idea and its analysis results            | Yes           |
| `POST /ideas/:id/analyze` | Trigger analysis for an idea (calls ML service) | Yes           |

**Create Idea Request Body:**

```json
{
  "title": "AI Code Review Bot",
  "description": "An AI tool that explains code review suggestions to junior developers...",
  "domain": "AI/ML",
  "tech_familiarity": "Intermediate",
  "team_size": 3,
  "timeline_months": 6
}
```

### 5.3 Analysis Endpoints

| Method + Path                    | Description                                 | Auth Required |
| -------------------------------- | ------------------------------------------- | ------------- |
| `GET /analysis/:idea_id`         | Retrieve latest analysis result for an idea | Yes           |
| `GET /analysis/:idea_id/history` | Get all previous analyses for an idea       | Yes           |

**Analysis Response Shape:**

```json
{
  "id": "uuid",
  "idea_id": "uuid",
  "novelty_index": 84.0,
  "market_saturation": 47.0,
  "feasibility_score": 78.0,
  "opportunity_score": 91.0,
  "risk_level": "Low",
  "similar_projects": [
    {
      "name": "Sourcegraph",
      "url": "https://sourcegraph.com",
      "similarity_pct": 62
    }
  ],
  "market_trend_data": [
    { "month": "Jan", "value": 42 },
    { "month": "Feb", "value": 48 }
  ],
  "competitor_data": [
    { "sector": "SaaS", "count": 45 },
    { "sector": "AI", "count": 67 }
  ],
  "feasibility_breakdown": {
    "tech": 85,
    "team": 70,
    "capital": 60,
    "legal": 75
  },
  "analyst_verdict": "Your idea shows strong differentiation in execution logic...",
  "computed_at": "2026-03-17T10:00:00Z"
}
```

### 5.4 Dataset Endpoints

| Method + Path               | Description                               | Auth Required |
| --------------------------- | ----------------------------------------- | ------------- |
| `GET /datasets`             | List all available datasets with metadata | Yes           |
| `GET /datasets/:id/preview` | Get first 20 records from a dataset       | Yes           |

### 5.5 Notes Endpoints

| Method + Path       | Description                     | Auth Required |
| ------------------- | ------------------------------- | ------------- |
| `GET /notes`        | List all notes for current user | Yes           |
| `POST /notes`       | Create a new note               | Yes           |
| `PUT /notes/:id`    | Edit a note                     | Yes           |
| `DELETE /notes/:id` | Delete a note                   | Yes           |

---

## 6. Feature Specifications

### Module 6.1 — Dashboard

The Dashboard is the first page the user sees after login. It provides a high-level overview of platform activity and quick access to primary actions.

**Hero Section**

- Full-width card with orange-to-cyan gradient background (`#F59E0B → #06B6D4`)
- Text: `"Welcome back, [Name]! Ready to explore your next big idea?"`
- Primary action: **Analyze New Idea** → navigates to `/analyzer`
- Secondary action: **View Reports** → navigates to `/workspace`

**Metrics Cards Row (4 cards)**

| Card                 | Metric                                | Icon       | Data Source                                  |
| -------------------- | ------------------------------------- | ---------- | -------------------------------------------- |
| Ideas Analyzed       | Count of analyzed ideas               | Lightbulb  | `COUNT(analysis_results WHERE user_id = me)` |
| Market Opportunities | Count of opportunities identified     | TrendingUp | `SUM(opportunity_score > 70)`                |
| Dataset Insights     | Datasets the user has interacted with | Database   | `dataset_interaction_count`                  |
| Saved Concepts       | Ideas saved to workspace              | Bookmark   | `COUNT(ideas WHERE status != Draft)`         |

**Recent Analysis Table**

- Columns: Project Name | Domain | Novelty Score | Status | Last Updated | Actions
- Status badge colours: Validated (green) | In Review (amber) | Draft (grey)
- Default sort: most recently updated first
- Show max 10 rows with a View All link

**Right Profile Panel**

- Display: user avatar (80×80px circle), name, email, role badge
- Stats: Ideas Analyzed | Saved Ideas | Activity Streak
- Project quota progress bar: ideas used / plan limit

---

### Module 6.2 — Idea Analyzer

This is the core feature of DIME. A multi-field form that collects structured input about the user's idea and submits it for analysis.

**Form Fields**

| Field                  | Input Type                     | Validation                                                                                                                                |
| ---------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Idea Title             | Text input                     | Required, 5–200 characters                                                                                                                |
| Idea Description       | Textarea                       | Required, 50–2000 characters                                                                                                              |
| Domain / Category      | Dropdown select                | Required. Options: AI/ML, Web App, Mobile App, SaaS, FinTech, HealthTech, Cybersecurity, Blockchain, Data Science, Education, Marketplace |
| Tech Stack Familiarity | Toggle button group            | Required. Options: Beginner / Intermediate / Advanced                                                                                     |
| Team Size              | Number input with +/− controls | Required. Range: 1–50                                                                                                                     |
| Project Timeline       | Range slider                   | Required. 1–24 months. Show selected value dynamically                                                                                    |

**Submission Behaviour**

1. Form validates all fields on submit
2. Loading state shows spinner inside the **Analyze Idea** button
3. On success: navigate to `/analysis/:id` with results
4. On error: show inline error toast with retry option

---

### Module 6.3 — Analysis Results

Displays the full analysis output for a submitted idea. Read-only page with rich visualisations.

**5 Score Cards**

- Novelty Index — large value display with % change vs. average
- Market Saturation — with level label (Low / Moderate / High / Saturated)
- Feasibility Score — colour coded (green >70, amber 40–70, red <40)
- Opportunity Score — higher = more whitespace available
- Risk Indicator — badge: Low / Moderate / High / Critical

**Visualisations**

| Chart               | Library                 | Configuration                                                                    |
| ------------------- | ----------------------- | -------------------------------------------------------------------------------- |
| Market Demand Trend | Recharts LineChart      | X-axis: months (Jan–Dec). Y-axis: demand index. Show +18.4% growth annotation    |
| Competitor Density  | Recharts BarChart       | X-axis: domains (SaaS, FinTech, AI, Health, Education). Y-axis: competitor count |
| Feasibility Radar   | Recharts RadarChart     | Axes: Technology, Team, Capital, Legal. Filled area with `#2563EB`               |
| Opportunity Matrix  | Chart.js Bubble/Scatter | X: Feasibility, Y: Impact. Bubbles = discovered opportunities. Hover shows label |

**Similarity Meter**

- Horizontal progress bar showing 0–100% similarity with existing projects
- Below the meter: list of top 3–5 similar projects with name and similarity %
- Links to GitHub / App Store where available

**Analyst Verdict Panel**

- Full-width card with a text summary generated by the ML service
- Highlighted key phrases (novelty, risk, opportunity)
- Action buttons: Save to Workspace | Download PDF Report | Share

---

### Module 6.4 — Market Insights

Displays aggregated market intelligence from App Store review datasets and developer surveys. Not idea-specific — shows macro market trends.

- Sentiment analysis chart: distribution of positive / negative / neutral reviews across domains
- Top user complaints cluster: horizontal bar chart showing most common complaint themes
- Feature request clusters: treemap or word-cloud of requested features
- Trending problems timeline: line chart of problem frequencies over time
- Filters: domain selector, time range (3M / 6M / 1Y), sentiment filter

---

### Module 6.5 — Opportunity Engine

Renders an interactive Opportunity Matrix — a scatter/bubble chart where each point represents a discovered product opportunity.

- **X-axis:** Feasibility (0–100) — how easy is it to build
- **Y-axis:** Impact (0–100) — how large is the unmet demand
- **Bubble size:** represents dataset evidence volume for that opportunity
- **Colour coding:** green (high opportunity), amber (moderate), red (low/risky)
- **Click on a bubble** → shows a side panel with: opportunity name, description, related datasets, estimated user base, suggested approach
- Domain filter to narrow displayed opportunities

---

### Module 6.6 — Dataset Explorer

Allows users to browse and preview the datasets used to power DIME's analysis.

| Dataset                 | Records (est.)   | Description                                                      |
| ----------------------- | ---------------- | ---------------------------------------------------------------- |
| GitHub Repositories     | ~500K repos      | Repository names, descriptions, star counts, topics, language    |
| App Store Reviews (iOS) | ~1M reviews      | App name, category, review text, rating, date                    |
| Google Play Reviews     | ~1M reviews      | Same structure as App Store Reviews                              |
| Developer Survey 2023   | ~90K responses   | Stack Overflow annual survey — tech preferences, salaries, roles |
| Market Trend Index      | ~50K data points | Monthly search trend scores per technology domain                |
| Product Hunt Launches   | ~30K launches    | Product name, category, upvotes, tagline, launch date            |

Each dataset card shows: name, description, record count, last updated date, a Preview button. Preview opens a modal with the first 20 rows in a paginated table.

---

### Module 6.7 — Idea Workspace

A Kanban-style board for managing all of the user's ideas across different stages.

- Idea cards displayed in columns: **Draft** | **In Review** | **Validated**
- Each card shows: status badge, title, domain tag, description snippet (max 100 chars), progress bar, last updated timestamp
- Click a card → expands to full idea detail with analysis scores and task list
- Drag-and-drop to move cards between status columns _(optional for MVP)_
- **New Idea** button: dashed placeholder card that opens the Idea Analyzer
- **Global progress panel (right):** shows completion % for Market Analysis, Financial Modelling, Risk Assessment across all ideas
- **Next Steps panel:** task checklist auto-generated from analysis

---

### Module 6.8 — Notes System

A sticky-note board for capturing quick thoughts, linked or unlinked to specific ideas.

- Notes displayed as coloured sticky cards on a masonry grid
- **Create note:** click `+ New Note` button → inline editable card appears
- **Edit note:** click any card → enters edit mode
- **Delete note:** trash icon on card
- **Tags:** user can add text tags to each note. Tags are filterable
- **Filter bar:** filter notes by tag or by linked idea
- Notes auto-save on blur (no explicit save button needed)

---

### Module 6.9 — User Profile & Settings

Profile management page with editable user information and platform statistics.

**Profile Header**

- Large circular avatar (120×120px) — click to upload new image
- Name (editable inline), Professional Title, Short bio
- Buttons: Edit Profile | View Public Profile

**Settings Tabs**

| Tab                 | Editable Fields                                                          |
| ------------------- | ------------------------------------------------------------------------ |
| Personal Info       | Full Name, Email (read-only), Bio, Role, Avatar upload                   |
| Skills & Tech Stack | Skill tags (add/remove chips), Preferred technologies, Areas of interest |
| Account Security    | Change password (current + new + confirm), Enable 2FA (future)           |
| Notifications       | Email notification preferences for analysis completion, weekly digest    |

---

## 7. UI/UX Design System

All frontend development must adhere to this design system.

### 7.1 Layout

| Panel               | Width                            | Behaviour                                                          |
| ------------------- | -------------------------------- | ------------------------------------------------------------------ |
| Left Sidebar        | 240px fixed                      | Always visible on desktop. Collapsible on tablet. Drawer on mobile |
| Main Content Area   | Flexible (fills remaining space) | Primary workspace. Scrollable vertically                           |
| Right Context Panel | 280px fixed                      | Shows user profile/stats. Hidden on tablet and mobile              |

### 7.2 Colour Palette

| Token              | Hex Value | Usage                                                  |
| ------------------ | --------- | ------------------------------------------------------ |
| Primary / Blue     | `#2563EB` | Primary buttons, active nav items, headings            |
| Accent / Teal      | `#14B8A6` | Secondary accents, chart fills, badge highlights       |
| Purple             | `#7C3AED` | Progress bars, analytics highlights, secondary actions |
| Orange / Warning   | `#F59E0B` | Hero gradient start, warning states, CTA buttons       |
| Success Green      | `#22C55E` | Validated status, positive change indicators           |
| Error Red          | `#EF4444` | Risk indicators, error states, destructive actions     |
| Background         | `#F6F8FB` | Page background                                        |
| Card Background    | `#FFFFFF` | All cards, modals, panels                              |
| Sidebar Background | `#FFFFFF` | Left sidebar                                           |
| Primary Text       | `#0F172A` | Main body text                                         |
| Secondary Text     | `#6B7280` | Subtitles, metadata                                    |
| Muted Text         | `#9CA3AF` | Placeholder text, disabled states                      |
| Border             | `#E2E8F0` | Card borders, dividers, input borders                  |

### 7.3 Typography

| Role             | Size             | Weight          | Font                        |
| ---------------- | ---------------- | --------------- | --------------------------- |
| Page Title       | 32px / 2rem      | Bold (700)      | Inter or Manrope            |
| Section Heading  | 22px / 1.375rem  | Semi-Bold (600) | Inter or Manrope            |
| Card Title       | 16px / 1rem      | Medium (500)    | Inter or Manrope            |
| Body Text        | 14px / 0.875rem  | Regular (400)   | Inter or Manrope            |
| Metadata / Label | 12px / 0.75rem   | Light (300)     | Inter or Manrope            |
| Monospace (code) | 13px / 0.8125rem | Regular (400)   | JetBrains Mono or Fira Code |

### 7.4 Sidebar Navigation

**Icon Mapping**

| Navigation Item    | Lucide Icon       |
| ------------------ | ----------------- |
| Dashboard          | `LayoutDashboard` |
| Idea Analyzer      | `Lightbulb`       |
| Market Insights    | `BarChart2`       |
| Opportunity Engine | `Target`          |
| Dataset Explorer   | `Database`        |
| Idea Workspace     | `Kanban`          |
| Notes              | `StickyNote`      |
| Settings           | `Settings`        |
| Help               | `HelpCircle`      |
| Logout             | `LogOut`          |

**Active / Hover States**

- Active: light blue background (`#EFF6FF`), left border accent (3px, `#2563EB`), text colour `#2563EB`
- Hover: background `#F1F5F9`, smooth 150ms transition

### 7.5 Component Specifications

**Metric Card**

- White card (`#FFFFFF`), 1px border (`#E2E8F0`), 8px border-radius, 4px shadow
- Contents: icon (top-left, 24px), large value (32px bold), label (12px muted), change indicator (12px, green or red with arrow)

**Status Badge**

| Status    | Background | Text      |
| --------- | ---------- | --------- |
| Validated | `#DCFCE7`  | `#16A34A` |
| In Review | `#FEF3C7`  | `#D97706` |
| Draft     | `#F3F4F6`  | `#6B7280` |

**Primary Button**

- Background `#2563EB`, white text, 8px radius, 16px horizontal padding
- Hover: `#1D4ED8`, 200ms transition
- Disabled: opacity 0.5, `cursor: not-allowed`

**Input Fields**

- Border: 1px `#E2E8F0`, focus: 2px `#2563EB` ring, 8px radius
- Label above input, always visible (never placeholder-only)

### 7.6 Responsive Behaviour

| Breakpoint            | Behaviour                                         |
| --------------------- | ------------------------------------------------- |
| Desktop (≥1280px)     | Full sidebar + main content + right panel         |
| Tablet (768px–1279px) | Sidebar collapses to icons. Right panel hidden    |
| Mobile (<768px)       | Sidebar becomes a drawer. Charts stack vertically |

---

## 8. Recommended Project Structure

### 8.1 Frontend (React)

```
dime-frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx          # Collapsible sidebar with nav items
│   │   │   ├── Header.tsx           # Search bar, notifications, avatar
│   │   │   └── RightPanel.tsx       # Profile summary panel
│   │   ├── ui/
│   │   │   ├── Button.tsx           # Primary, outline, ghost variants
│   │   │   ├── Card.tsx             # Base card component
│   │   │   ├── Badge.tsx            # Status badges with colour variants
│   │   │   ├── Input.tsx            # Text, number, textarea inputs
│   │   │   └── Modal.tsx            # Reusable modal wrapper
│   │   └── charts/
│   │       ├── TrendChart.tsx       # Recharts line chart wrapper
│   │       ├── CompetitorChart.tsx  # Recharts bar chart wrapper
│   │       ├── RadarChart.tsx       # Recharts radar chart wrapper
│   │       └── OpportunityChart.tsx # Chart.js bubble/scatter
│   ├── pages/
│   │   ├── Dashboard/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── HeroCard.tsx
│   │   │   ├── MetricsRow.tsx
│   │   │   └── RecentTable.tsx
│   │   ├── Analyzer/
│   │   │   ├── Analyzer.tsx
│   │   │   └── IdeaForm.tsx
│   │   ├── Analysis/
│   │   │   ├── Analysis.tsx
│   │   │   ├── ScoreCards.tsx
│   │   │   ├── SimilarityMeter.tsx
│   │   │   └── VerdictPanel.tsx
│   │   ├── Market/
│   │   │   └── Market.tsx
│   │   ├── Opportunity/
│   │   │   └── Opportunity.tsx
│   │   ├── Datasets/
│   │   │   └── Datasets.tsx
│   │   ├── Workspace/
│   │   │   ├── Workspace.tsx
│   │   │   └── IdeaCard.tsx
│   │   ├── Notes/
│   │   │   ├── Notes.tsx
│   │   │   └── NoteCard.tsx
│   │   └── Profile/
│   │       └── Profile.tsx
│   ├── store/
│   │   ├── authStore.ts             # Zustand: user, token, login/logout
│   │   ├── ideaStore.ts             # Zustand: ideas list, selected idea
│   │   └── analysisStore.ts         # Zustand: analysis results cache
│   ├── api/
│   │   ├── client.ts                # Axios instance with auth interceptor
│   │   ├── auth.ts                  # Auth API calls
│   │   ├── ideas.ts                 # Ideas CRUD API calls
│   │   ├── analysis.ts              # Analysis API calls
│   │   └── datasets.ts              # Dataset API calls
│   ├── types/
│   │   ├── user.ts                  # User, AuthResponse interfaces
│   │   ├── idea.ts                  # Idea, IdeaStatus interfaces
│   │   └── analysis.ts              # AnalysisResult, ScoreCard interfaces
│   ├── utils/
│   │   ├── scoreColor.ts            # Returns colour based on score value
│   │   ├── formatters.ts            # Date, number formatters
│   │   └── validators.ts            # Form validation helpers
│   ├── hooks/
│   │   ├── useIdeas.ts              # Fetch and cache ideas
│   │   ├── useAnalysis.ts           # Fetch analysis for an idea
│   │   └── useAuth.ts               # Auth state and actions
│   ├── App.tsx                      # Router setup with all routes
│   ├── main.tsx                     # React entry point
│   └── index.css                    # Global styles, Tailwind imports
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

### 8.2 Backend (Node.js)

```
dime-backend/
├── src/
│   ├── routes/
│   │   ├── auth.ts                  # /auth/register, /auth/login, /auth/me
│   │   ├── ideas.ts                 # /ideas CRUD + /ideas/:id/analyze
│   │   ├── analysis.ts              # /analysis/:idea_id
│   │   ├── datasets.ts              # /datasets + /datasets/:id/preview
│   │   └── notes.ts                 # /notes CRUD
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── ideaController.ts
│   │   ├── analysisController.ts
│   │   └── noteController.ts
│   ├── middleware/
│   │   ├── auth.ts                  # JWT verification middleware
│   │   ├── errorHandler.ts          # Global error handler
│   │   └── rateLimiter.ts           # express-rate-limit config
│   ├── services/
│   │   ├── mlService.ts             # HTTP client for Python ML service
│   │   ├── cacheService.ts          # Redis get/set helpers
│   │   └── emailService.ts          # Nodemailer setup (future)
│   ├── db/
│   │   ├── client.ts                # Prisma client singleton
│   │   └── seed.ts                  # Seed datasets table on first run
│   ├── types/
│   │   └── express.d.ts             # Extend Express Request with user
│   ├── utils/
│   │   ├── jwt.ts                   # Sign and verify JWT tokens
│   │   ├── password.ts              # bcrypt hash and compare
│   │   └── validators.ts            # Zod schemas for request bodies
│   └── index.ts                     # Express app entry point
├── prisma/
│   └── schema.prisma                # Full Prisma schema (see Section 4)
├── package.json
└── tsconfig.json
```

### 8.3 Python ML Service

```
dime-ml/
├── app/
│   ├── main.py                      # FastAPI app entry point
│   ├── routes/
│   │   └── analyze.py               # POST /analyze endpoint
│   ├── services/
│   │   ├── novelty.py               # TF-IDF + cosine similarity
│   │   ├── saturation.py            # Market saturation computation
│   │   ├── feasibility.py           # Multi-pillar feasibility scoring
│   │   ├── opportunity.py           # K-Means clustering on reviews
│   │   └── risk.py                  # Composite risk score calculator
│   ├── datasets/
│   │   ├── github_repos.parquet     # Preprocessed GitHub data
│   │   ├── app_reviews.parquet      # Preprocessed App Store reviews
│   │   └── dev_survey.parquet       # Developer survey data
│   └── models/
│       ├── tfidf_matrix.pkl         # Serialised TF-IDF model
│       └── review_clusters.pkl      # Serialised K-Means centroids
├── scripts/
│   └── preprocess.py                # One-time dataset preprocessing
├── requirements.txt
└── Dockerfile
```

---

## 9. Development Phases & Milestones

> **Follow these phases in order. Do not start a later phase until the earlier one is complete and verified.**

### Phase 1 — UI Skeleton (Week 1–2)

**Goal:** Full UI layout visible with mock data, zero backend needed.

1. Scaffold React + TypeScript + Tailwind project (Vite recommended)
2. Install all frontend dependencies (Recharts, Lucide, Zustand, Shadcn)
3. Build Sidebar component with all navigation items and active state logic
4. Build Header component (search bar, notification icon, theme toggle, avatar)
5. Build Right Panel with static profile placeholder
6. Implement React Router with routes for all 8 pages
7. Build Dashboard page with hardcoded mock metrics and table data
8. Build Idea Analyzer form with all fields (no submission logic yet)
9. Build Analysis Results page with hardcoded chart data
10. Build all remaining pages as empty stubs (Market, Opportunity, Datasets, Workspace, Notes, Profile)

### Phase 2 — Functional Pages (Week 3–4)

**Goal:** All page features work with static JSON data.

1. Wire Idea Analyzer form → local state → navigate to Analysis Results
2. Render all 4 charts on Analysis Results page from static JSON
3. Build Dataset Explorer with card grid from a static `datasets.json` file
4. Build Market Insights page with all charts from static data
5. Build Opportunity Matrix chart with static bubble data
6. Build Workspace with Kanban cards from static ideas array
7. Build Notes board with create/edit/delete from local state
8. Build Profile page with all tabs functional (no save yet)

### Phase 3 — Backend + Data Integration (Week 5–7)

**Goal:** Full end-to-end flow from form to analysis results.

1. Set up PostgreSQL + Prisma + run initial migrations
2. Build auth endpoints (register, login, /me) with JWT
3. Protect all pages behind auth (redirect to login if no token)
4. Build all idea CRUD endpoints
5. Build notes CRUD endpoints
6. Set up Python FastAPI ML service with all 5 scoring algorithms
7. Preprocess datasets and load them into the service
8. Connect Node.js analysis controller to Python ML service via HTTP
9. Wire Idea Analyzer form submission to `POST /ideas` then `POST /ideas/:id/analyze`
10. Load real analysis results from API on Analysis Results page
11. Profile save functionality → `PUT /auth/me`

### Phase 4 — Enhancements (Week 8–10)

**Goal:** Polish, performance, and additional features.

1. Dark mode toggle — implement CSS variable switching with localStorage persistence
2. Add Framer Motion animations: card hover, page transitions, chart loading
3. PDF report download from Analysis Results page (use `react-pdf` or puppeteer server-side)
4. Add loading skeletons for all data-fetching states
5. Implement Redis caching for analysis results (TTL: 24 hours)
6. Performance audit: ensure dashboard loads in under 2 seconds
7. Accessibility audit: WCAG 2.1 AA compliance for colour contrast and input labels
8. Mobile responsive: sidebar drawer, stacked charts on small screens
9. Write unit tests for ML scoring functions (pytest)
10. Write API integration tests (Jest + supertest)

---

## 10. Dataset Strategy

### 10.1 Dataset Acquisition Sources

| Dataset                 | Source                         | Format         | Size          |
| ----------------------- | ------------------------------ | -------------- | ------------- |
| GitHub Repositories     | GitHub REST API / GH Archive   | JSON / Parquet | ~500K records |
| App Store Reviews (iOS) | Kaggle: iOS App Store Reviews  | CSV            | ~1M records   |
| Google Play Reviews     | Kaggle: Google Play Store Apps | CSV            | ~1M records   |
| Stack Overflow Survey   | stackoverflow.com/research     | CSV            | ~90K records  |
| Product Hunt Launches   | Kaggle: Product Hunt dataset   | CSV            | ~30K records  |
| Google Trends Data      | `pytrends` Python library      | JSON           | On-demand     |

### 10.2 Preprocessing Pipeline

Run `scripts/preprocess.py` before launching the ML service:

```python
# scripts/preprocess.py — overview of steps

# Step 1: Load raw files
import pandas as pd
repos = pd.read_csv('raw/github_repos.csv')
reviews = pd.read_csv('raw/app_store_reviews.csv')

# Step 2: Drop nulls
repos = repos.dropna(subset=['name', 'description'])
reviews = reviews.dropna(subset=['review_text', 'rating'])

# Step 3: Normalise text
import re
def clean_text(text):
    text = text.lower()
    text = re.sub(r'<.*?>', '', text)        # remove HTML
    text = re.sub(r'[^a-z0-9\s]', '', text) # remove special chars
    return text.strip()

repos['description_clean'] = repos['description'].apply(clean_text)
reviews['review_clean'] = reviews['review_text'].apply(clean_text)

# Step 4: TF-IDF matrix for novelty
from sklearn.feature_extraction.text import TfidfVectorizer
import pickle
vectorizer = TfidfVectorizer(max_features=10000, stop_words='english')
tfidf_matrix = vectorizer.fit_transform(repos['description_clean'])
with open('app/models/tfidf_matrix.pkl', 'wb') as f:
    pickle.dump((vectorizer, tfidf_matrix), f)

# Step 5: K-Means on negative reviews for opportunity
from sklearn.cluster import KMeans
negative = reviews[reviews['rating'] <= 2]['review_clean']
neg_vectorizer = TfidfVectorizer(max_features=5000, stop_words='english')
neg_matrix = neg_vectorizer.fit_transform(negative)
kmeans = KMeans(n_clusters=50, random_state=42)
kmeans.fit(neg_matrix)
with open('app/models/review_clusters.pkl', 'wb') as f:
    pickle.dump((neg_vectorizer, kmeans), f)

# Step 6: Export as parquet
repos.to_parquet('app/datasets/github_repos.parquet', index=False)
reviews.to_parquet('app/datasets/app_reviews.parquet', index=False)
print("Preprocessing complete.")
```

### 10.3 Sampling Strategy for MVP

Processing the full datasets at MVP is unnecessary. Use stratified sampling:

- **GitHub:** sample 50K repos, stratified by language and topic
- **App Store Reviews:** sample 200K reviews, stratified by category and rating
- **Developer Survey:** use all 90K rows (small enough)
- **Product Hunt:** use all 30K rows

---

## 11. Non-Functional Requirements

| Requirement                | Target            | How To Meet It                                                                   |
| -------------------------- | ----------------- | -------------------------------------------------------------------------------- |
| Dashboard load time        | < 2 seconds       | Lazy-load charts, use `React.lazy` for routes, cache API responses in Zustand    |
| Analysis computation time  | < 10 seconds      | Cache results in Redis. Show real-time progress via WebSocket or polling         |
| Chart render performance   | 60fps smooth      | Use Recharts responsive containers, avoid re-renders with `useMemo`              |
| API response time (non-ML) | < 200ms           | PostgreSQL indexes on `user_id`, `idea_id`. Use connection pooling (PgBouncer)   |
| WCAG Accessibility         | Level AA          | Color contrast ≥ 4.5:1. All inputs labeled. Charts have text alt-summaries       |
| Mobile Responsiveness      | 320px–1440px      | Tailwind responsive breakpoints. Sidebar collapses at `md`. Charts stack at `sm` |
| Security                   | OWASP Top 10      | Helmet.js, rate limiting, JWT expiry 7d, bcrypt rounds 12, CORS strict origin    |
| Code Quality               | ESLint + Prettier | Run on pre-commit hook via Husky. TypeScript strict mode enabled                 |

---

## 12. AI-Assisted Development Prompting Guide

Use these prompts directly in Cursor, Windsurf, Antigravity, or any AI coding IDE.

### 12.1 Project Scaffold

```
Scaffold a React 18 + TypeScript + Vite + Tailwind CSS project called dime-frontend.

Install and configure:
- React Router v6
- Zustand v4
- Recharts v2
- Chart.js v4 with react-chartjs-2
- Lucide React
- Shadcn/ui

Create the folder structure:
- src/components/layout/ (Sidebar, Header, RightPanel)
- src/components/ui/ (Button, Card, Badge, Input, Modal)
- src/components/charts/ (TrendChart, RadarChart, CompetitorChart, OpportunityChart)
- src/pages/Dashboard, Analyzer, Analysis, Market, Opportunity, Datasets, Workspace, Notes, Profile
- src/store/ (authStore, ideaStore, analysisStore)
- src/api/ (client, auth, ideas, analysis, datasets)
- src/types/ (user, idea, analysis)
- src/utils/ (scoreColor, formatters, validators)
- src/hooks/ (useIdeas, useAnalysis, useAuth)

Set up React Router with lazy loading for all 8 pages.
```

### 12.2 Sidebar Component

```
Build a Sidebar React component using Tailwind CSS.

Specs:
- Width: 240px fixed
- Background: #0F1629 (dark navy)
- Top section: DIME logo mark + "DIME" heading + "SaaS Analytics" subtitle

Navigation items (use Lucide React icons):
- Dashboard (LayoutDashboard)
- Idea Analyzer (Lightbulb)
- Analysis Results (Activity)
- Market Insights (BarChart2)
- Opportunity Engine (Target)
- Dataset Explorer (Database)
- Idea Workspace (Kanban)
- Notes (FileText)

Bottom items:
- Profile (User)
- Help (HelpCircle)

Active item style: background rgba(99,102,241,0.18), text white.
Hover: background rgba(255,255,255,0.06).
Use React Router NavLink for routing.
The sidebar must be collapsible via a toggle — collapses to 64px showing icons only.
```

### 12.3 Dashboard Page

```
Build a Dashboard page component with Tailwind CSS + Recharts.

Include:
1. Hero card with CSS gradient background from #F59E0B to #06B6D4.
   Text: "Welcome back, [name]! Ready to explore your next big idea?"
   Two buttons: "Analyze New Idea" (primary) and "View Reports" (ghost).

2. Row of 4 MetricCard components:
   - Ideas Analyzed: 128, +12.5%
   - Market Opportunities: 43, +8.2%
   - Dataset Insights: 234, +5.1%
   - Saved Concepts: 17, +3.8%
   Each card: white background, 1px #E2E8F0 border, icon, large value, label, change indicator.

3. Two-column grid:
   Left: Recent Analysis table — columns: Project Name, Domain, Novelty Score, Status, Last Updated.
   Status badges: Validated (green), In Review (amber), Draft (grey). 5 mock rows.
   Right: Activity feed (4 items) + project quota progress bar.

4. Full-width bar chart using Recharts — "Analysis Volume — Last 12 Months".
   Colors: bars rgba(99,102,241,0.15), border #6366F1, border-radius 6px.

Page background: #F6F8FB.
```

### 12.4 Idea Analyzer Form

```
Build an Idea Analyzer page with a multi-field form using React + TypeScript + Tailwind CSS.

Form fields:
1. Idea Title — text input, required, 5-200 chars
2. Idea Description — textarea, required, 50-2000 chars
3. Domain/Category — dropdown: AI/ML, Web App, Mobile App, SaaS, FinTech, HealthTech, Cybersecurity, Blockchain, Data Science, Education, Marketplace
4. Tech Stack Familiarity — 3-button toggle group: Beginner / Intermediate / Advanced
5. Team Size — number input with + and - buttons, range 1-50
6. Project Complexity — 3-button toggle: Low / Medium / High
7. Project Timeline — range slider, 1-24 months, shows selected value dynamically

Submit button: "Analyze Idea" (full width, primary style).
On submit: show loading spinner, call POST /api/ideas/:id/analyze, navigate to /analysis/:id on success.

Right side panel: "What We Analyze" card listing all 5 metrics with colour-coded pills.
```

### 12.5 Analysis Results Charts

```
Build an Analysis Results page using Recharts and Chart.js.

1. Row of 5 score cards:
   - Novelty Index: 84%, +5.2% vs avg (color: #6366F1)
   - Market Saturation: 47%, "Moderate" (color: #F59E0B)
   - Feasibility Score: 78%, +3.1% (color: #10B981)
   - Opportunity Score: 91%, +12.8% (color: #06B6D4)
   - Risk Indicator: badge "Low Risk" (green badge)

2. Recharts LineChart — Market Demand Trend:
   X axis: Jan-Nov, Y axis: demand index (30-100).
   Data: [42,48,51,55,60,64,70,74,78,83,90]
   Color: #6366F1, fill: rgba(99,102,241,0.08), tension smooth.

3. Recharts BarChart — Competitor Density:
   Domains: SaaS(45), FinTech(38), AI/ML(67), Health(29), Education(22)
   Each bar a different color, border-radius 7px.

4. Recharts RadarChart — Feasibility:
   4 axes: Technology(85), Team(70), Capital(60), Legal(75)
   Your idea (blue fill) vs Market avg (grey dashed line).

5. Similarity meter: horizontal progress bar at 38%, list 3 similar projects below.

6. Analyst Verdict: full-width card with light blue-green gradient background.
   Contains summary text with key phrases highlighted in bold.
```

### 12.6 Python ML Service (FastAPI)

```
Create a Python FastAPI ML service for DIME.

File: app/main.py — FastAPI app with single endpoint POST /analyze

Request body schema:
{
  "title": str,
  "description": str,
  "domain": str,
  "tech_familiarity": str,  # Beginner / Intermediate / Advanced
  "team_size": int,
  "timeline_months": int
}

Implement 5 scoring services in app/services/:

1. novelty.py — load tfidf_matrix.pkl, vectorise input description,
   compute cosine similarity, return 100 - (max_similarity * 100)

2. saturation.py — load app_reviews.parquet, count records matching domain,
   normalise to 0-100 logarithmic scale, return score + label

3. feasibility.py — weighted score:
   tech_score based on tech_familiarity (Beginner=40, Intermediate=65, Advanced=85)
   team_score based on team_size vs timeline_months ratio
   capital_score based on domain lookup table
   legal_score based on domain risk table
   Final = tech*0.35 + team*0.25 + capital*0.20 + legal*0.20

4. opportunity.py — load review_clusters.pkl, find domain-matching reviews,
   score = (unaddressed_clusters / total_clusters) * 100

5. risk.py — composite: (saturation*0.3) + (1-feasibility)*0.4 + (1-novelty)*0.3
   Map to: <25=Low, 25-50=Moderate, 50-75=High, >75=Critical

Return all scores as JSON including market_trend_data and competitor_data arrays.
Run with: uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 13. Future Roadmap

| Feature                    | Priority | Notes                                                                                             |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| Dark Mode                  | High     | CSS variable system is already designed. Add a toggle that switches root class                    |
| Real-Time Dataset Scraping | Medium   | Background jobs (Bull + Redis) to scrape GitHub and App Store weekly                              |
| AI Analyst Verdict (LLM)   | High     | Replace static verdict with GPT-4o / Claude API call using structured prompt with analysis scores |
| Idea Similarity Search     | Medium   | Vector search using `pgvector` extension on idea descriptions                                     |
| Team Collaboration         | Medium   | Share ideas with teammates, comment on analysis results                                           |
| Hackathon Mode             | Low      | Time-boxed idea evaluation with a countdown timer and template themes                             |
| PDF Report Export          | High     | Generate PDF from analysis results using `react-pdf` or puppeteer server-side                     |
| Email Notifications        | Low      | Notify users when analysis is complete or weekly insights digest                                  |
| Mobile App (React Native)  | Low      | Core dashboard and idea submission form as a companion app                                        |
| Framer Motion Animations   | Medium   | Card hover lift, page fade transitions, chart load animations                                     |

---

## 14. MVP Success Criteria

The MVP is considered complete and ready for demonstration when all of the following criteria are met:

| #   | Success Criterion                                                | How to Verify                                                          |
| --- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | User can register, login, and access a protected dashboard       | Manual test: register → login → dashboard visible                      |
| 2   | User can submit an idea via the Analyzer form                    | Form validates, submits, shows loading state, navigates to results     |
| 3   | System generates all 5 analysis scores for a submitted idea      | API returns Novelty, Saturation, Feasibility, Opportunity, Risk scores |
| 4   | All 4 charts render correctly on Analysis Results page           | Line, bar, radar charts visible with correct data                      |
| 5   | Dataset Explorer shows all 6 datasets with preview functionality | Cards render, preview modal shows data table                           |
| 6   | User can create, edit, delete ideas in the Workspace             | Kanban board CRUD operations work without page reload                  |
| 7   | Notes system works end-to-end                                    | Create, edit, delete, tag notes — all persist on refresh               |
| 8   | Profile page saves changes                                       | Edit name, bio, skills → save → refresh → changes persisted            |
| 9   | Dashboard load time < 2 seconds                                  | Measure with browser DevTools Network tab (throttle to Fast 3G)        |
| 10  | UI is responsive at 375px (mobile) and 1440px (desktop)          | Chrome DevTools responsive view — no overflow, readable text           |

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/vivekchaurasiya/dime.git
cd dime

# 2. Start DIME app
cd dime-app
npm install
npx prisma migrate dev
npm run dev         # http://localhost:3000
```

### Environment Variables

**dime-app/.env**

```env
DATABASE_URL=file:./prisma/dev.db
NEXTAUTH_SECRET=replace-with-a-strong-secret
NEXTAUTH_URL=http://localhost:3000
```

---

_DIME – Data-Driven Idea & Market Evaluation Platform_  
_v1.0 MVP | Owner: Vivek Chaurasiya | Status: Ready for Development_
