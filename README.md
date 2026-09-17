# O Conselho Blaze

Plataforma privada de avaliações de jogos para membros do Conselho.

## Stack

- **Frontend:** React + Vite + CSS Modules
- **Backend / Auth / DB:** Supabase (PostgreSQL + Auth + Realtime)
- **Hospedagem:** Netlify

---

## Configuração Completa

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta.
2. Clique em **New Project**.
3. Escolha um nome (ex: `conselho-blaze`), uma senha forte e a região mais próxima.
4. Aguarde o projeto ser criado.

### 2. Executar o SQL

1. No painel do Supabase, vá em **SQL Editor**.
2. Clique em **New Query**.
3. Cole o conteúdo completo de `supabase_schema.sql`.
4. Clique em **Run**.

O script cria:
- Tabelas: `profiles`, `reviews`, `comments`, `reactions`
- Índices de performance
- Políticas RLS (Row Level Security)
- Trigger automático de criação de perfil
- Publicação Realtime nas tabelas

### 3. Configurar Auth no Supabase

1. Vá em **Authentication → Settings**.
2. Em **Site URL**, coloque sua URL do Netlify (ex: `https://conselho-blaze.netlify.app`).
3. Em **Redirect URLs**, adicione a mesma URL.
4. Opcionalmente, desative a confirmação de e-mail em **Auth → Providers → Email** para facilitar testes.

### 4. Obter as chaves do Supabase

1. Vá em **Settings → API**.
2. Copie:
   - `Project URL` → será `VITE_SUPABASE_URL`
   - `anon public` → será `VITE_SUPABASE_ANON_KEY`

### 5. Rodar localmente

```bash
# Instalar dependências
npm install

# Criar arquivo .env
cp .env.example .env

# Editar .env com suas chaves reais
# VITE_SUPABASE_URL=https://xxxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Iniciar servidor de desenvolvimento
npm run dev
```

### 6. Deploy no Netlify

#### Opção A: via Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify env:set VITE_SUPABASE_URL "https://xxxxx.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIs..."
netlify deploy --build --prod
```

#### Opção B: via GitHub + Netlify (recomendado)

1. Faça push do projeto para um repositório GitHub.
2. Acesse [netlify.com](https://netlify.com) → **Add new site → Import from Git**.
3. Selecione o repositório.
4. Configurações de build:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Vá em **Site settings → Environment variables** e adicione:
   - `VITE_SUPABASE_URL` = sua URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` = sua anon key
6. Clique em **Deploy site**.

---

## Funcionalidades

- Autenticação com e-mail/senha
- Criação de perfil automático no cadastro
- Avaliações com nota (0-10), gênero, tipo, e comentário
- Filtros por gênero e tipo de jogo
- Busca por nome do jogo
- Comentários em avaliações
- Reações (Curtir, Incrível, Concordo, Discordo)
- Editar e excluir apenas suas próprias avaliações e comentários
- Perfil de usuário com histórico de avaliações
- **Tempo real:** novas avaliações, comentários e reações aparecem automaticamente para todos os usuários conectados
- Design responsivo para PC e celular

## Estrutura do Projeto

```
src/
├── components/
│   ├── Icons.jsx          # Ícones SVG
│   ├── Layout.jsx         # Header + outlet
│   ├── LoadingScreen.jsx
│   ├── ReviewCard.jsx     # Card de avaliação
│   └── ReviewModal.jsx    # Modal criar/editar avaliação
├── lib/
│   ├── AuthContext.jsx    # Contexto de autenticação
│   └── supabase.js        # Cliente Supabase
├── pages/
│   ├── AuthPage.jsx       # Login / Cadastro
│   ├── HomePage.jsx       # Feed principal com filtros
│   ├── ProfilePage.jsx    # Perfil do usuário
│   └── ReviewPage.jsx     # Avaliação completa + comentários
├── styles/
│   └── global.css
├── App.jsx
└── main.jsx
```
