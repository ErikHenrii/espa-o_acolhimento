# Espaço de Acolhimento - Jaqueline Camila (Backend API)

API Node.js/Express para a plataforma de acolhimento e acompanhamento terapêutico do **Espaço de Acolhimento - Jaqueline Camila**.

---

## 📌 Visão Geral

O projeto fornece uma API RESTful segura para gestão de acompanhamento terapêutico, permitindo que pacientes registrem diariamente seu estado emocional, hábitos de sono e diários pessoais/compartilhados, além de permitir à terapeuta visualizar e acompanhar o histórico dos pacientes cadastrados.

---

## ✨ Funcionalidades

### 🔐 Autenticação & Autorização
- Registro e login de pacientes e terapeutas.
- Autenticação via JSON Web Tokens (JWT) válidos por 7 dias.
- Criptografia de senhas com `bcryptjs` (10 salt rounds).
- Controle de acesso baseado em cargos (*Role-Based Access Control* - `paciente` e `terapeuta`).

### 👤 Área do Paciente
- **Check-in diário de humor**: registro de estado emocional, emoji, nível de bem-estar (1-10) e gatilhos emocionais.
- **Registro de sono**: monitoramento de horas dormidas, qualidade do sono e observações.
- **Diário terapêutico**: criação de anotações com controle de privacidade (`private` ou `shared`) e suporte a URL de áudio.
- **Consulta de histórico**: visualização de todos os registros do próprio paciente ordenados por data.

### 🩺 Área da Terapeuta
- **Listagem de pacientes**: visualização dos pacientes cadastrados no sistema.
- **Histórico detalhado**: consulta ao histórico de check-ins de humor, registros de sono e entradas do diário **compartilhadas** pelo paciente (respeitando as entradas privadas).

---

## 🛠️ Tecnologias Utilizadas

- **Runtime**: Node.js (>= 18)
- **Framework Web**: Express.js
- **Banco de Dados**: PostgreSQL (driver `pg` com pool de conexões)
- **Autenticação**: JSON Web Token (`jsonwebtoken`)
- **Segurança & Criptografia**: `bcryptjs`, CORS
- **Gerenciamento de Ambiente**: `dotenv`
- **Ferramentas de Desenvolvimento**: `nodemon`

---

## 📁 Estrutura do Projeto

```text
espaco-acolhimento/
├── database/
│   └── schema.sql              # Script SQL de criação de tabelas e índices
├── src/
│   ├── config/
│   │   └── database.js         # Configuração da conexão com PostgreSQL
│   ├── controllers/
│   │   ├── authController.js   # Lógica de login e registro
│   │   ├── patientController.js # Lógica de check-ins, sono e diário do paciente
│   │   └── therapistController.js # Lógica de gestão e histórico para a terapeuta
│   ├── middleware/
│   │   └── authMiddleware.js   # Middleware JWT e checagem de permissões por papel
│   ├── routes/
│   │   ├── authRoutes.js       # Rotas de autenticação (/api/auth)
│   │   ├── patientRoutes.js    # Rotas do paciente (/api/patient)
│   │   └── therapistRoutes.js  # Rotas da terapeuta (/api/therapist)
│   └── server.js               # Ponto de entrada da aplicação Express
├── .env.example                # Variáveis de ambiente de exemplo
├── .gitignore                  # Arquivos ignorados pelo Git
├── package.json                # Gerenciador de dependências e scripts
├── render.yaml                 # Configuração para deploy na plataforma Render
└── README.md                   # Documentação do projeto
```

---

## 🚀 Instalação e Execução Local

### 1. Pré-requisitos
- **Node.js** v18 ou superior instalado.
- Instância do **PostgreSQL** ativa.

### 2. Passo a Passo

```bash
# Entrar no diretório do projeto
cd espaco-acolhimento

# Instalar as dependências
npm install

# Configurar as variáveis de ambiente
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais do banco de dados local e chave JWT:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://seu_usuario:sua_senha@localhost:5432/espaco_acolhimento
JWT_SECRET=sua_chave_secreta_super_segura
JWT_EXPIRES_IN=7d
AUTO_INIT_DB=false
```

