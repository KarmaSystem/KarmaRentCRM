# Rental Planner

Rental Planner — mobile-first Telegram Mini App для управления прокатом скутеров, мотоциклов, автомобилей и недвижимости. Интерфейс построен вокруг календарной шахматки, карточек броней и финансовой сводки.

## Реализовано

В проекте есть Next.js/React/TypeScript интерфейс с пятью разделами: календарь, бронирования, аналитика, финансы и профиль. Календарь поддерживает горизонтальный скролл по датам, вертикальный список объектов, sticky-заголовок и цветные booking bars. Формы используют автоматические расчёты суммы и остатка на уровне бизнес-логики.

Backend содержит REST route handlers для объектов, броней, платежей, расходов, аналитики и health check. Prisma-схема рассчитана на PostgreSQL и изолирует все сущности по `user_id`. Telegram initData проверяется на сервере через HMAC-SHA256; неподписанный Telegram ID не принимается.

Также добавлены техническая блокировка объекта, overlap validation, идемпотентная обработка pending notifications, Telegram `/start` webhook-каркас и unit-тесты расчётов.

## Локальный запуск

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Для локального демо необходимо явно выставить `DEMO_MODE=true`, поднять PostgreSQL и выполнить `npm run db:seed`. В production demo mode должен быть выключен.

## Переменные окружения

`DATABASE_URL` — PostgreSQL connection string. `TELEGRAM_BOT_TOKEN` и `TELEGRAM_BOT_USERNAME` — данные BotFather. `TELEGRAM_WEBAPP_URL` и `APP_URL` — публичный Railway URL. `TELEGRAM_WEBHOOK_SECRET` — секрет webhook. `CRON_SECRET` — bearer secret для cron endpoint. `DEMO_MODE` — только явный локальный режим.

## Railway

Создайте Railway Project, добавьте PostgreSQL plugin и service из GitHub-репозитория. В Variables задайте значения из `.env.example`, кроме локального demo режима. Dockerfile запускает `prisma migrate deploy`, затем standalone Next.js server. Health endpoint: `/api/health`. Cron можно направить на `POST /api/cron/notifications` с `Authorization: Bearer $CRON_SECRET` один раз в день в 09:00 в timezone владельца или через отдельный worker.

## Telegram

В BotFather создайте Web App URL на Railway-домене и задайте `TELEGRAM_WEBAPP_URL`. Web App должен отправлять `Telegram.WebApp.initData` на `POST /api/telegram/auth` в поле `initData`; backend проверяет подпись и создаёт профиль пользователя. Никогда не подставляйте Telegram ID из тела запроса без валидации initData.

## Проверки

```bash
npm run typecheck
npm test
npm run build
```

Реальный Railway deploy и создание Telegram-бота невозможно выполнить из текущего окружения без доступа к аккаунту Railway и токена BotFather; код и инструкции подготовлены для подключения этих переменных в Railway Variables, без хранения секретов в Git.

## Расширенные модули

После миграций `0002_expanded_crm` и `0003_team_members` доступны партнёры, роли OWNER/ADMIN/MANAGER, JSON-права менеджеров, сортировка объектов, цвета статусов и публичные акты передачи. Для изменения схемы в Railway используется обычный redeploy: Dockerfile запускает `prisma migrate deploy` до старта Next.js.
