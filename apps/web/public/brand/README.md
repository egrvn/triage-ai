# Triage AI logo v3 assets

Выбранный вариант: **логотип №3** — абстрактная буква `T` с расходящимися линиями и узлами.

Смысл знака:
- `T` — Triage AI;
- расходящиеся линии — маршрутизация сигналов, evidence и сценариев incident response;
- узлы — логи, метрики, deploy events и оповещения;
- mint/green gradient — AI-assisted resolution / переход от хаоса к понятному next step.

## Что внутри

### Основной знак
- `triage-ai-v3-mark.svg` — прозрачный SVG для сайта.
- `triage-ai-v3-mark-dark.svg` — версия знака для тёмного фона.
- `triage-ai-v3-mark-1024.png` — прозрачный PNG.
- `triage-ai-v3-mark-512.png` — прозрачный PNG.
- `triage-ai-v3-mark-256.png` — прозрачный PNG.

### Горизонтальный логотип
- `triage-ai-v3-logo-horizontal.svg` — для светлого фона.
- `triage-ai-v3-logo-horizontal-light.svg` — для тёмного фона.
- `triage-ai-v3-logo-horizontal.png` — PNG для светлого фона.
- `triage-ai-v3-logo-horizontal-light.png` — PNG для тёмного фона.

### Favicon / app icons
- `favicon.ico`
- `favicon.svg`
- `favicon-16x16.png`
- `favicon-32x32.png`
- `favicon-48x48.png`
- `favicon-64x64.png`
- `apple-touch-icon.png`
- `icon-192x192.png`
- `icon-512x512.png`
- `site.webmanifest`

## Как подключить в Vite / React

Скопируй файлы в `apps/web/public/` или в `public/` проекта.

В `index.html`:

```html
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
```

В header на светлом фоне:

```tsx
<img src="/triage-ai-v3-logo-horizontal.svg" alt="Triage AI" className="h-8 w-auto" />
```

На тёмном фоне:

```tsx
<img src="/triage-ai-v3-logo-horizontal-light.svg" alt="Triage AI" className="h-8 w-auto" />
```

Для компактной sidebar-иконки:

```tsx
<img src="/triage-ai-v3-mark.svg" alt="" className="size-8" aria-hidden="true" />
```

## Рекомендация

- Для сайта и интерфейса лучше использовать SVG.
- Для favicon использовать `favicon.ico` + `favicon.svg`.
- PNG использовать для презентаций, README и случаев, где SVG не подходит.
