# AI Agent Helper for Application Monitoring

Coursework MVP for the Cloud.ru case. The app demonstrates a reactive AI assistant layer over existing observability tooling: mock Prometheus-like metrics, ELK-like logs, deploy events, incident summaries, root-cause hypotheses, explainability, and feedback collection.

## Implemented Scope

Nikita's practical scope is implemented as a runnable full-stack MVP:

- backend REST API with mock ingestion, scenario runner, anomaly/root-cause rules, AI analysis wrapper, evidence links, feedback endpoint;
- frontend operations dashboard with incident queue, scenario runner, incident detail, deploy correlation, and "Explain why";
- integration-ready architecture for Prometheus, ELK, messengers/email, and cloud LLM providers in mock mode by default;
- Docker and Cloud.ru-ready deployment documentation.

Out of scope for this MVP: real Prometheus/ELK connection, real Telegram/Slack/email sending, real cloud LLM calls, auto-remediation, auth, multitenancy, and proactive prevention.

## Stack

- Node.js 20+
- React + Vite + TypeScript
- Fastify + Zod
- PostgreSQL + Prisma
- Docker / Docker Compose

## Local Run

```bash
npm install
cp .env.example .env
npm run dev
```

Open:

- Web UI: http://localhost:5173
- API health: http://localhost:4000/api/health

Default local mode is `STORAGE_MODE=memory`, so the demo runs without PostgreSQL.

## Local Run With PostgreSQL

```bash
docker compose up -d postgres
cp .env.example .env
# change STORAGE_MODE=postgres in .env
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

## Docker Run

```bash
npm install
npm run build
docker compose up --build
```

Open http://localhost:8080.

## Demo Flow

1. Open the dashboard.
2. Run `Release regression: HTTP 5xx spike`.
3. Inspect the incident card:
   - AI summary;
   - root-cause hypothesis;
   - confidence;
   - metric slice;
   - deploy correlation;
   - `Explain why` evidence.
4. Submit feedback with `Useful` or `Not useful`.
5. Run `Sparse signal: low confidence fallback` to verify the edge case where AI avoids a fake confident RCA.

## API

- `GET /api/health`
- `GET /api/scenarios`
- `POST /api/scenarios/:id/run`
- `GET /api/incidents`
- `GET /api/incidents/:id`
- `POST /api/incidents/:id/analyze`
- `POST /api/incidents/:id/feedback`
- `GET /api/settings/integrations`
- `PATCH /api/settings/integrations`
- `POST /api/ingest/alerts`
- `POST /api/ingest/metrics`
- `POST /api/ingest/logs`
- `POST /api/ingest/deploys`

## Quality Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

GitHub Actions runs the same quality gate on pushes and pull requests:

- Prisma client generation;
- ESLint;
- TypeScript checks;
- API and UI tests;
- production build.

## Cloud.ru Deployment Outline

1. Create a Cloud.ru project and registry according to the grant/account instructions.
2. Create a Managed PostgreSQL instance and set `DATABASE_URL`.
3. Build the image for Linux amd64:

```bash
docker buildx build --platform linux/amd64 -t <cloud-registry>/coursework/triage-ai:latest .
```

4. Push the image to Artifact Registry.
5. Deploy to Cloud.ru Container Apps with:
   - `PORT=8080`
   - `HOST=0.0.0.0`
   - `NODE_ENV=production`
   - `STORAGE_MODE=postgres`
   - `DATABASE_URL=<managed-postgres-url>`
   - `CORS_ORIGIN=*` or the final service origin
6. Run Prisma migrations as a deploy step:

```bash
npm run db:deploy
npm run db:seed
```

7. Configure health check: `/api/health`.

## Documentation

- [Nikita implementation plan](docs/NIKITA_IMPLEMENTATION_PLAN.md)
- [Nikita implementation report](docs/NIKITA_IMPLEMENTATION_REPORT.md)
