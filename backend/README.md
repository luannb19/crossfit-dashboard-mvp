# InsightFlow — Backend

## Rodando local

```bash
npm ci
npm run dev            # servidor local
npm run test:coverage  # tests + coverage (abre HTML em coverage/index.html)
```

## Auth (resumo)

POST /auth/login → { token }
GET /auth/me → requer Authorization: Bearer <token>

## GET /frequencia 🔒

Rota protegida por Authorization: Bearer <token>. Retorna série temporal com shape estável:

```
{
  "filters": {
    "from": "YYYY-MM-DD",
    "to": "YYYY-MM-DD",
    "groupBy": "day|week|month",
    "classId": "string|null",
    "alunoId": "string|null",
    "limit": 10
  },
  "data": [
    { "date": "YYYY-MM-DD", "presencas": 12 }
  ],
  "meta": { "source": "demo|db", "count": 31 }
}
```

## Query params

from (ISO date, incl.)
to (ISO date, incl.)
groupBy (day|week|month, default day)
classId (opcional)
alunoId (opcional)
limit (opcional, default 365)
Regra: from <= to.

## Demo vs DB

Mock (default): USE_FREQ_DB=0 → meta.source = "demo"
DB real: USE_FREQ_DB=1 → meta.source = "db" (usa date_trunc)
Variáveis de ambiente (backend)

```
USE_FREQ_DB=0
FREQ_TABLE=attendance
FREQ_COL_TIME=happened_at
FREQ_COL_CLASS=class_id
FREQ_COL_ALUNO=aluno_id
```

## Exemplo (cURL)

```
# 1) login
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gestor@insightflow.com","password":"123456"}' | jq -r .token)

# 2) chamada autenticada
curl -s "http://localhost:4000/frequencia?from=2025-01-01&to=2025-01-31&groupBy=day&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

## CI

Gera relatório de coverage: Actions → Artifacts → coverage-<SHA>/index.html
Testes CI-only criam tabela temporária para validar o repo e a rota com Postgres.
