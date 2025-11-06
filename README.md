## Hands-on: Embedding Superset in React

This is a reference implementation for embedding a Superset dashboard into a React page.

The dashboard takes up all available space and adapts to the window size. When the page is rendered, a token is issued to the user for accessing the dashboard. The token is valid only for this specific dashboard. Additionally, embedding must be enabled for the dashboard, and the domains where embedding is allowed must be specified.

**Note on individual charts**: We also attempted to embed individual charts, but it appears this cannot be done with authorization - only if they are published globally for everyone. As a workaround, we created a dashboard with a single chart and disabled control elements, but it was not possible to completely remove the filter panel, only to make it collapsed.

This project is a pnpm monorepo containing:

- **back**: NestJS backend application (issues Superset guest tokens and exposes dashboard UUID lookup)
 - **ui**: React frontend application (embeds Superset dashboards)

## TODO

- Create more restricted role for accessing dashboards
- Remove ESLint disablings


## Overview

This project demonstrates:

1. Setting up Apache Superset with a data stack (Trino + Iceberg + MinIO)
2. Embedding Superset dashboards into a React application with proper authentication
3. Handling guest token issuance in a NestJS backend (refresh handled client-side)
4. Programmatically enabling dashboard embedding with domain restrictions
5. Creating a seamless full-page integration experience

## Architecture

```
┌─────────────────┐
│   React UI      │  ← Embeds Superset dashboards/charts
│   (Port 3000)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  NestJS Backend │  ← Issues guest tokens & UUID lookup (no proxy)
│   (Port 3001)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Superset      │  ← BI Platform (Port 8088)
│  (Docker)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Trino       │  ← Query Engine (Port 8080)
│  (Docker)       │
└─────────────────┘
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker and Docker Compose

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Start the infrastructure stack (Superset, Trino, MinIO, Nessie):

```bash
docker compose -f compose/compose.yaml up -d
```

3. Wait for all services to be healthy (check the logs or health endpoints)

4. Start the development servers:

```bash
# Terminal 1: Start NestJS backend
pnpm dev:back

# Terminal 2: Start React frontend
pnpm dev:ui
```

The React app will be available at `http://localhost:3000` and will display embedded Superset visualizations.

### Building for Production

```bash
# Build backend
pnpm build:back

# Build frontend
pnpm build:ui
```

### Linting and Formatting

```bash
# Lint all packages
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code with Prettier
pnpm format

# Check formatting
pnpm format:check
```

## Infrastructure Stack

The Docker Compose setup initializes:

- **MinIO**: S3-compatible object storage (`http://localhost:9000`, console on `http://localhost:9001`)
- **Iceberg**: Data lake format (via Trino)
- **Superset**: BI/Visualization platform (`http://localhost:8088`)
  - Default credentials: `admin` / `admin12345`
  - Automatically creates: database connection, charts, and dashboard
  - Enables embedding for the dashboard with permission to request from localhost
- **Trino**: Query engine for data access (`http://localhost:8080`)
- **Project Nessie**: Iceberg catalog for data versioning (`http://localhost:19120`)

### Infrastructure Quickstart

1. Start all services:

   ```bash
   docker compose -f compose/compose.yaml up -d
   ```

2. Wait for health checks to pass:
   - MinIO: `http://localhost:9001` (console) | Health: `http://localhost:9000/minio/health/ready`
   - Nessie: `http://localhost:19120/q/health`
   - Trino: `http://localhost:8080/v1/info`
   - Superset: `http://localhost:8088/health`

3. Access Superset directly:
   - URL: `http://localhost:8088`
   - Username: `admin`
   - Password: `admin12345`

## Setting Up Superset Data Source

### Automatic Setup

The Superset initialization script (`compose/superset/init_db.py`) automatically:

1. Creates a Trino database connection
2. Creates datasets
3. Creates charts
4. Creates a dashboard
5. Enables embedding for the dashboard with allowed domains set to `http://localhost:3000` and `http://127.0.0.1:3000`

### Manual Setup (if needed)

If you need to manually connect Superset to Trino:

1. Open `http://localhost:8088` and log in (`admin` / `admin12345`)
2. Go to **Settings → Data → Databases → + Database**
3. Choose **"Trino"** and use the connection URI:

   ```
   trino://trino@trino:8080
   ```

   - Username can be any non-empty value (e.g., `trino`)

### Trino Iceberg + Nessie Configuration

Trino is configured with an Iceberg catalog that uses Nessie and stores data in MinIO. The catalog file is at:
`compose/trino/catalog/iceberg.properties`.

Key settings:

- `iceberg.catalog.type=nessie`
- `iceberg.nessie.uri=http://nessie:19120/api/v2`
- `iceberg.s3.endpoint=http://minio:9000`
- `iceberg.s3.path-style-access=true`

### Sample Data Setup

You can create sample data in Trino for testing:

```sql
-- Create a new Iceberg schema
CREATE SCHEMA IF NOT EXISTS iceberg.demo;

-- Create a sample Iceberg table
CREATE TABLE IF NOT EXISTS iceberg.demo.events (
  id bigint,
  ts timestamp,
  payload varchar
);

-- Insert data
INSERT INTO iceberg.demo.events VALUES (1, current_timestamp, 'hello');

-- Query
SELECT * FROM iceberg.demo.events;
```

## Embedding Superset in React

The React application (`ui/`) demonstrates how to embed Superset dashboards. The dashboard fills the entire available space and adapts to the window size. The NestJS backend (`back/`) provides:

- Guest token generation for dashboard access (scoped to specific dashboard)
- Dashboard UUID lookup by slug
  
Token refresh is managed by the UI using the Superset Embedded SDK; the backend does not proxy Superset APIs and does not manage refresh.

**Key Features:**
- Full-page dashboard embedding that adapts to window size
- Secure token-based authentication (guest tokens valid only for the specific dashboard)
- Domain-restricted embedding (configured during initialization)
- Automatic token refresh before expiration

### Project Structure

```
.
├── back/          # NestJS backend (guest token issuance & UUID lookup)
├── ui/            # React frontend (embeds Superset components)
├── compose/       # Docker Compose setup for infrastructure
└── package.json   # Root workspace configuration
```

## Cleanup

Stop and remove all containers:

```bash
docker compose -f compose/compose.yaml down -v
```

## Notes

- All credentials in this setup are for local development only. Change them for any persistent/shared use.
- Superset uses its container-managed SQLite metadata DB for simplicity.
- The backend is configured with Superset credentials to handle guest token generation.
- The React app uses Superset's `@superset-ui/embedded-sdk` for dashboard embedding.
- Dashboard embedding is automatically enabled during initialization with domain restrictions.
- Individual chart embedding with authorization is not supported; use dashboards with single charts as a workaround.
