# mnemos-zero

## Обзор

`mnemos-zero` — monorepo на `pnpm` и `Turborepo`, объединяющее три прикладных модуля и один общий пакет:

- `apps/api` — HTTP API на Fastify с Prisma и PostgreSQL.
- `apps/web` — клиентское SPA-приложение на React + Vite.
- `apps/landing` — SSR-лендинг на Next.js.
- `packages/types` — слой артефактов OpenAPI/Orval для типизированной интеграции frontend ↔ API.

README ориентирован на техническое описание текущего состояния репозитория: состава модулей, связей между ними, сборки, генерации артефактов и схемы деплоя.

## Состав репозитория

```text
.
├── apps/
│   ├── api/                # Fastify API, Prisma schema, миграции, Dockerfile
│   ├── landing/            # Next.js SSR-приложение и Dockerfile
│   └── web/                # Vite SPA и OpenAPI-клиент
├── packages/
│   └── types/              # swagger.json и конфигурация Orval
├── deploy/
│   └── compose.yml         # production-compose для db/api/landing
├── .github/workflows/      # CI/CD workflow деплоя
├── eslint.config.mjs       # единая ESLint-конфигурация monorepo
├── prettier.config.mjs     # единая Prettier-конфигурация
├── package.json            # корневые скрипты и dev-tooling
├── pnpm-workspace.yaml     # описание workspace-пакетов
├── tsconfig.base.json      # базовая TypeScript-конфигурация
└── turbo.json              # граф задач Turborepo
```

## Архитектурная схема

```text
┌────────────────────┐
│   apps/landing     │  Next.js SSR
│   public entry     │
└─────────┬──────────┘
          │
          │ независимый runtime
          │
┌─────────▼──────────┐        exports OpenAPI        ┌────────────────────┐
│     apps/api       │ ───────────────────────────▶ │   packages/types   │
│ Fastify + Prisma   │                              │ swagger.json       │
└─────────┬──────────┘                              │ Orval config       │
          │                                         └─────────┬──────────┘
          │ PostgreSQL                                         │ generates
          │                                                    │
┌─────────▼──────────┐                              ┌──────────▼─────────┐
│        db          │                              │     apps/web       │
│     Postgres       │ ◀─────────────────────────── │ React + Vite SPA   │
└────────────────────┘        HTTP /api             │ generated client   │
                                                    └────────────────────┘
```

## Workspace и orchestration

### `pnpm-workspace.yaml`

Workspace включает два шаблона каталогов:

- `apps/*`
- `packages/*`

Это означает, что все приложения и внутренние пакеты управляются через единое дерево зависимостей и lockfile.

### `package.json` (корень)

Корневой пакет не содержит прикладного кода и используется как точка запуска orchestration-команд:

- `pnpm dev` — параллельный запуск `dev`-скриптов всех пакетов через `turbo run dev --parallel --no-daemon`.
- `pnpm build` — каскадная сборка workspace-пакетов.
- `pnpm lint` — запуск линтинга во всех подпроектах.
- `pnpm typecheck` — запуск проверки типов во всех подпроектах.
- `pnpm format` / `pnpm format:write` — проверка и применение форматирования Prettier.

### `turbo.json`

Turborepo используется как слой декларативного исполнения задач:

- `dev` отключает кэш и работает как `persistent`-процесс.
- `build` зависит от `^build`, поэтому сборка происходит снизу вверх по графу зависимостей.
- Артефакты сборки для кэширования: `dist/**`, `build/**`, `.next/**`.
- `typecheck`, `lint` и `format` описаны как отдельные pipeline-задачи.

## Приложения и пакеты

### 1. `apps/api`

Назначение: backend API, источник OpenAPI-описания и точка доступа к PostgreSQL.

#### Технологический стек

- Node.js
- TypeScript
- Fastify
- `@fastify/cors`
- `@fastify/swagger`
- `@fastify/swagger-ui`
- Prisma ORM
- PostgreSQL
- `dotenv`

#### Основные директории