### 3. Configuração do Banco de Dados

Crie o banco de dados `espaco_acolhimento` no PostgreSQL e execute o script `database/schema.sql`:

```bash
psql -U postgres -d espaco_acolhimento -f database/schema.sql
```

Para cadastrar a terapeuta inicial no banco de dados, execute a query recomendada no final de `database/schema.sql`.

### 4. Executando a Aplicação

```bash
# Modo de Desenvolvimento (com auto-reload via nodemon)
npm run dev

# Modo de Produção
npm start
```

A API estará acessível em `http://localhost:3000`.

---

## 🔌 Documentação dos Endpoints da API

### 🟢 Geral
- `GET /api/health` — Check-up de saúde da API.

---

### 🔓 Autenticação (`/api/auth`)

#### `POST /api/auth/register`
Cadastra um novo paciente.
- **Body**:
  ```json
  {
    "name": "Maria Silva",
    "email": "maria@email.com",
    "password": "senhaSegura123"
  }
  ```
- **Resposta (201)**: Dados do usuário e token JWT.

#### `POST /api/auth/login`
Autentica um paciente ou terapeuta.
- **Body**:
  ```json
  {
    "email": "maria@email.com",
    "password": "senhaSegura123"
  }
  ```
- **Resposta (200)**: Dados do usuário e token JWT.

---

### 💙 Área do Paciente (`/api/patient`)
*Requer Header `Authorization: Bearer <token>` de um usuário com papel `paciente`.*

#### `GET /api/patient/data`
Retorna todos os check-ins, registros de sono e entradas no diário do paciente logado.

#### `POST /api/patient/checkin`
Cria um novo check-in emocional.
- **Body**:
  ```json
  {
    "date": "2026-08-14",
    "mood": "Tranquilo",
    "mood_emoji": "😊",
    "wellness_score": 8,
    "triggers": ["Meditação pela manhã", "Caminhada ao ar livre"]
  }
  ```

#### `POST /api/patient/sleep`
Registra informações sobre a noite de sono.
- **Body**:
  ```json
  {
    "date": "2026-08-14",
    "sleep_hours": 7.5,
    "sleep_quality": "Boa",
    "sleep_notes": "Dormiu rápido após chá de camomila."
  }
  ```

#### `POST /api/patient/journal`
Cria um novo registro no diário.
- **Body**:
  ```json
  {
    "date": "2026-08-14",
    "content": "Hoje me senti mais disposto para realizar as atividades...",
    "privacy": "shared", // 'shared' ou 'private'
    "audio_url": "https://storage.exemplo.com/audios/123.mp3" // Opcional
  }
  ```

---

### 👩‍⚕️ Área da Terapeuta (`/api/therapist`)
*Requer Header `Authorization: Bearer <token>` de um usuário com papel `terapeuta`.*

#### `GET /api/therapist/patients`
Retorna a lista de todos os pacientes cadastrados no sistema.

#### `GET /api/therapist/patient/:id/history`
Retorna as informações do paciente informado, incluindo check-ins de humor, registros de sono e entradas no diário marcadas como **`shared`** (as entradas `private` são omitidas).

---

## ☁️ Deploy no Render.com

O projeto inclui o arquivo `render.yaml` preparado para deploy simplificado via Blueprint no Render.com.

1. Conecte seu repositório Git ao [Render.com](https://render.com).
2. Selecione a opção **New > Blueprint**.
3. O Render detectará o arquivo `render.yaml`, criando automaticamente:
   - Uma instância do banco de dados **PostgreSQL (Free Plan)**.
   - Um serviço web **Node.js Web Service** configurado com as variáveis de ambiente necessárias.
4. Após o deploy, execute o script SQL `database/schema.sql` no banco de dados provisionado pelo Render.

---

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE).
