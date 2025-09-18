## Документация проекта (для новичка)

Ниже — простое объяснение, как устроен проект, где что лежит и как с этим работать.

### Что это за проект
Веб‑сервис для создания коммерческих предложений (КП):
- менеджер заполняет данные, добавляет позиции и изображения;
- генерируется публичная ссылка для клиента;
- можно скачать PDF с обложкой и картинкой перед разделом «Доп. условия»;
- просмотры публичной страницы учитываются.

## Запуск локально
1) Установите Node.js 18+ и npm.
2) Создайте файл `.env` в корне:

```bash
DATABASE_URL="file:./prisma/prisma/dev.db"
```

3) Установите зависимости:

```bash
npm ci
```

4) Примените миграции БД (создаст таблицы):

```bash
npx prisma migrate dev --name init
```

5) Запустите dev‑сервер и откройте `http://localhost:3000`:

```bash
npm run dev
```

## Структура проекта
- `src/app` — маршруты Next.js (страницы и API)
  - `src/app/page.tsx` — главная страница
  - `src/app/proposals/new/page.tsx` — страница создания КП
  - `src/app/proposals/[id]/page.tsx` — страница детали КП (админка)
  - `src/app/p/[token]/page.tsx` — публичная страница КП для клиента
  - `src/app/api/proposals/route.ts` — API: список/создание КП (GET/POST)
  - `src/app/api/proposals/[id]/pdf/route.ts` — API: генерация PDF
  - `src/app/api/upload/route.ts` — API: загрузка изображений
- `src/components`
  - `create-proposal-form.tsx` — форма создания КП
  - `image-uploader.tsx` — загрузчик изображений (drag&drop + кнопка)
  - `copy-button.tsx` — копирование ссылки
- `src/lib`
  - `proposal-service.ts` — бизнес‑логика КП (создание, получение, расчеты)
  - `prisma.ts` — инициализация Prisma Client
  - `format.ts` — форматирование дат и денег
- `prisma`
  - `schema.prisma` — схема данных (модели и поля)
  - `migrations` — миграции БД
- `public` — статические файлы и загруженные изображения
  - `uploads` — сюда сохраняются загруженные картинки
- `netlify.toml` — конфигурация деплоя на Netlify
- `next.config.ts` — конфигурация Next.js
- `package.json` — зависимости и скрипты

## Модель данных (простыми словами)
Определена в `prisma/schema.prisma`.

### Proposal (КП)
- `title` — название КП
- `proposalNumber` — уникальный номер (пример: `KP-2025-ABCD12`)
- `clientName`, `clientEmail`, `companyName` — данные клиента
- `summary` — краткое описание
- `notes` — «Доп. условия»
- `coverImageUrl` — URL обложки (картинка на всю ширину)
- `preNotesImageUrl` — URL изображения перед разделом «Доп. условия»
- `validUntil` — «действительно до»
- `shareToken` — токен для публичной ссылки
- `items` — позиции КП
- `views` — просмотры публичной страницы

### ProposalItem (позиция)
- `name`, `description`, `quantity`, `unitPriceCents`, `position`

### ProposalView (просмотр)
- `proposalId`, `viewedAt`, `userAgent`, `ipAddress`

## Как создается КП
1) На странице `/proposals/new` заполняете форму (`CreateProposalForm`).
2) Нажимаете «Сохранить» — отправляется `POST /api/proposals` с JSON.
3) В `src/app/api/proposals/route.ts` данные валидируются и передаются в `createProposal` из `src/lib/proposal-service.ts`.
4) `proposal-service.ts`:
   - генерирует номер КП и токен;
   - чистит и проверяет позиции;
   - сохраняет данные через Prisma в SQLite.
5) После успеха происходит переход на `/proposals/[id]`.

## Публичная страница
- URL: `/p/[token]` — сформированная ссылка для клиента.
- Содержит заголовок, обложку, таблицу позиций, итог, изображение перед «Доп. условия», сами «Доп. условия».
- Просмотры фиксируются функцией `recordProposalView`.

## Генерация PDF
- Скачивание: `/api/proposals/[id]/pdf`.
- Генерация в `src/app/api/proposals/[id]/pdf/route.ts` с помощью `pdfkit`:
  - вставляет обложку (если есть);
  - печатает заголовки, данные, таблицу позиций и итог;
  - добавляет изображение перед «Доп. условия» и затем текст условий.
- Рекомендация по шрифтам: использовать стандартные `Helvetica`/`Helvetica-Bold`. При ошибке «Unknown font format» удалите кастомные TTF/`fontkit` и используйте стандартные шрифты PDFKit.

## Загрузка изображений
- Компонент `ImageUploader` обеспечивает drag&drop и выбор файла.
- API `POST /api/upload` принимает файл (`multipart/form-data`), сохраняет его в `public/uploads` и возвращает JSON:

```json
{ "url": "/uploads/<filename>" }
```

- Эти URL сохраняются в полях `coverImageUrl` и `preNotesImageUrl` предложения.

## Стили в админке
Каждый раздел формы — отдельная «карточка» с единым стилем как у «Позиции» и «Итого»:

```text
rounded-lg border border-slate-200 bg-white p-4 shadow-sm
```

Это обеспечивает одинаковые обводки, тени и подложку у всех блоков.

## Настройки окружения и команды
- `.env`:
  - `DATABASE_URL="file:./prisma/prisma/dev.db"`
- Команды:
  - `npm ci` — установка зависимостей
  - `npx prisma migrate dev` — применить миграции локально
  - `npx prisma generate` — пересоздать Prisma Client
  - `npm run dev` — запуск dev‑сервера

## Git и GitHub (контроль версий)
### Первый пуш
```bash
git init
git add -A
git commit -m "chore: initial"
git branch -M main
git remote add origin git@github.com:<USER>/<REPO>.git
git push -u origin main
```

### Рабочий процесс
```bash
git checkout -b feature/<задача>
git add -A
git commit -m "feat: ..."
git push -u origin feature/<задача>
# Откройте Pull Request в GitHub и смержите в main
```

## Деплой на Netlify (через GitHub)
1) Подключите репозиторий: Add new site → Import from Git.
2) Добавьте переменную окружения в Netlify: `DATABASE_URL` как в `.env`.
3) Build/Publish:

```text
Build command: npx prisma migrate deploy && npm run build
Publish directory: .next
```

Плагин `@netlify/plugin-nextjs` уже прописан в `netlify.toml`.

## Частые задачи
- Добавить поле в КП:
  1) Правка `prisma/schema.prisma`.
  2) `npx prisma migrate dev --name add_<field>`.
  3) Прокинуть поле в форму/сервис/API/страницы.

- Хранить изображения вне проекта (S3/Cloudinary): заменить логику в `/api/upload`.

- Изменить шаблон PDF: редактировать `src/app/api/proposals/[id]/pdf/route.ts`.

## Отладка
- Поля «не видятся» после изменений в схеме:
  - проверьте `.env` (правильная БД),
  - `npx prisma generate`,
  - `npx prisma migrate dev`,
  - перезапустите `npm run dev`.

- GitHub отклоняет push из‑за больших файлов:
  - добавьте файлы >100 MB в `.gitignore`,
  - удалите их из истории (`git filter-repo`/`git filter-branch`),
  - повторите push.

---

Если нужна краткая видео‑демонстрация (2–3 минуты), дайте знать — подготовлю скринкаст.


