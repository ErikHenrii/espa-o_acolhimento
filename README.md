# Espaço de Acolhimento — Jaqueline Camila

Plataforma de acompanhamento terapêutico com portal do paciente e painel da terapeuta.

## Stack
- **Backend:** Node.js + Express
- **Banco de Dados:** PostgreSQL (Render Free PostgreSQL — 90 dias grátis)
- **Frontend:** HTML + Tailwind CSS + JavaScript vanilla
- **Autenticação:** JWT + bcryptjs

## Deploy no Render Free — Passo a Passo

### 1. Subir o código para o GitHub
```bash
cd "Espaço Acolhimento 2"
git init
git add .
git commit -m "Deploy inicial — PostgreSQL + Render Free"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

### 2. Criar o serviço no Render
1. Acesse https://dashboard.render.com
2. Clique em **New +** → **Blueprint**
3. Selecione o repositório do GitHub que você acabou de pushar
4. O Render vai detectar o `render.yaml` automaticamente
5. Ele criará:
   - **Web Service** (Node.js, plano Free)
   - **PostgreSQL Database** (plano Free — 90 dias)
6. Clique em **Apply**

### 3. Configurações automáticas
O `render.yaml` já configura tudo:
- `JWT_SECRET` — gerado automaticamente
- `DATABASE_URL` — conectado automaticamente ao PostgreSQL
- `DATABASE_SSL=true` — necessário para Render
- Conta da terapeuta criada no primeiro startup via seed

### 4. Aguardar o deploy
- O build leva 1-2 minutos
- Quando aparecer "Live" no dashboard, o app está pronto
- A URL será algo como `https://espaco-acolhimento-backend.onrender.com`

### 5. Testar
- Landing page: `https://sua-url.onrender.com/`
- Login: `https://sua-url.onrender.com/acesso.html`
- Credenciais da terapeuta:
  - Email: `jaqueline@espacoacolhimento.com.br`
  - Senha: `jac123456`
  - (Será pedida a troca de senha no primeiro login)

### ⚠️ Importante sobre o Render Free
- **Sleep mode:** O serviço hiberna após 15 min sem atividade. A primeira requisição após hibernar leva ~30 segundos para responder (cold start).
- **PostgreSQL Free:** Disponível por 90 dias. Após esse período, é necessário fazer upgrade ($7/mês) ou migrar.
- **Dados persistentes:** Com PostgreSQL, os dados sobrevivem a restarts e hibernação. ✅

## Desenvolvimento Local

### Pré-requisitos
- Node.js 18+
- PostgreSQL local (ou Docker)

### Setup
```bash
npm install
```

Crie um banco PostgreSQL local e configure o `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/espaco_acolhimento
DATABASE_SSL=false
JWT_SECRET=sua-chave-secreta
```

### Rodar
```bash
npm start
```

Acesse: http://localhost:3000
