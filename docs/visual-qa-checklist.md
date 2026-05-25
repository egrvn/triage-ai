# Visual QA Checklist

Эта проверка нужна отдельно от функциональных тестов: приложение может проходить сценарии, но всё равно выглядеть непрофессионально из-за переполнений, тяжёлых блоков и плохой сетки.

## Routes

- `/`
- `/login`
- `/docs`
- `/app/docs`
- `/dashboard`
- `/incidents`
- `/incidents/:id`
- `/integrations`
- `/settings`

## Viewports

- `375x812`
- `768x1024`
- `1440x900`
- `1920x1080`

## Что проверять вручную

- Нет горизонтального scroll.
- Карточки не налезают друг на друга.
- Badges не обрезаются и не вылезают за карточку.
- Code blocks прокручиваются внутри блока, а не растягивают страницу.
- Фильтры сгруппированы и читаются как control panel.
- LLM provider cards не показывают огромные code blocks по умолчанию.
- Sidebar user card компактный, email не ломает layout.
- Метрики пилота выглядят как исследовательские KPI, а не операционные метрики инцидента.
- В dark theme нет грубого контраста и гигантского белого текста.
- На mobile кнопки и badges переносятся, а не выходят за контейнер.
- В одной секции нет бессмысленного повторения одинаковых иконок.
- Landing выглядит как зрелый AI-product: сильный hero, продуктовый preview, аккуратный falling pattern и без учебных формулировок.
- App shell выглядит как рабочая cloud console: группы навигации, project/env selector, компактные панели.

## Антипаттерны

- `w-screen` и `100vw` внутри app shell.
- Fixed widths без `min-width: 0`.
- Grid/flex children без `min-width: 0`.
- Button groups без `flex-wrap`.
- Длинные `pre`, `code`, `table` без `overflow-x-auto`.
- Parent `overflow-hidden`, который режет важный badge или button.
- Большие code blocks внутри каждой карточки без collapse.

## Как запустить automated visual QA

```bash
npm install
npx playwright install chromium
npm run build
HOST=0.0.0.0 PORT=4000 STORAGE_MODE=memory CORS_ORIGIN='*' npm start
E2E_BASE_URL=http://localhost:4000 npm run test:e2e
```

Скриншоты сохраняются в:

```text
test-results/visual-snapshots
test-results/ui-redesign-screenshots
```

Если тесты проходят, всё равно откройте screenshots вручную и проверьте:

- `/integrations`: provider cards, badges, collapsed prompt/output.
- `/incidents`: filter panel, chart, incident list, details.
- `/dashboard`: компактность overview и карточка “Что измеряем на пилоте”.
- `/docs`: sticky navigation, таблицы, code blocks.

## Критерий приёмки

Visual QA считается пройденным, если нет горизонтального scroll, переполнений карточек, обрезанных badges, огромных пустых блоков и нечитаемых фильтров на всех перечисленных routes и viewports.