```text
apps/api/
├── prisma/
│   ├── migrations/         # SQL-миграции Prisma
│   └── schema.prisma       # модель данных
├── src/
│   ├── index.ts            # bootstrap Fastify-приложения и маршруты
│   └── prisma.ts           # инициализация PrismaClient
├── Dockerfile              # production image для API
├── package.json
├── prisma.config.ts        # Prisma CLI config
└── tsconfig.json
```

#### Runtime-структура

`src/index.ts` выполняет следующие функции:

1. Загружает переменные окружения через `dotenv/config`.
2. Создаёт экземпляр Fastify с логгером.
3. Подключает CORS с использованием `CORS_ORIGIN`.
4. Регистрирует Swagger и Swagger UI.
5. Объявляет HTTP-маршруты.
6. Запускает сервер на `HOST`/`PORT` с дефолтами `0.0.0.0:4000`.

#### HTTP API

Текущие маршруты минимальны и используются как skeleton для интеграции:

- `GET /api/health` — проверка доступности сервиса, ответ `{ ok: true }`.
- `GET /api/messages` — чтение списка сообщений из таблицы `Message`, сортировка по `id DESC`.
- `GET /docs` — Swagger UI.
- `GET /docs/json` — JSON-схема OpenAPI, экспортируемая в `packages/types/swagger.json`.

#### Слой данных

В `schema.prisma` описан единственный datasource `postgresql` и одна модель:

- `Message`
    - `id Int @id @default(autoincrement())`
    - `text String`
    - `createdAt DateTime @default(now())`

Файл `src/prisma.ts` создаёт `PrismaClient` через адаптер `PrismaPg`, читая `DATABASE_URL` из окружения, и корректно завершает соединение по `SIGINT`/`SIGTERM`.

#### Скрипты пакета

- `pnpm --filter @mnemos-zero/api dev` — `tsx watch src/index.ts`
- `pnpm --filter @mnemos-zero/api build` — компиляция `tsc -p tsconfig.json`
- `pnpm --filter @mnemos-zero/api start` — запуск собранного `dist/index.js`
- `pnpm --filter @mnemos-zero/api lint`
- `pnpm --filter @mnemos-zero/api typecheck`
- `pnpm --filter @mnemos-zero/api swagger:export` — выгрузка OpenAPI JSON в `packages/types/swagger.json`
- `pnpm --filter @mnemos-zero/api prisma:generate`
- `pnpm --filter @mnemos-zero/api prisma:migrate:dev`
- `pnpm --filter @mnemos-zero/api prisma:migrate:deploy`

#### Сборка контейнера

`apps/api/Dockerfile` реализует multi-stage build:

1. `base` — системные зависимости (`openssl`, `ca-certificates`).
2. `builder` — активация `pnpm`, установка зависимостей, сборка API, `pnpm deploy --prod /out`.
3. `runtime` — минимальный production runtime, запускающий `node dist/index.js`.

Контейнер слушает порт `4000`.

### 2. `apps/web`

Назначение: SPA-клиент, использующий типизированный API-клиент, сгенерированный из OpenAPI.

#### Технологический стек

- React
- Vite
- TypeScript
- Axios
- TanStack Query
- Orval-generated client

#### Основные директории

```text
apps/web/
├── public/
│   └── favicon.svg
├── src/
│   ├── api/
│   │   └── index.ts        # сгенерированный Orval-клиент
│   └── main.tsx            # bootstrap React-приложения
├── index.html
├── package.json
├── tsconfig*.json
└── vite.config.ts
```

#### Runtime-структура

- `src/main.tsx` поднимает минимальное React-приложение.
- При монтировании выполняется `getApiMessages()` из сгенерированного клиента.
- Полученный массив сообщений отображается простым списком.

#### Особенности интеграции с API

- Vite dev server проксирует `/api` на `http://localhost:4000`.
- OpenAPI-клиент расположен в `src/api/index.ts` и не предназначен для ручного редактирования.
- Генерация выполняется из пакета `packages/types`.

#### Скрипты пакета

- `pnpm --filter @mnemos-zero/web dev`
- `pnpm --filter @mnemos-zero/web build`
- `pnpm --filter @mnemos-zero/web preview`
- `pnpm --filter @mnemos-zero/web lint`
- `pnpm --filter @mnemos-zero/web typecheck`

