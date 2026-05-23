# Отчет по реализации зоны Никиты

Дата проверки: 23 мая 2026.
Ветка: `test/nikita-coursework-implementation`.
Репозиторий: `https://github.com/egrvn/coursework`.

## 1. Что найдено в проекте

На старте в папке курсовой не было прикладного кода: не было backend, frontend, БД, API, Docker, CI и тестов. Были только материалы курсовой и HTML-прототип.

Изученные актуальные источники:

- `Курсовой_проект_исследовательская_часть.docx` - исследовательская часть и продуктовая логика.
- `Структура практической части .xlsx` - практические блоки и распределение задач.
- `Кейс Cloud.ru для ВШЭ_Этап_Discovey_v2.docx` - исходный кейс заказчика.
- `Встреча с заказчиком Cloud.ru 23 марта.docx` - уточнения заказчика.
- `Triage MVP - _ _.html` и `Инструкция по макету .rtf` - прототип и сценарий CustDev-проверки.
- `Презентация_защита_30_апреля.pptx.pdf`, `Защита.docx` - материалы защиты и краткое описание решения.

Контекстные/черновые источники:

- `Вопросы к заказчику.md`, `Вопросы к встрече 23.03.docx` - подготовительные вопросы.
- `Дополнительная информация по КП.pdf`, `Метод_указания_Курсовой_проект_2026_v5.pdf` - методические материалы.
- `tmp/` - локальные сгенерированные превью и служебные файлы, в Git не добавлялись.

## 2. Пункты Никиты

В практической части к Никите относятся:

- Блок 8: backend-разработка - mock ingestion метрик, правила обнаружения аномалий, wrapper для AI-объяснений/рекомендаций, REST API для UI, базовый CI.
- Блок 9: frontend dashboard совместно с Оксаной - экран метрик, лента инцидентов с AI-анализом, настройки алертов и mock-интеграций.
- Блок 10: интеграция и e2e-сборка - связать backend, frontend и mock-данные в демонстрационный стенд.

Связанные требования из исследования и заказчика:

- Решение должно работать поверх существующих мониторинговых инструментов, а не заменять Prometheus/ELK/Grafana.
- Область MVP - web-приложения.
- Для курсового MVP достаточно synthetic/mock data.
- Основная ценность Release 1 - реактивный triage: summary, гипотеза root cause, корреляция с деплоем, explainability.
- AI остается human-in-the-loop: автоматического remediation в MVP нет.
- Реальные секреты и ключи LLM-провайдеров не хранятся в коде.

## 3. Что реализовано

Реализован runnable full-stack MVP:

- TypeScript monorepo с workspaces `apps/api`, `apps/web`, `packages/shared`.
- Backend на Fastify:
  - REST API для сценариев, инцидентов, AI-анализа, feedback и настроек интеграций;
  - mock ingestion endpoints для alerts/metrics/logs/deploys;
  - deterministic analyzer для 5xx regression, latency saturation, external dependency timeout и low-confidence fallback;
  - memory repository для локального демо без БД;
  - Prisma repository для PostgreSQL.
- Shared contracts:
  - Zod-схемы и TypeScript-типы для API payloads, incidents, metrics, logs, deploys, feedback, integrations.
- Frontend на React/Vite:
  - operations dashboard;
  - запуск demo scenarios;
  - incident queue;
  - incident detail с AI summary, root-cause hypothesis, confidence, metric slice, deploy correlation;
  - `Explain why` drawer с evidence;
  - feedback controls;
  - settings view для mock-интеграций.
- База данных:
  - Prisma schema;
  - SQL migration `0001_init`;
  - seed script с демо-настройками и сценариями.
- Deploy/infra:
  - `Dockerfile`;
  - `docker-compose.yml` с PostgreSQL и миграциями перед стартом app;
  - `.dockerignore`;
  - `.env.example`;
  - Cloud.ru deployment outline в `README.md`.
- CI:
  - GitHub Actions workflow `.github/workflows/ci.yml` с `npm ci`, Prisma generate, lint, typecheck, tests, build.

## 4. Выбранный стек

Стек выбран с учетом отсутствия существующей реализации и будущего деплоя на Cloud.ru:

- Frontend: React, Vite, TypeScript, TanStack Query, Recharts, lucide-react.
- Backend/API: Node.js 20, Fastify, TypeScript, Zod.
- Contracts: shared TypeScript package + Zod.
- DB: PostgreSQL + Prisma migrations.
- Deployment: single Docker image + Docker Compose for local PostgreSQL, Cloud.ru Container Apps compatible.

Почему так:

