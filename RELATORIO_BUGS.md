# Relatório de Auditoria, Bugs Corrigidos e Melhorias
## Espaço de Acolhimento — Jaqueline Camila

---

## FASE 1: Bugs Críticos Corrigidos (Code Health & Security)

### 1.1 Incompatibilidade de Nomes de Campos entre Frontend e Backend (CRÍTICO)

**Problema:** O backend retornava `sleep_records` e `journal_entries` mas o frontend esperava `sleep` e `journals`. Isso fazia com que **todas as chamadas à API fossem silenciosamente ignoradas** e o app caía no fallback de mock data.

| Campo Backend | Campo Frontend (esperado) | Status |
|---|---|---|
| `sleep_records` | `sleep` | ✅ Corrigido |
| `journal_entries` | `journals` | ✅ Corrigido |
| `wellness_score` | `score` | ✅ Alias adicionado |
| `sleep_hours` | `hours` | ✅ Alias adicionado |
| `sleep_quality` | `quality` | ✅ Alias adicionado |
| `sleep_notes` | `notes` | ✅ Alias adicionado |
| `privacy='shared'` | `is_shared=true` | ✅ Alias adicionado |

**Arquivos corrigidos:** `patientController.js`, `therapistController.js`

### 1.2 POST Requests com Nomes de Campos Errados (CRÍTICO)

**Problema:** O frontend enviava `{ mood, score, triggers, notes, created_at }` para o endpoint de check-in, mas o backend esperava `{ date, mood, wellness_score, triggers }`. Como `date` estava ausente e `wellness_score` era `undefined`, **todos os POSTs retornavam 400** (Dados incompletos). O mesmo acontecia com sono e diário.

**Correção:**
- Backend agora aceita **ambos** os formatos (alias + nomes originais)
- Frontend agora envia os campos no formato que o backend espera
- O campo `date` é gerado automaticamente no frontend como `YYYY-MM-DD`

**Arquivos corrigidos:** `paciente.js` (todos os POSTs), `patientController.js`

### 1.3 Resposta da API de Terapeuta Desembrulhada Incorretamente (CRÍTICO)

**Problema:** `fetchPatients()` fazia `patientsList = await res.json()`, esperando um array. Mas o backend retornava `{ patients: [...] }`. Resultado: `patientsList` era um objeto, não um array. A chamada `patientsList.filter(...)` em `renderPatientList()` causava um **TypeError** e quebrava a página inteira.

**Correção:** Frontend agora lê `data.patients` corretamente. Backend também computa `avg_score`, `last_activity` e `status` por paciente (dados que antes só existiam no mock).

**Arquivos corrigidos:** `terapeuta.js`, `therapistController.js`

### 1.4 Resposta do Histórico do Paciente com Estrutura Incompatível (CRÍTICO)

**Problema:** `selectPatient()` esperava `{ overview, checkins, sleep, journals }` mas o backend retornava `{ patient, checkins, sleep_records, journal_entries }`. O `overview` ficava `undefined`, causando erros em `renderPatientOverview()`.

**Correção:** Backend agora retorna `overview` (com `avg_score` e `status`), e usa os nomes de campos que o frontend espera.

### 1.5 Coluna `notes` Ausente na Tabela `checkins` (BUG)

**Problema:** O schema da tabela `checkins` não tinha coluna `notes`, mas o frontend enviava e esperava esse campo. O INSERT falhava ou o campo era ignorado.

**Correção:** Coluna `notes TEXT DEFAULT ''` adicionada ao schema e à migration automática (`safeAddColumn`).

### 1.6 XSS — Injeção de HTML via innerHTML (SEGURANÇA)

**Problema:** Conteúdo de diários, notas de check-in e gatilhos eram inseridos via `innerHTML` sem sanitização. Um paciente malicioso podia injetar `<script>` ou `<img onerror=...>` nos campos de texto, executando código no painel da terapeuta.

**Correção:** Função `escapeHtml()` aplicada em **todos** os pontos onde dados dinâmicos são inseridos no DOM via `innerHTML` em `paciente.js` e `terapeuta.js`.

### 1.7 JWT Secret com Fallback Inseguro (SEGURANÇA)

**Problema:** Quando `JWT_SECRET` não estava definido, o código usava `'default_jwt_secret_change_me'` como fallback. Em produção, isso permitiria forjar tokens JWT.

