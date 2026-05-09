# RAG Base

Локальная база знаний с ролями, редактором статей, поиском, SQLite backend API на FastAPI и подготовленным `/ask` endpoint.

## Быстрый старт

```bash
npm --prefix frontend install
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
npm run seed
npm run dev
```

По умолчанию:

- frontend: `http://127.0.0.1:5173`
- backend FastAPI: `http://127.0.0.1:4000`
- SQLite: `backend/data/rag-base.sqlite`

Если `5173` занят, Vite выберет следующий свободный порт.
Команды `npm run dev`, `npm run build` и `npm run seed` автоматически используют `.venv/bin/python`, если виртуальное окружение создано. Если нужен другой интерпретатор, задайте `PYTHON=/path/to/python`.
Корневой `.env` подхватывается локальными скриптами автоматически.

## Команды

```bash
npm run dev
npm run build
npm run seed
npm run backend:dev
```

- `dev` запускает frontend и backend вместе.
- `backend:dev` запускает только FastAPI backend.
- `build` собирает frontend и проверяет Python backend через `compileall`.
- `seed` пересоздаёт демо-роли, пользователей и статьи в SQLite.

## Демо-вход

- `reader@ragbase.local`
- `editor@ragbase.local`
- `admin@ragbase.local`

Backend проверяет пароль по PBKDF2-хэшу. Пароль демо-пользователей: `demo-password`.
После входа backend выдаёт session token, frontend хранит его локально и отправляет в `Authorization: Bearer <token>`.

## Переменные окружения

Скопируйте `.env.example` в `.env` при необходимости.

- `PORT` задаёт порт backend.
- `HOST` задаёт host для локального FastAPI-сервера.
- `CORS_ORIGIN` ограничивает frontend-origin для backend.
- `DB_PATH` задаёт путь к SQLite-файлу.
- `VITE_API_URL` задаёт backend URL для frontend.

## Troubleshooting

- Если backend не отвечает, frontend откроет localStorage fallback и покажет предупреждение в базе знаний.
- Если нужно вернуть исходные данные backend, выполните `npm run seed`.
- Если порт frontend занят, используйте URL, который напечатает Vite в терминале.
- Для чистой SQLite-базы удалите `backend/data/rag-base.sqlite` и снова выполните `npm run seed`.
