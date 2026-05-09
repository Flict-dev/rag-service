# RAG Base

Локальная база знаний с ролями, редактором статей, поиском, SQLite backend API и подготовленным `/ask` endpoint.

## Быстрый старт

```bash
npm --prefix frontend install
npm --prefix backend install
npm run seed
npm run dev
```

По умолчанию:

- frontend: `http://127.0.0.1:5173`
- backend: `http://127.0.0.1:4000`
- SQLite: `backend/data/rag-base.sqlite`

Если `5173` занят, Vite выберет следующий свободный порт.

## Команды

```bash
npm run dev
npm run build
npm run seed
```

- `dev` запускает frontend и backend вместе.
- `build` собирает frontend и проверяет backend-файлы через `node --check`.
- `seed` пересоздаёт демо-роли, пользователей и статьи в SQLite.

## Демо-вход

- `reader@ragbase.local`
- `editor@ragbase.local`
- `admin@ragbase.local`

Пароль в демо-форме не проверяется; backend выбирает демо-пользователя по email или роли.

## Переменные окружения

Скопируйте `.env.example` в `.env` при необходимости.

- `PORT` задаёт порт backend.
- `CORS_ORIGIN` ограничивает frontend-origin для backend.
- `VITE_API_URL` задаёт backend URL для frontend.

## Troubleshooting

- Если backend не отвечает, frontend откроет localStorage fallback и покажет предупреждение в базе знаний.
- Если нужно вернуть исходные данные backend, выполните `npm run seed`.
- Если порт frontend занят, используйте URL, который напечатает Vite в терминале.
- Для чистой SQLite-базы удалите `backend/data/rag-base.sqlite` и снова выполните `npm run seed`.
