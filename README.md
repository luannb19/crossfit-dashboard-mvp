# InsightFlow

Monorepo do projeto InsightFlow.

## 📦 Estrutura

insightflow/
├─ apps/
│  └─ gestor-dashboard/      # Frontend do gestor (Vite + React + Tailwind)
├─ backend/                  # API (Express + Prisma + Swagger)
├─ .gitignore
└─ README.md

---

## ✅ Pré-requisitos

- Node 20+
- Docker + Docker Compose
- (Opcional) pnpm (`npm i -g pnpm`)

---

## 🚀 Subindo o ambiente local

### 1) Banco de dados (Docker)

`docker-compose.yml` na raiz:

```yaml
version: "3.9"
services:
  db:
    image: postgres:15
    container_name: insightflow-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: insightflow
    ports:
      - "5432:5432"
    volumes:
      - dbdata:/var/lib/postgresql/data
volumes:
  dbdata:

---
```

### 2) Backend (API)

Crie `backend/.env` baseado em:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/insightflow?schema=public"
JWT_SECRET="dev_secret_change_me"
PORT=4000
NODE_ENV=development

cd backend
npm install
npx prisma migrate dev
npm run seed   # se existir script de seed
npm run dev    # http://localhost:4000
```
Health Check
curl -s http://localhost:4000/health


## Front End
VITE_API_URL=http://localhost:4000
VITE_GESTOR_TOKEN= # opcional em dev



## rode
cd apps/gestor-dashboard
npm install
npm run dev    # http://localhost:5173


## Autenticação Gestor
curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gestor@insightflow.com","password":"123456"}'

Usar o token retornado como Bearer
export TOKEN='SEU_TOKEN_AQUI'
curl -s "http://localhost:4000/analytics/assiduidade-top?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq
 


## Scripts uteis

.PHONY: dev db-up db-down seed

dev:
	@cd backend && npm run dev & \
	cd apps/gestor-dashboard && npm run dev

db-up:
	docker compose up -d

db-down:
	docker compose down -v

seed:
	cd backend && npx prisma migrate dev && npm run seed


## Convenções

Branches: main (estável), feature/*, fix/*
Commits: Conventional Commits (feat: ..., fix: ..., chore: ...)
PRs: sempre via Pull Request
Env: nunca comitar .env (use .env.example)

##🗺️ Roadmap curto

Filtros globais (DateRangePicker) no dashboard
Snapshot de KPIs (alunos ativos, ocupação média, churn)
App do Aluno (login, agenda, presenças)
Site público (landing + leads)
/auth/refresh + cookies httpOnly (backend)


