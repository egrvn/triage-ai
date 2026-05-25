# Design brief: Cloud.ru-inspired Triage AI

## Цель

Финальный редизайн делает Triage AI визуально ближе к зрелой B2B cloud console: строгая навигация,
понятная структура сервисов, крупный публичный первый экран и плотный личный кабинет для DevOps/SRE-команд.
Продукт сохраняет собственный бренд, логотип, тексты и mint/green accent.

## Публичные принципы Cloud.ru, применённые в Triage AI

- Крупный hero ведёт пользователя к личному кабинету, а не перегружает первый экран техническими деталями.
- Сервисные карточки объясняют продукт через понятные точки входа: Incident Workspace, AI-ассистент,
  подтверждающие данные, интеграции, провайдеры ИИ и метрики пилота.
- App shell похож на cloud console: компактная левая навигация, группы разделов, breadcrumbs,
  project/env selector, статус тестового режима и плотные рабочие панели.
- Визуальная метафора портала интерпретирована как переход от хаоса alert/logs/metrics к понятному
  incident context.
- Документация разделена на публичный режим и режим внутри личного кабинета, с левой навигацией,
  callouts и сценариями демонстрации.

## Что не копировалось

- Логотип, фирменные изображения, 3D-ассеты, иллюстрации и trademark-элементы Cloud.ru.
- Тексты, footer links, названия продуктов и брендовые элементы Cloud.ru.
- Proprietary UI как точная копия. Использованы только общие принципы публичного дизайн-кода:
  чистые панели, enterprise density, аккуратные controls, dark/light и понятная навигация.

## Design tokens

- Light theme: near-white background, white elevated cards, мягкие neutral borders и mint accent.
- Dark theme: graphite/navy surfaces вместо чистого чёрного, readable muted text, controlled green accent.
- Semantic status colors: critical, warning, success, info, low-confidence.
- Motion tokens: portal paths в hero, без тяжёлой фоновой анимации внутри app shell.

## Идентичность Triage AI

Triage AI позиционируется как AI-слой для incident response поверх существующего observability stack.
Главная продуктовая ось остаётся собственной: alert → incident workspace → AI summary → explainability →
evidence → Copilot → action → feedback.