**Correção:** Removido o fallback. Se `JWT_SECRET` não estiver configurado, o servidor retorna erro 500 em login/registro e não assina tokens. O `render.yaml` gera o secret automaticamente via `generateValue: true`.

**Arquivos corrigidos:** `authController.js`, `authMiddleware.js`

### 1.8 CORS Sem Restrição (SEGURANÇA)

**Problema:** `app.use(cors())` aceitava requisições de qualquer origem, sem configuração.

**Correção:** CORS agora é configurável via variável de ambiente `CORS_ORIGINS` (separada por vírgulas). Se vazio, permite todas (necessário para Render Free, onde a URL muda a cada deploy).

### 1.9 Sem Rate Limiting em Endpoints de Auth (SEGURANÇA)

**Problema:** Os endpoints `/api/auth/login` e `/api/auth/register` não tinham limitação de tentativas, permitindo brute force.

**Correção:** Rate limiter in-memory adicionado: máx. 20 tentativas por IP a cada 15 minutos. Retorna HTTP 429 quando excedido.

### 1.10 Sem Validação de Tamanho de Body (SEGURANÇA)

**Problema:** `express.json()` sem limite de tamanho. Ataques com payloads grandes podiam esgotar a memória.

**Correção:** Limite de 256kb adicionado em `express.json()` e `express.urlencoded()`.

### 1.11 Sem Sanitização de Input no Backend (SEGURANÇA)

**Problema:** Os controllers não limpavam HTML tags dos inputs de texto (nome, email, notas, conteúdo de diário).

**Correção:** Função `sanitizeString()` aplicada em todos os controllers. Validação de email, senha (mín 6, máx 128 chars), e limite de 10.000 caracteres no conteúdo do diário.

### 1.12 Tratamento de Erros Global (CODE HEALTH)

**Problema:** Não havia error handler global no Express. Erros não capturados podiam expor stack traces.

**Correção:** Middleware de erro global adicionado ao final de `server.js`.

### 1.13 Token Expirado Não Tratado no Frontend (UX)

**Problema:** Quando o token JWT expirava (após 7 dias), as chamadas à API retornavam 401, mas o frontend ignorava e caía no mock data sem avisar o usuário.

**Correção:** Todos os `fetch` no `paciente.js` e `terapeuta.js` agora verificam `res.status === 401` e redirecionam para a tela de login com um toast de aviso.

---

## FASE 2: Troca de E-mail e Senha (Primeiro Acesso e Perfil)

### 2.1 Nova Coluna `must_change_credentials`

- Adicionada ao schema: `must_change_credentials INTEGER NOT NULL DEFAULT 0`
- Migration automática via `safeAddColumn()` para bancos existentes
- A conta da terapeuta criada no seed inicializa com `must_change_credentials = 1`

### 2.2 Novo Endpoint `PUT /api/auth/update-credentials`

- **Protegido por JWT** (requer autenticação)
- **Valida senha atual** antes de permitir a alteração
- **Aceita troca de e-mail e/ou senha** (pelo menos um dos dois)
- **Verifica duplicidade de e-mail** (não pode usar e-mail de outra conta)
- **Hash bcrypt** na nova senha
- **Gera novo token JWT** após a alteração (necessário se o e-mail mudar)
- **Limpa a flag `must_change_credentials`** após a atualização

### 2.3 Login Responde com Flag de Primeiro Acesso

- A resposta do `/login` agora inclui `must_change_credentials: true/false`
- O frontend (`auth.js`) verifica essa flag após o login
- Se `true`, o usuário é redirecionado para o portal, e o **modal de troca de credenciais aparece automaticamente**
- O modal **não pode ser fechado** enquanto a troca não for realizada (modo forçado)

### 2.4 Modal de Troca de Credenciais (Frontend)

- HTML do modal adicionado em `acesso.html`, `paciente.html` e `terapeuta.html`
- CSS do modal adicionado a `styles.css`
- Botão de engrenagem (⚙) adicionado nos headers de paciente e terapeuta para acesso manual ao modal
- Lógica de submit em `auth.js` (funciona em qualquer página que tenha o modal)
- Modal mostra aviso amarelo quando em modo forçado (primeiro login)
- Campos: senha atual (obrigatório), novo e-mail (opcional), nova senha (opcional), confirmar senha

