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
│   │   ├── database.js  → Conexão SQLite + migrations automáticas
│   │   └── seed.js       → Cria conta da terapeuta automaticamente (segura)
│   ├── controllers/      → Lógica de auth, paciente, terapeuta
│   ├── middleware/       → JWT validation + role check
│   ├── routes/           → /api/auth, /api/patient, /api/therapist
│   └── server.js         → Servidor Express (CORS, rate limit, error handler)
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

## Funcionalidades

### Autenticação
- `POST /api/auth/register` — Cadastro de paciente
- `POST /api/auth/login` — Login (paciente ou terapeuta)
- `PUT /api/auth/update-credentials` — Troca de e-mail e/ou senha (protegido por JWT)

### Primeiro Acesso (Terapeuta)
- A conta da terapeuta é criada automaticamente no primeiro startup via `seed.js`
- No primeiro login, a flag `must_change_credentials = true` força a troca de credenciais
- O modal de troca aparece automaticamente e não pode ser fechado sem atualizar
- Após a troca, a flag é removida e um novo token JWT é gerado

### Paciente (/api/patient) — requer JWT + role 'paciente'
- `GET /data` — Retorna check-ins, sono e diários
- `POST /checkin` — Registra humor/bem-estar
- `POST /sleep` — Registra sono
- `POST /journal` — Cria entrada no diário

### Terapeuta (/api/therapist) — requer JWT + role 'terapeuta'
- `GET /patients` — Lista pacientes (com média de humor e status)
- `GET /patient/:id/history` — Histórico do paciente (diários compartilhados)

## Variáveis de Ambiente
| Variável | Default | Descrição |
|---|---|---|
| PORT | 3000 | Porta do servidor |
| NODE_ENV | development | Ambiente |
| JWT_SECRET | — | Chave do JWT (auto-gerada no Render) |
| JWT_EXPIRES_IN | 7d | Expiração do token |
| THERAPIST_EMAIL | jaqueline@espacoacolhimento.com.br | Email da terapeuta (seed) |
| THERAPIST_PASSWORD | jac123456 | Senha inicial da terapeuta (seed) |
| THERAPIST_NAME | Jaqueline Camila | Nome da terapeuta (seed) |
| CORS_ORIGINS | (vazio = allow all) | Origens permitidas, separadas por vírgula |

## Deploy no Render (Free)

### Guia Passo a Passo

1. **Suba o código no GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Espaço de Acolhimento - versão Beta"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
   git push -u origin main
   ```

2. **No Render:**
   - Acesse [dashboard.render.com](https://dashboard.render.com)
   - Clique em **New → Blueprint**
   - Conecte seu repositório do GitHub
   - O `render.yaml` será detectado automaticamente
   - Clique em **Apply** — o serviço será criado

3. **Configurações automáticas (via render.yaml):**
   - Node.js 18, plano Free
   - `JWT_SECRET` gerado automaticamente
   - Health check em `/api/health`
   - Build: `npm install`
   - Start: `npm start`

4. **Após o deploy:**
   - Acesse a URL pública gerada (ex: `https://espaco-acolhimento-backend.onrender.com`)
   - A conta da terapeuta será criada automaticamente
   - Faça login com `jaqueline@espacoacolhimento.com.br` / `jac123456`
   - **Você será forçada a alterar e-mail e senha no primeiro acesso**

5. **Atenção — Render Free e Persistência:**
   - O plano Free do Render **reseta o disco a cada hibernação/restart**
   - Isso significa que o banco SQLite é apagado quando o serviço hiberna
   - A conta da terapeuta será recriada com as credenciais padrão a cada restart
   - Dados de teste dos pacientes também serão perdidos
   - **Solução para Beta Testing:** aceite a perda de dados como parte do teste
   - **Solução para Produção:** migre para um banco externo gratuito como:
     - [Turso](https://turso.tech) (libSQL/SQLite — free tier generoso)
     - [Neon](https://neon.tech) (PostgreSQL — free tier)
     - Ou faça upgrade para o Render Starter ($7/mês) com disco persistente

### Checklist Final antes do Push
- [ ] `.env` NÃO está no repositório (verifique `.gitignore`)
- [ ] `data/` e `*.db` NÃO estão no repositório (verifique `.gitignore`)
- [ ] `render.yaml` está na raiz do projeto
- [ ] `package.json` tem `"start": "node src/server.js"`
- [ ] `JWT_SECRET` está como `generateValue: true` no `render.yaml`
- [ ] Nenhum segredo hardcoded no código
