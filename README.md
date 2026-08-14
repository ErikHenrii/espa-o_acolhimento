# Espaço de Acolhimento - Jaqueline Camila

Plataforma de acompanhamento terapêutico com portais para Paciente e Terapeuta.

## Stack
- **Backend:** Node.js + Express
- **Banco:** SQLite (better-sqlite3) — embutido no web service, sem configuração externa
- **Auth:** JWT (7 dias de expiração) + bcryptjs
- **Frontend:** HTML + CSS (glassmorphism/neumorfismo) + JS vanilla

## Estrutura
```
espaco-acolhimento/
├── public/              → Frontend (HTML, CSS, JS)
├── src/
│   ├── config/
│   │   ├── database.js  → Conexão SQLite
│   │   └── seed.js       → Cria conta da terapeuta automaticamente
│   ├── controllers/      → Lógica de auth, paciente, terapeuta
│   ├── middleware/       → JWT validation + role check
│   ├── routes/           → /api/auth, /api/patient, /api/therapist
│   └── server.js         → Servidor Express
├── database/schema.sql   → Schema SQLite (referência)
├── .env.example
├── render.yaml           → Deploy no Render
└── package.json
```

## Rodando localmente
```bash
npm install
cp .env.example .env
npm run dev
```
Acesse: `http://localhost:3000`

## Deploy no Render
1. Suba o repositório no GitHub
2. No Render: **New → Blueprint** → selecione o repositório
3. O `render.yaml` cria o web service automaticamente
4. O banco SQLite é criado automaticamente no startup
5. A conta da terapeuta é criada automaticamente com:
   - **Email:** jaqueline@espacoacolhimento.com.br
   - **Senha:** jac123456

## Endpoints
### Auth (/api/auth)
- `POST /login` — Login (paciente ou terapeuta)
- `POST /register` — Cadastro de paciente

### Paciente (/api/patient) — requer JWT + role 'paciente'
- `GET /data` — Retorna check-ins, sono e diários
- `POST /checkin` — Registra humor/bem-estar
- `POST /sleep` — Registra sono
- `POST /journal` — Cria entrada no diário

### Terapeuta (/api/therapist) — requer JWT + role 'terapeuta'
- `GET /patients` — Lista pacientes
- `GET /patient/:id/history` — Histórico do paciente (diários compartilhados)

## Variáveis de Ambiente
| Variável | Default | Descrição |
|---|---|---|
| PORT | 3000 | Porta do servidor |
| NODE_ENV | development | Ambiente |
| JWT_SECRET | — | Chave do JWT (auto-gerada no Render) |
| JWT_EXPIRES_IN | 7d | Expiração do token |
| THERAPIST_EMAIL | jaqueline@espacoacolhimento.com.br | Email da terapeuta |
| THERAPIST_PASSWORD | jac123456 | Senha da terapeuta |