### 2.5 Seed Seguro para Render Free

- `seed.js` verifica se a conta já existe **antes de criar**
- Se a conta existe, **NÃO sobrescreve** — a senha/e-mail alterados pela terapeuta são preservados
- Se o disco foi resetado (Render Free hiberna), a conta é recriada com credenciais padrão e `must_change_credentials = 1`
- A terapeuta será forçada a trocar a senha novamente, mas os dados de pacientes anteriores serão perdidos (limitação do Render Free)

---

## FASE 3: Preparação para Render Free e Beta Testing

### 3.1 Persistência de Dados — Documentação e Estratégia

**Limitação documentada:** O Render Free reseta o disco a cada hibernação (~15 min de inatividade). O SQLite é apagado.

**Estratégia para Beta:**
- O `seed.js` é idempotente e seguro — não sobrescreve contas existentes
- A perda de dados é aceitável durante o beta testing
- Documentado no README com sugestões de migração para Turso (SQLite compatível) ou Neon (PostgreSQL) quando precisar de persistência real

### 3.2 CORS Configurado

- Variável `CORS_ORIGINS` adicionada ao `render.yaml` e `.env.example`
- Se vazio, permite todas as origens (necessário para Render Free)
- Se preenchido, restringe às origens listadas

### 3.3 render.yaml Sincronizado

- `healthCheckPath: /api/health` adicionado (o Render monitora se o serviço está saudável)
- `JWT_EXPIRES_IN: 7d` explicitado
- `THERAPIST_NAME: Jaqueline Camila` adicionado
- `CORS_ORIGINS` adicionado (vazio = allow all)
- `JWT_SECRET` com `generateValue: true` (gera um secret seguro automaticamente)

### 3.4 .env.example Sincronizado

- Todas as variáveis do `render.yaml` estão documentadas
- Comentários explicativos adicionados

---

## Resumo de Arquivos Modificados/Criados

### Backend (modificados)
| Arquivo | O que mudou |
|---|---|
| `src/server.js` | CORS configurável, rate limiter, body size limit, error handler global |
| `src/config/database.js` | Coluna `must_change_credentials`, coluna `notes` em checkins, migration automática |
| `src/config/seed.js` | `must_change_credentials = 1` no seed, documentação de segurança |
| `src/controllers/authController.js` | Sanitização, validação, novo endpoint `updateCredentials`, flag no login, sem fallback de JWT secret |
| `src/controllers/patientController.js` | Sanitização, aliases de campos, coluna `notes`, validação dupla de nomes |
| `src/controllers/therapistController.js` | Resposta com `overview`/`checkins`/`sleep`/`journals`, cálculo de `avg_score` e `status` |
| `src/middleware/authMiddleware.js` | Sem fallback de JWT secret, erro 500 se não configurado |
| `src/routes/authRoutes.js` | Nova rota `PUT /update-credentials` |

### Frontend (modificados)
| Arquivo | O que mudou |
|---|---|
| `public/js/auth.js` | Lógica do modal de credenciais, verificação de `must_change_credentials`, redirecionamento pós-login |
| `public/js/paciente.js` | Mapeamento de API, POSTs com campos corretos, `escapeHtml()`, tratamento de 401 |
| `public/js/terapeuta.js` | Desembrulhar `.patients`, mapear `overview`/`sleep`/`journals`, `escapeHtml()`, tratamento de 401 |
| `public/css/styles.css` | CSS do modal de credenciais |
| `public/acesso.html` | Modal de credenciais |
| `public/paciente.html` | Modal de credenciais, botão de engrenagem |
| `public/terapeuta.html` | Modal de credenciais, botão de engrenagem |

### Config (modificados)
| Arquivo | O que mudou |
|---|---|
| `render.yaml` | `healthCheckPath`, `JWT_EXPIRES_IN`, `THERAPIST_NAME`, `CORS_ORIGINS` |
| `.env.example` | `THERAPIST_NAME`, `CORS_ORIGINS` |
| `database/schema.sql` | `must_change_credentials`, `notes` em checkins |
| `README.md` | Guia de deploy atualizado, documentação de variáveis, checklist |

### Novo
| Arquivo | Descrição |
|---|---|
| `RELATORIO_BUGS.md` | Este relatório |
