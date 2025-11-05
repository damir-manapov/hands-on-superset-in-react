## Hands-on: Embedding Superset in React

This project demonstrates how to embed Apache Superset dashboards and charts into a React application. It includes a NestJS backend for handling Superset API authentication and a React frontend that embeds Superset visualizations.

This project is a pnpm monorepo containing:

- **back**: NestJS backend application (handles Superset API authentication and proxying)
- **ui**: React frontend application (embeds Superset dashboards and charts)

## Overview

This project shows how to:

1. Set up Apache Superset with a data stack (Trino + Iceberg + MinIO)
2. Embed Superset dashboards and charts into a React application
3. Handle authentication and API proxying through a NestJS backend
4. Create a seamless integration experience

## Architecture

```
┌─────────────────┐
│   React UI      │  ← Embeds Superset dashboards/charts
│   (Port 3000)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  NestJS Backend │  ← Handles Superset API auth & proxying
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

The Docker Compose setup includes:

- **Superset**: BI/Visualization platform (`http://localhost:8088`)
  - Default credentials: `admin` / `admin12345`
- **Trino**: Query engine for data access (`http://localhost:8080`)
- **MinIO**: S3-compatible object storage (`http://localhost:9000`, console on `http://localhost:9001`)
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

### Connect Superset to Trino

Once Superset is healthy:

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

The React application (`ui/`) demonstrates how to embed Superset dashboards and charts. The NestJS backend (`back/`) provides:

- Authentication with Superset API
- Secure API proxy to avoid CORS issues
- Token management and refresh

### Project Structure

```
.
├── back/          # NestJS backend (Superset API proxy & auth)
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
- The backend should be configured with Superset credentials to handle authentication.
- The React app uses iframe embedding or Superset's embedding SDK (depending on implementation).