### 3. `apps/landing`

Назначение: отдельное SSR-приложение, не зависящее от Vite SPA и разворачиваемое как самостоятельный Node runtime.

#### Технологический стек

- Next.js
- React
- TypeScript

#### Основные директории

```text
apps/landing/
├── public/
│   └── favicon.svg
├── src/app/
│   ├── layout.tsx          # root layout и metadata
│   └── page.tsx            # стартовая SSR-страница
├── Dockerfile
├── next.config.mjs
├── package.json
└── tsconfig.json
```

#### Runtime-структура

- Используется App Router (`src/app`).
- `layout.tsx` задаёт корневой HTML-каркас и favicon metadata.
- `page.tsx` содержит минимальную стартовую страницу.
- В `next.config.mjs` включён `output: 'standalone'`, что позволяет собирать self-contained runtime для контейнера.

#### Скрипты пакета

- `pnpm --filter @mnemos-zero/landing dev`
- `pnpm --filter @mnemos-zero/landing build`
- `pnpm --filter @mnemos-zero/landing start`
- `pnpm --filter @mnemos-zero/landing lint`
- `pnpm --filter @mnemos-zero/landing typecheck`

#### Сборка контейнера

`apps/landing/Dockerfile` также реализует multi-stage build:

1. `builder` — установка зависимостей и `next build`.
2. `runtime` — перенос standalone bundle, static assets и `public`.

Контейнер публикует порт `3001` и запускает `node apps/landing/server.js`.

### 4. `packages/types`

Назначение: промежуточный пакет для хранения OpenAPI-артефактов и конфигурации кодогенерации.

#### Состав

```text
packages/types/
├── orval.config.js         # генерация клиента для apps/web
├── package.json
└── swagger.json            # экспорт OpenAPI из apps/api
```

#### Поток генерации

1. API поднимается локально на `localhost:4000`.
2. Выполняется `swagger:export` из `apps/api`, который сохраняет `/docs/json` в `packages/types/swagger.json`.
3. Выполняется `pnpm --filter @mnemos-zero/types gen:api`.
4. Orval перегенерирует `apps/web/src/api/index.ts` с `axios` + `react-query` клиентом.

Этот пакет не содержит runtime-кода и служит исключительно мостом между backend-контрактом и frontend-клиентом.

## TypeScript-конфигурация

### Базовый слой

`tsconfig.base.json` задаёт общие для monorepo параметры:

- `target: ES2022`
- `module: ESNext`
- `moduleResolution: Bundler`
- `strict: true`
- `resolveJsonModule: true`
- `esModuleInterop: true`
- `allowSyntheticDefaultImports: true`

### Переопределения по приложениям

- `apps/api/tsconfig.json` переключает backend на `CommonJS`, `Node`-style resolution и вывод в `dist`.
- `apps/web/tsconfig.app.json` ориентирован на browser/bundler-сценарий Vite.
- `apps/web/tsconfig.node.json` используется для инфраструктурных файлов, например `vite.config.ts`.
- `apps/landing/tsconfig.json` адаптирован под Next.js App Router и инкрементальную проверку типов.

## Линтинг и форматирование

### ESLint

Корневая конфигурация `eslint.config.mjs` задаёт:

- общие правила для `js/jsx/ts/tsx`;
- разделение `globals` для browser- и node-окружений;
- игнорирование `dist`, `build`, `.next`, `node_modules`;
- базовые правила качества:
    - `no-console: warn`
    - `no-debugger: error`
    - `@typescript-eslint/no-explicit-any: warn`
    - мягкая обработка `_`-префикса для неиспользуемых переменных.

### Prettier

`prettier.config.mjs` фиксирует единый формат:

- `singleQuote: true`
- `trailingComma: 'all'`
- `printWidth: 100`
- `semi: true`
- `tabWidth: 2`
- `endOfLine: 'lf'`

## Локальная разработка

### Предпосылки

Минимально требуются:

- Node.js 20+
- `pnpm` 10.32.1
- PostgreSQL 16+ либо совместимый инстанс
- переменные окружения для API

