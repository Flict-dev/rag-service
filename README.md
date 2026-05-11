# RAG Base

Локальная база знаний с ролями, markdown-базами, загрузкой документов и RAG-чатом. Backend: FastAPI + PostgreSQL + Qdrant + Ollama.

## Запуск приложения

### Требования

- Node.js и npm для frontend-части.
- Python 3 с модулем `venv` для backend-части.
- Docker и Docker Compose для локальных PostgreSQL, Qdrant и Ollama.


### Первый запуск

Установите зависимости, поднимите локальную инфраструктуру, примените миграции и заполните демо-данные:

```bash
npm --prefix frontend install
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
test -f .env || cp .env.example .env
npm run infra:up
npm run infra:models
npm run db:upgrade
npm run seed
```

Файл `.env` можно не создавать, если подходят значения по умолчанию из `.env.example`, но для локальной разработки удобнее иметь явный экземпляр.

### Обычный запуск

После первичной подготовки запускайте frontend и backend одной командой:

```bash
npm run dev
```

По умолчанию:

- frontend: `http://127.0.0.1:5173`
- backend FastAPI: `http://127.0.0.1:4000`
- backend Swagger UI: `http://127.0.0.1:4000/docs`
- PostgreSQL: `127.0.0.1:5432`, database `rag_service`
- Qdrant: `http://127.0.0.1:6333`
- Ollama: `http://127.0.0.1:11434`

Если `5173` занят, Vite выберет следующий свободный порт и покажет его в терминале.
Если `npm run dev` падает из-за занятого backend-порта `4000`, значит FastAPI уже запущен. В этом случае можно поднять только frontend:

```bash
npm --prefix frontend run dev -- --host 127.0.0.1
```

Если нужен только backend:

```bash
npm run backend:dev
```

Команды `npm run dev`, `npm run build` и `npm run seed` автоматически используют `.venv/bin/python`, если виртуальное окружение создано. Если нужен другой интерпретатор, задайте `PYTHON=/path/to/python`.
Корневой `.env` подхватывается локальными скриптами автоматически.

## Команды

```bash
npm run dev
npm run build
npm run seed
npm run infra:up
npm run infra:models
npm run infra:down
npm run backend:dev
npm run db:upgrade
npm run test:backend
```

- `dev` запускает frontend и backend вместе.
- `infra:up` поднимает PostgreSQL, Qdrant и Ollama в Docker Compose.
- `infra:models` скачивает локальные модели `qwen3:4b` и `embeddinggemma` в контейнер Ollama.
- `infra:down` останавливает локальную инфраструктуру.
- `backend:dev` запускает только FastAPI backend.
- `build` собирает frontend и проверяет Python backend через `compileall`.
- `seed` пересоздаёт демо-роли, пользователей и статьи.
- `db:upgrade` применяет Alembic-миграции к `DATABASE_URL`.
- `test:backend` запускает backend API smoke-тесты. Тесты используют локальную SQLite-схему через SQLAlchemy, чтобы не требовать Docker.

## Демо-вход

- `reader@ragbase.local`
- `editor@ragbase.local`
- `admin@ragbase.local`

Backend проверяет пароль по PBKDF2-хэшу. Пароль демо-пользователей: `demo-password`.
После входа backend выдаёт session token, frontend хранит его локально и отправляет в `Authorization: Bearer <token>`.

## Базы знаний, документы и RAG

Backend поддерживает реальные API для текущего frontend:

- `GET/POST /knowledge-bases` управляет базами знаний.
- `POST /knowledge-bases/{base_id}/sections` создаёт раздел.
- `POST /knowledge-bases/{base_id}/pages` создаёт markdown-страницу.
- `PATCH /knowledge-bases/{base_id}/pages/{page_id}` сохраняет markdown и переиндексирует страницу.
- `POST /knowledge-bases/{base_id}/documents` принимает multipart-файл, сохраняет оригинал в `UPLOAD_DIR` и индексирует текстовые chunks.
- `POST /knowledge-bases/{base_id}/ask` ищет chunks только внутри выбранной базы, сохраняет chat trace и отвечает через локальную модель.

Загрузка и редактирование доступны ролям `editor` и `admin`. Новый signup создаёт локального `editor`, чтобы пользователь мог сразу работать с MVP. Старые `/documents` и `/ask` оставлены для совместимости smoke-тестов.

После `npm run seed` создаётся тестовая база знаний `RAG Demo Support`. Для проверки RAG можно войти как
`editor@ragbase.local`, открыть эту базу и спросить: `Что делать при ошибке RAG-77?` или `синий маркер Вега`.
Также seed создаёт базу `Книга рецептов пасты` с 20 рецептами; для проверки можно спросить:
`янтарный перец Карбонара-01` или `как приготовить спагетти карбонара`.

## Переменные окружения

Скопируйте `.env.example` в `.env` при необходимости.

- `PORT` задаёт порт backend.
- `HOST` задаёт host для локального FastAPI-сервера.
- `CORS_ORIGIN` ограничивает frontend-origin для backend.
- `DATABASE_URL` задаёт SQLAlchemy/Alembic подключение к PostgreSQL.
- `UPLOAD_DIR` задаёт папку для оригиналов загруженных документов.
- `VITE_API_URL` задаёт backend URL для frontend.
- `QDRANT_URL` и `QDRANT_COLLECTION` задают vector store.
- `OLLAMA_BASE_URL`, `OLLAMA_CHAT_MODEL`, `OLLAMA_EMBED_MODEL` задают локальные LLM/embedding модели.

## Troubleshooting

- Если backend не видит таблицы, выполните `npm run db:upgrade`, затем `npm run seed`.
- Если RAG отвечает fallback-текстом, проверьте `npm run infra:up` и `npm run infra:models`.
- Если порт frontend занят, используйте URL, который напечатает Vite в терминале.
- Для чистой локальной инфраструктуры выполните `npm run infra:down`, при необходимости удалите Docker volumes и снова запустите quick start.
