# Продуктовая документация Triage AI

## Обзор

Triage AI — MVP-консоль для incident response. Она помогает on-call и escalation-командам быстрее собрать context, получить auto-summary, сформировать root-cause hypothesis и проверить evidence.

MVP работает в mock mode: данные synthetic, real secrets не используются, интеграции показывают adapter boundaries и production requirements.

## Быстрый старт

1. Откройте `/login`.
2. Войдите с `demo@triage.ai` / `demo1234`.
3. Перейдите в Dashboard.
4. Выберите demo scenario.
5. Нажмите play.
6. Откройте созданный incident.
7. Проверьте AI summary, evidence и recommended next steps.
8. Примите incident в работу, эскалируйте или закройте.

## Как работает triage

1. Signals поступают из Prometheus/ELK/mock adapters.
2. Система нормализует события.
3. Correlation engine связывает Logs, Metrics и Deployment context.
4. AI analysis provider формирует summary и hypothesis.
5. Confidence score показывает надежность вывода.
6. Low confidence fallback включается, когда данных недостаточно.

## Demo scenarios

| Scenario | Affected service | Input signals | Expected AI summary | Likely hypothesis | Recommended action |
| --- | --- | --- | --- | --- | --- |
| Release regression: HTTP 5xx spike | payment-svc | HTTP 5xx spike, correlated Logs, Deployment | Рост 5xx после Release | regression в последнем Deployment | Проверить diff и выполнить rollback при подтверждении |
| Latency degradation under load | catalog-svc | p95 latency, CPU pressure, queue depth | Деградация latency под нагрузкой | resource saturation / queue backlog | Проверить capacity, workers и autoscaling |
| External API timeout | checkout-svc | external API errors, timeout Logs | Checkout деградирует из-за dependency | loyalty-api outage или latency spike | Включить fallback и уведомить owning team |
| Sparse signal: low confidence fallback | profile-svc | неполный Alert, минимум Logs/Metrics | Недостаточно context | нет уверенной root cause | Собрать дополнительные signals или escalation |

## Интеграции

| Integration | Назначение | Режим MVP | Production needs |
| --- | --- | --- | --- |
| Prometheus metrics | Metrics и SLO signals | mock / healthy | endpoint, read-only API Token, alert rules |
| ELK logs | Logs, trace id, error context | mock / healthy | endpoint, index pattern, service account |
| Telegram alerts | On-call notifications | mock / healthy | bot Token, chat id, notification policy |
| Slack alerts | Team incident notifications | disabled | Slack app, Webhook URL, workspace approval |
| Email alerts | Email fallback | disabled | SMTP endpoint, sender identity, recipient groups |
| AI analysis provider | auto-summary, hypothesis, confidence | mock / healthy | approved provider, API key, data policy |

## Роли

On-call view фокусируется на impact, affected service и ближайшем безопасном действии: принять incident, проверить service, подготовить rollback или escalation.

Escalation view фокусируется на context handoff: timeline, evidence, confidence и качестве root-cause hypothesis.

## Статусы и метрики

- `Critical active` — critical incidents, которые еще не resolved.
- `AI analyzed` — incidents с AI summary и hypothesis.
- `Low confidence` — scenarios, где signal неполный и нужна ручная проверка.
- `active` — incident создан и ожидает реакции.
- `acknowledged` — incident принят в работу.
- `escalated` — incident передан в escalation.
- `resolved` — incident закрыт.

## FAQ

### Почему данные mock?

Курсовой MVP должен запускаться без customer data, real endpoints и secrets. Synthetic data позволяет показать end-to-end flow на защите.

### Можно ли подключить реальные Prometheus/ELK?

Да. Для этого нужны production adapters, network allowlist, credentials и secrets management.

### Что означает low confidence?

Система не уверена в hypothesis, потому что signal неполный или evidence слабая. В таком случае AI не должен выдумывать уверенную root cause.

### Заменяет ли AI инженера?

Нет. AI ускоряет сбор context, но mitigation decision остается за on-call или escalation.

### Где хранятся secrets?

В MVP secrets не хранятся. Для production нужен внешний secrets management и политика доступа.

### Как перейти от MVP к production?

Добавить real data sources, backend auth/RBAC, audit log, secrets management, observability, rate limits и Cloud.ru deployment pipeline.