### Установка зависимостей

```bash
pnpm install
```

### Базовый сценарий запуска

#### 1. Поднять PostgreSQL

Локальный способ не зафиксирован отдельным dev-compose; допустимо использовать внешний инстанс PostgreSQL или production-like compose из `deploy/compose.yml` с адаптацией окружения.

#### 2. Подготовить переменные окружения API

Критически важные переменные:

- `DATABASE_URL` — обязательна для Prisma и старта API.
- `CORS_ORIGIN` — используется при настройке CORS.
- `HOST` — опционально, по умолчанию `0.0.0.0`.
- `PORT` — опционально, по умолчанию `4000`.

#### 3. Применить миграции и сгенерировать Prisma client

```bash
pnpm --filter @mnemos-zero/api prisma:generate
pnpm --filter @mnemos-zero/api prisma:migrate:dev
```

#### 4. Запустить все сервисы monorepo

```bash
pnpm dev
```

Типовое поведение в режиме разработки:

- API: `http://localhost:4000`
- Swagger UI: `http://localhost:4000/docs`
- Web (Vite): стандартный порт Vite, проксирующий `/api` на API
- Landing (Next.js): стандартный dev server Next.js

## Генерация API-контракта и клиента

Рекомендуемая последовательность при изменении backend-контракта:

```bash
pnpm --filter @mnemos-zero/api dev
pnpm --filter @mnemos-zero/api swagger:export
pnpm --filter @mnemos-zero/types gen:api
```

Результат процесса:

- `packages/types/swagger.json` обновляется из живого API.
- `apps/web/src/api/index.ts` перегенерируется в соответствии с контрактом.

## Сборка

### Полная сборка workspace

```bash
pnpm build
```

### Точечная сборка модулей

```bash
pnpm --filter @mnemos-zero/api build
pnpm --filter @mnemos-zero/web build
pnpm --filter @mnemos-zero/landing build
```

## Production deployment

### Docker Compose

`deploy/compose.yml` описывает четыре сервиса:

- `db` — PostgreSQL 16 с healthcheck.
- `api` — runtime контейнер backend-сервиса.
- `migrate` — одноразовый контейнер для `prisma migrate deploy`.
- `landing` — production-контейнер Next.js SSR.

Особенности compose-конфигурации:

- окружение API читается из `/etc/mnemos/api.env`;
- PostgreSQL data volume расположен в `/var/lib/mnemos-db`;
- наружу публикуются только loopback-порты:
    - `127.0.0.1:5432:5432`
    - `127.0.0.1:4000:4000`
    - `127.0.0.1:3001:3001`

### GitHub Actions workflow

`.github/workflows/deploy.yml` реализует self-hosted деплой при push в `master`:

1. Checkout репозитория.
2. Настройка `pnpm` и Node.js 20.
3. Установка зависимостей только для `apps/web` и публикация собранного Vite SPA в Nginx web root.
4. `turbo prune` + Docker build для `apps/landing`.
5. Поднятие landing-контейнера.
6. `turbo prune` + Docker build для `apps/api`.
7. Гарантированный запуск `db`.
8. Применение Prisma миграций через отдельный контейнер.
9. Перезапуск API-контейнера.
10. Best-effort healthchecks для API, DB и landing.

В этой схеме:

- SPA (`apps/web`) деплоится как статические файлы, обслуживаемые внешним Nginx.
- `apps/api` и `apps/landing` деплоятся как отдельные Docker-контейнеры.
- База данных управляется через тот же `docker compose` файл.

## Текущее состояние кода

Репозиторий представляет собой минимальный full-stack skeleton с уже настроенными инфраструктурными связями:

- backend ↔ database через Prisma;
- backend ↔ OpenAPI через Fastify Swagger;
- OpenAPI ↔ frontend client через `swagger.json` и Orval;
- Vite SPA ↔ backend через `/api` proxy;
- Next.js landing как отдельный SSR runtime;
- production-deploy pipeline через GitHub Actions + Docker Compose.

Основной фокус текущей структуры — не функциональная полнота, а наличие готового каркаса для дальнейшего расширения доменной логики без перестройки инфраструктурного основания.