- один язык и типы на frontend/backend/API-контрактах;
- достаточно просто для защиты, но похоже на реальную промышленную архитектуру;
- PostgreSQL и Docker хорошо ложатся на Cloud.ru;
- memory mode позволяет показывать демо без внешних сервисов и секретов.

## 5. Основные файлы

- `README.md` - запуск, API, demo flow, Cloud.ru outline.
- `.env.example` - переменные окружения без секретов.
- `.github/workflows/ci.yml` - CI.
- `Dockerfile`, `docker-compose.yml`, `.dockerignore` - контейнеризация.
- `packages/shared/src/schemas.ts` - API-контракты и типы.
- `apps/api/src/services/analyzer.ts` - бизнес-логика анализа инцидентов.
- `apps/api/src/routes.ts` - REST API.
- `apps/api/src/repositories/*` - memory/PostgreSQL persistence.
- `apps/api/prisma/schema.prisma` и `apps/api/prisma/migrations/0001_init/migration.sql` - схема БД.
- `apps/web/src/App.tsx` и `apps/web/src/styles.css` - основной UI.
- `apps/api/src/tests/*`, `apps/web/src/tests/*` - минимальные тесты.

## 6. Как запустить

Локально без PostgreSQL:

```bash
npm install
cp .env.example .env
npm run dev
```

Открыть:

- UI: `http://localhost:5173`
- API health: `http://localhost:4000/api/health`

Production smoke локально:

```bash
npm run db:generate
npm run build
npm start
```

Docker:

```bash
docker compose up --build
```

Открыть `http://localhost:8080`.

## 7. Как проверить функционал Никиты

Основной сценарий:

1. Открыть dashboard.
2. Запустить `Release regression: HTTP 5xx spike`.
3. Проверить, что появился инцидент `HTTP 5xx spike on payment-svc`.
4. Открыть карточку инцидента.
5. Проверить:
   - AI summary;
   - root-cause hypothesis;
   - confidence `High`;
   - metric slice;
   - deploy correlation `feat/retry-logic-v2`;
   - `Explain why` evidence;
   - feedback `Useful` / `Not useful`.
6. Запустить `Sparse signal: low confidence fallback` и проверить, что система не выдумывает уверенную root-cause гипотезу.

API smoke:

```bash
curl -s http://127.0.0.1:4000/api/health
curl -s -X POST http://127.0.0.1:4000/api/scenarios/release-regression-5xx/run
```

## 8. Проверки качества

Выполнено локально:

- `npm install` - успешно.
- `npm run db:generate` - успешно.
- `npm run lint` - успешно.
- `npm run typecheck` - успешно.
- `npm test` - успешно:
  - API: 2 test files, 4 tests passed;
  - Web: 1 test file, 1 test passed.
- `npm run build` - успешно.
- `npm start` - production API/UI smoke успешно:
  - `/api/health` отвечает;
  - scenario runner создает incident + analysis + evidence;
  - API отдает собранный frontend.
- UI smoke через headless Chrome DevTools Protocol:
  - desktop render проверен;
  - mobile viewport 390px проверен;
  - `scrollWidth=390`, горизонтального overflow нет.

Docker build локально не проверен: в текущем окружении отсутствует Docker CLI (`docker: command not found`). Конфигурация Docker/Docker Compose подготовлена, но требует проверки на машине с Docker.

Замечания:

- Vite предупреждает о JS chunk около 702 KB после minification. Для MVP это не блокер, но перед пилотом стоит вынести графики/тяжелые зависимости в lazy chunks.
- После `npm install` npm сообщил об одной moderate vulnerability в дереве зависимостей. Автоматический `npm audit fix --force` не запускался, чтобы не ломать версии без отдельного решения.

## 9. Ограничения

- Реальные Prometheus/ELK/Telegram/email/LLM интеграции не подключались: по требованиям MVP они оставлены в mock/adapter-ready режиме.
- Авторизация, multitenancy, RBAC и audit log не реализованы - в документах это не относится к MVP Release 1.
- Cloud.ru deployment не был выполнен, потому что нужны credentials, registry и Managed PostgreSQL.
- PR в GitHub может быть невозможен до появления base branch, потому что удаленный репозиторий изначально был пустым.

## 10. Что осталось сделать после MVP

- Проверить `docker compose up --build` на машине с Docker.
- Создать/подтвердить base branch в GitHub и открыть PR из тестовой ветки.
- Подключить реальные adapter implementations после выдачи тестовых Prometheus/ELK endpoints и правил доступа.
- Добавить auth/RBAC перед пилотом на инфраструктуре заказчика.
- Оптимизировать frontend bundle перед production/pilot.
