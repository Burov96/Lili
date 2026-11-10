# Логопедичен кабинет „Речта започва у дома“

Сайт с онлайн записване на часове за логопед Лиляна Ловчанска.
Next.js (App Router) + Postgres (Neon), без CSS рамки и без ORM — малко зависимости, лесен за поддръжка.

## Какво има

- **Страници:** начало, услуги (+ отделна страница за всяка от 6-те услуги), за логопеда, контакти, поверителност.
- **Записване (`/zapazi-chas`):** календар до 4 седмици напред, само делнични дни, кръгли часове от 15:00.
  Няколко души могат да запишат един и същи час (по подразбиране до 3). Записващият оставя име и телефон,
  а ако часът е за друг (напр. детето) — и неговото име. Изборът на ден и час е в адреса (`?date=…&hour=…`).
- **Админ (`/admin`):** вход с парола; предстоящите часове по дни, изтриване (с потвърждение), почивни дни.
  Официалните български празници (вкл. Великден) се затварят автоматично.
- **SEO:** `lang="bg"`, мета данни и canonical за всяка страница, Open Graph изображение, `sitemap.xml`,
  `robots.txt`, структурирани данни (MedicalBusiness, Service, BreadcrumbList).
- **Поверителност:** съгласие при записване, данните се изтриват автоматично 180 дни след посещението.

## Настройки

Всичко важно е в [`lib/config.ts`](lib/config.ts): часове (`firstHour`, `lastHour`), капацитет на час,
колко седмици напред, телефон, **адрес и град** (празни са — попълни ги, важни са за локалното SEO).
Текстовете на услугите са в [`lib/services.ts`](lib/services.ts).

## Локално стартиране

```bash
npm install
cp .env.example .env.local   # попълни ADMIN_PASSWORD и SESSION_SECRET
npm run dev
```

Без `DATABASE_URL` записванията се пазят във `.data/db.json` — удобно за проба.

## Публикуване във Vercel

1. Качи проекта в GitHub и го импортирай във Vercel.
2. Vercel → проекта → **Storage → Create → Neon (Postgres)** → свържи го. Това задава `DATABASE_URL`.
   Таблиците се създават автоматично при първото записване.
3. **Settings → Environment Variables:** `NEXT_PUBLIC_SITE_URL` (крайният домейн), `ADMIN_PASSWORD`,
   `SESSION_SECRET` (генерирай с `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
4. По избор, имейл при ново записване: акаунт в resend.com → `RESEND_API_KEY`, `NOTIFY_EMAIL_TO`, `NOTIFY_EMAIL_FROM`.
5. **Settings → Domains:** добави домейна. След това смени `NEXT_PUBLIC_SITE_URL` и redeploy.
6. Добави сайта в Google Search Console и Google Business Profile и подай `https://домейн/sitemap.xml`.

## Структура

```text
app/            страници, server actions, sitemap/robots/manifest
components/     хедър, футър, форма за записване, админ контроли
lib/            config, услуги, логика за часовете, база, вход, известия
public/         лого, иконки, Open Graph изображение
```
