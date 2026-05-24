# Triage AI

Triage AI — русскоязычная MVP-консоль для быстрого разбора инцидентов в DevOps/SRE-командах. Приложение собирает синтетические сигналы из Prometheus/ELK, формирует сводку ИИ, показывает гипотезу причины, подтверждающие данные и помогает дежурному инженеру выбрать следующий шаг.

MVP работает в тестовом режиме: реальные secrets не используются, внешние AI providers не подключаются, интеграции имитируют production boundaries.

## Стек

- React 19, Vite, TypeScript, React Router.
- Fastify API, Zod shared contracts.
- Prisma с PostgreSQL для Docker/production-подобного режима.
- Memory repository для локального запуска без БД.
- Recharts для графика динамики инцидентов.
- Vanilla CSS с mint/green CSS variables, light/dark theme через `.dark`.

## Быстрый запуск

```bash
npm install
cp .env.example .env
npm run dev
```

После запуска:

- Web: `http://localhost:5173`
- API: `http://localhost:4000/api/health`

По умолчанию используется `STORAGE_MODE=memory`, поэтому PostgreSQL не нужен для локальной демонстрации.

## Тестовый доступ

- Email: `demo@triage.ai`
- Пароль: `demo1234`

Это прозрачная тестовая авторизация для MVP. Сессия хранится в `localStorage` под ключом `triage-ai-session`, JWT не используется, production-защита не имитируется.

## Routes

- `/` — публичная посадочная страница.
- `/login` — вход в личный кабинет.
- `/docs` — публичная документация продукта.
- `/dashboard` — защищённая панель разбора инцидентов.
- `/integrations` — защищённые интеграции.
- `/settings` — защищённые настройки тестового пользователя.

## Как пользоваться сценариями

1. Откройте `/login`.
2. Войдите через тестовый доступ.
3. Перейдите в панель управления.
4. Выберите демонстрационный сценарий.
5. Нажмите кнопку запуска.
6. Проверьте созданный инцидент: сводку ИИ, гипотезу причины, подтверждающие данные и рекомендуемые действия.
7. Примите инцидент в работу, отправьте на эскалацию или закройте.
8. Переключите роль `Дежурный инженер / Эскалация` и сравните подсказки.

Доступные сценарии:

- Регрессия после релиза: всплеск HTTP 5xx.
- Рост задержки под нагрузкой.
- Тайм-аут внешнего API.
- Неполный сигнал и низкая уверенность.

## Интеграции

В MVP доступны карточки:

- Метрики Prometheus.
- Логи ELK.
- Оповещения Telegram.
- Оповещения Slack.
- Email-оповещения.
- Провайдер анализа ИИ.

Включённые интеграции работают в тестовом режиме. Отключённые показывают, какие endpoint, credentials, Webhook/API Token и secrets management потребуются для production.

## Scripts

- `npm run dev` — запустить API и web dev server.
- `npm run build` — собрать shared, API и web.
- `npm run start` — запустить production API, который также отдаёт web build.
- `npm test` — запустить тесты API и web.
- `npm run lint` — ESLint по репозиторию.
- `npm run typecheck` — TypeScript checks для всех workspaces.
- `npm run db:generate` — Prisma client generation.
- `npm run db:migrate` — локальная Prisma migration.
- `npm run db:deploy` — production migration deploy.
- `npm run db:seed` — seed тестовых данных.

## Docker

```bash
docker compose up --build
```

Приложение будет доступно на `http://localhost:8080`. Docker Compose поднимает PostgreSQL и запускает Prisma migrations перед стартом API.

## Ограничения MVP

- Авторизация тестовая и не заменяет production auth.
- Данные синтетические.
- ИИ-анализ rules-based, без внешних LLM keys.
- Secrets management не реализован внутри приложения.
- RBAC, audit log, SSO, real adapters и observability требуют отдельного production этапа.

## Production follow-ups

- Подключить реальные Prometheus/ELK источники.
- Добавить backend auth, RBAC и SSO.
- Настроить secrets management на инфраструктуре заказчика.
- Добавить audit log действий.
- Подключить production AI provider с политиками обработки данных.
- Добавить deployment pipeline и runtime monitoring.
