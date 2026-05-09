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
npm run db:upgrade
```

- `dev` запускает frontend и backend вместе.
- `backend:dev` запускает только FastAPI backend.
- `build` собирает frontend и проверяет Python backend через `compileall`.
- `seed` пересоздаёт демо-роли, пользователей и статьи в SQLite.
- `db:upgrade` применяет Alembic-миграции к `DATABASE_URL`.

## Демо-вход

- `reader@ragbase.local`
- `editor@ragbase.local`
- `admin@ragbase.local`

Backend проверяет пароль по PBKDF2-хэшу. Пароль демо-пользователей: `demo-password`.
После входа backend выдаёт session token, frontend хранит его локально и отправляет в `Authorization: Bearer <token>`.

## Документы и ingestion

Backend поддерживает стартовый контур загрузки документов для будущего RAG:

- `POST /documents` принимает multipart-файл, сохраняет оригинал в `UPLOAD_DIR` и создаёт ingestion job.
- `GET /documents` возвращает загруженные документы.
- `GET /documents/{document_id}/ingestion-jobs` показывает jobs по документу.

Загрузка доступна ролям `editor` и `admin`. Текущий ingestion job пока выполняет подготовительную заглушку и переводит документ в статус `indexed`.

## Переменные окружения

Скопируйте `.env.example` в `.env` при необходимости.

- `PORT` задаёт порт backend.
- `HOST` задаёт host для локального FastAPI-сервера.
- `CORS_ORIGIN` ограничивает frontend-origin для backend.
- `DB_PATH` задаёт путь к SQLite-файлу.
- `DATABASE_URL` задаёт SQLAlchemy/Alembic подключение; для PostgreSQL используйте `postgresql+psycopg://...`.
- `UPLOAD_DIR` задаёт папку для оригиналов загруженных документов.
- `VITE_API_URL` задаёт backend URL для frontend.

## Troubleshooting

- Если backend не отвечает, frontend откроет localStorage fallback и покажет предупреждение в базе знаний.
- Если нужно вернуть исходные данные backend, выполните `npm run seed`.
- Если порт frontend занят, используйте URL, который напечатает Vite в терминале.
- Для чистой SQLite-базы удалите `backend/data/rag-base.sqlite` и снова выполните `npm run seed`.
