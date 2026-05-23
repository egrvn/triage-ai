# Triage AI для incident response

Triage AI — курсовой MVP для кейса Cloud.ru: интерактивная DevOps/SRE-консоль, которая помогает on-call и escalation-командам быстрее проводить triage инцидентов. Приложение связывает synthetic Prometheus Metrics, ELK Logs, Deployment context и mock AI analysis в одном Dashboard.

## Что реализовано

- Публичная landing page на `/`.
- Mock auth и страница входа `/login`.
- Защищенный личный кабинет:
  - `/dashboard` — рабочая консоль triage;
  - `/integrations` — mock integrations и adapter boundaries;
  - `/docs` — продуктовая документация на русском;
  - `/settings` — demo user, роль, theme и mock mode status.
- Demo scenarios создают incidents, AI summary, root-cause hypothesis, evidence и recommended next steps.
- Incident actions: `Принять в работу`, `Эскалировать`, `Закрыть`.
- Role switch `On-call / Escalation` меняет подсказки и recommended actions.
- Amber/orange theme, light/dark mode, responsive layout.
- Fastify API, shared Zod contracts, Prisma/PostgreSQL и memory mode для локального demo.

## Стек

- Node.js 20+
- React 19 + Vite + TypeScript
- React Router
- TanStack Query
- Fastify + Zod
- PostgreSQL + Prisma
- Docker / Docker Compose

Tailwind в проект не добавлялся: тема реализована через CSS variables и обычные CSS-классы, чтобы не делать лишнюю миграцию стилей.

## Быстрый запуск

```bash
npm install
cp .env.example .env
npm run db:generate
npm run dev
```

Открыть:

- Web UI: `http://localhost:5173`
- API health: `http://localhost:4000/api/health`

По умолчанию используется `STORAGE_MODE=memory`, поэтому PostgreSQL не нужен для локального demo.

## Demo credentials

- Email: `demo@triage.ai`
- Пароль: `demo1234`

Это transparent mock auth для MVP. Он хранит session state в `localStorage` под ключом `triage-ai-session`, не использует JWT и не является production security.

## Routes

- `/` — публичная landing page.
- `/login` — вход в личный кабинет.
- `/dashboard` — защищенная triage-консоль.
- `/integrations` — защищенный раздел интеграций.
- `/docs` — защищенная документация.
- `/settings` — защищенные настройки.

Неавторизованный пользователь при открытии закрытых routes перенаправляется на `/login`.

## Demo flow

1. Откройте `/login`.
2. Войдите с demo credentials.
3. В Dashboard выберите demo scenario.
4. Нажмите play.
5. Проверьте созданный incident:
   - AI summary;
   - root-cause hypothesis;
   - confidence;
   - deploy correlation;
   - evidence;
   - recommended next steps.
6. Переключите роль `On-call / Escalation` и сравните подсказки.
7. Выполните action: `Принять в работу`, `Эскалировать` или `Закрыть`.
8. Откройте `/integrations`, проверьте details и нажмите `Проверить`.

## Demo scenarios

- `Release regression: HTTP 5xx spike`
- `Latency degradation under load`
- `External API timeout`
- `Sparse signal: low confidence fallback`

Сценарии используют synthetic data и нужны для демонстрации end-to-end triage flow без real customer data и secrets.

## Mock integrations

Доступны карточки:

- Prometheus metrics;
- ELK logs;
- Telegram alerts;
- Slack alerts;
- Email alerts;
- AI analysis provider.

Enabled integrations работают в `mock / healthy` режиме. Disabled integrations показывают production requirements: endpoint, credentials, Webhook/API Token и secrets management. Реальные secrets в код не добавляются.

## API

- `GET /api/health`
- `GET /api/scenarios`
- `POST /api/scenarios/:id/run`
- `GET /api/incidents`
- `GET /api/incidents/:id`
- `POST /api/incidents/:id/analyze`
- `PATCH /api/incidents/:id/status`
- `POST /api/incidents/:id/feedback`
- `GET /api/settings/integrations`
- `PATCH /api/settings/integrations`
- `POST /api/settings/integrations/:kind/test`
- `POST /api/demo/reset`
- `POST /api/ingest/alerts`
- `POST /api/ingest/metrics`
- `POST /api/ingest/logs`
- `POST /api/ingest/deploys`

API paths, enum values и technical identifiers остаются на английском.

## PostgreSQL локально

```bash
docker compose up -d postgres
cp .env.example .env
# В .env установите STORAGE_MODE=postgres
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

## Docker

```bash
npm install
npm run build
docker compose up --build
```

Открыть `http://localhost:8080`.

## Scripts

- `npm run dev` — API и web dev servers.
- `npm run build` — shared, API и web production build.
- `npm run start` — production API/server.
- `npm test` — API и web tests.
- `npm run lint` — ESLint.
- `npm run typecheck` — TypeScript checks.
- `npm run db:generate` — Prisma Client.
- `npm run db:deploy` — Prisma migrations deploy.
- `npm run db:seed` — seed demo data.

## Cloud.ru deployment outline

1. Создать Cloud.ru project и registry.
2. Создать Managed PostgreSQL и задать `DATABASE_URL`.
3. Собрать Linux amd64 image:

```bash
docker buildx build --platform linux/amd64 -t <cloud-registry>/coursework/triage-ai:latest .
```

4. Запушить image в Artifact Registry.
5. Deploy в Cloud.ru Container Apps с переменными:
   - `PORT=8080`
   - `HOST=0.0.0.0`
   - `NODE_ENV=production`
   - `STORAGE_MODE=postgres`
   - `DATABASE_URL=<managed-postgres-url>`
   - `CORS_ORIGIN=<frontend-or-service-origin>`
6. Выполнить миграции как deploy step:

```bash
npm run db:deploy
npm run db:seed
```

7. Health check: `/api/health`.

## Проверки качества

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

GitHub Actions запускает тот же quality gate на push/PR.

## Ограничения MVP

- Mock auth не защищает production environment.
- Real Prometheus/ELK/Telegram/Slack/Email integrations не подключены.
- AI provider rules-based/mock, без внешних OpenAI/cloud LLM keys.
- RBAC, SSO, audit log, multitenancy и secrets management нужны как production follow-up.
- Auto-remediation отсутствует: AI остается human-in-the-loop.

## Документация

- [Продуктовая документация](docs/README.md)
- [Nikita implementation plan](docs/NIKITA_IMPLEMENTATION_PLAN.md)
- [Nikita implementation report](docs/NIKITA_IMPLEMENTATION_REPORT.md)
