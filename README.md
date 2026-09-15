# MedClinic API — Etapa 1: Autenticação e Autorização

API para o gerenciamento de uma clínica médica de pequeno porte. Esta é a
**primeira etapa** do projeto MedClinic API, responsável exclusivamente pela
**base de acesso do sistema**: cadastro de usuários, autenticação (login com
JWT) e autorização baseada em perfis (RBAC).

As funcionalidades de domínio da clínica (especialidades, médicos, pacientes
e consultas) **não fazem parte desta entrega** e serão implementadas em uma
etapa futura, sobre esta mesma base de código.

## Sumário

- [Tecnologias utilizadas](#tecnologias-utilizadas)
- [Arquitetura do projeto](#arquitetura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Configuração do banco de dados](#configuração-do-banco-de-dados)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Instalação e execução](#instalação-e-execução)
- [Perfis de acesso (RBAC)](#perfis-de-acesso-rbac)
- [Documentação dos endpoints](#documentação-dos-endpoints)
- [Próximos passos](#próximos-passos)

## Tecnologias utilizadas

- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Express.js](https://expressjs.com/)
- [TypeORM](https://typeorm.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [JWT (jsonwebtoken)](https://github.com/auth0/node-jsonwebtoken)
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) — hash de senha
- [dotenv](https://github.com/motdotla/dotenv)

## Arquitetura do projeto

O projeto segue uma arquitetura MVC organizada em camadas, já preparada para
receber os módulos de domínio da clínica em uma etapa futura:

```
src/
├── controllers/     # Recebem requisições HTTP e retornam respostas
│   ├── AuthController.ts
│   ├── UserController.ts
│   └── AdminController.ts
├── services/        # Regras de negócio (validações, orquestração)
│   ├── AuthService.ts
│   └── UserService.ts
├── repositories/     # Comunicação exclusiva com o PostgreSQL via TypeORM
│   └── UserRepository.ts
├── entities/         # Entidades TypeORM
│   └── User.ts
├── dtos/             # Data Transfer Objects (entrada/saída tipada)
│   ├── CreateUserDTO.ts
│   └── LoginDTO.ts
├── middlewares/      # Autenticação, autorização (RBAC) e erros
│   ├── authMiddleware.ts
│   ├── rbacMiddleware.ts
│   └── errorHandler.ts
├── routes/           # Definição dos endpoints
│   ├── auth.routes.ts
│   ├── user.routes.ts
│   ├── admin.routes.ts
│   └── index.ts
├── database/
│   ├── data-source.ts      # Configuração do TypeORM (DataSource)
│   └── migrations/         # Migrations de criação das tabelas
├── utils/            # Hash de senha, JWT, tratamento de erros, async handler
├── types/            # Tipagens customizadas (Express Request)
├── app.ts            # Configuração do Express (middlewares e rotas)
└── server.ts         # Ponto de entrada: conecta ao banco e sobe o servidor
```

**Fluxo de uma requisição:**

```
Rota → Middleware (auth/RBAC) → Controller → Service → Repository → PostgreSQL
```

> Os módulos de domínio da clínica (especialidades, médicos, pacientes,
> consultas) serão adicionados como novas pastas dentro de `controllers/`,
> `services/`, `repositories/`, `entities/` e `routes/`, reaproveitando toda a
> estrutura de autenticação e autorização já construída.

## Pré-requisitos

- Node.js 18 ou superior
- npm
- PostgreSQL 13 ou superior (local ou em container)
- Um cliente HTTP para testes (Postman, Insomnia ou Thunder Client)

## Configuração do banco de dados

1. Crie o banco de dados no PostgreSQL:

   ```sql
   CREATE DATABASE medclinic;
   ```

2. Crie a estrutura de tabelas utilizando **uma das duas opções abaixo**:

   **Opção A — Script SQL** (`sql/create_tables.sql`):

   ```bash
   psql -U <seu_usuario> -d medclinic -f sql/create_tables.sql
   ```

   **Opção B — Migrations do TypeORM:**

   ```bash
   npm run typeorm migration:run
   ```

## Variáveis de ambiente

Copie o arquivo de exemplo e ajuste os valores conforme seu ambiente:

```bash
cp .env.example .env
```

| Variável        | Descrição                                  | Exemplo                 |
| --------------- | ------------------------------------------- | ------------------------ |
| `PORT`          | Porta em que a API será executada           | `3000`                   |
| `DB_HOST`       | Host do PostgreSQL                          | `localhost`               |
| `DB_PORT`       | Porta do PostgreSQL                         | `5432`                   |
| `DB_USERNAME`   | Usuário do banco de dados                   | `postgres`                |
| `DB_PASSWORD`   | Senha do banco de dados                     | `postgres`                |
| `DB_DATABASE`   | Nome do banco de dados                      | `medclinic`               |
| `JWT_SECRET`    | Chave secreta usada para assinar o token    | `uma-chave-bem-forte`    |
| `JWT_EXPIRES_IN`| Tempo de expiração do token JWT             | `1h`                      |

## Instalação e execução

```bash
# 1. Instalar as dependências
npm install

# 2. Configurar o arquivo .env (ver seção acima)
cp .env.example .env

# 3. Criar as tabelas no banco (script SQL ou migrations, ver acima)

# 4. Executar em ambiente de desenvolvimento (hot-reload)
npm run dev

# 5. Gerar o build de produção
npm run build

# 6. Executar o build de produção
npm start
```

A API sobe em `http://localhost:3000` (ou na porta definida em `PORT`).
Você pode verificar se está no ar em `GET /health`.

## Perfis de acesso (RBAC)

| Perfil (`role`) | Descrição                                             |
| ---------------- | ------------------------------------------------------ |
| `admin`           | Administrador — acesso completo às funcionalidades da API |
| `atendente`       | Atendente — acesso operacional, com permissões restritas   |

O perfil é definido no momento do cadastro (`role`, opcional — assume
`atendente` por padrão) e é embutido no token JWT emitido no login.

## Documentação dos endpoints

### `POST /auth/register` — Cadastro de usuário

Cria um novo usuário. A senha é armazenada com hash (bcrypt) e nunca é
retornada na resposta.

**Body:**

```json
{
  "name": "Maria Silva",
  "email": "maria@medclinic.com",
  "password": "senha123",
  "role": "admin"
}
```

> `role` é opcional. Valores aceitos: `admin` ou `atendente` (padrão).

**Resposta — 201 Created:**

```json
{
  "id": "b6a1c2e0-...",
  "name": "Maria Silva",
  "email": "maria@medclinic.com",
  "role": "admin",
  "createdAt": "2026-01-10T12:00:00.000Z"
}
```

**Erros:**
- `400` — campos obrigatórios ausentes, e-mail inválido ou senha curta
- `409` — e-mail já cadastrado

---

### `POST /auth/login` — Autenticação

Valida as credenciais e retorna um token JWT.

**Body:**

```json
{
  "email": "maria@medclinic.com",
  "password": "senha123"
}
```

**Resposta — 200 OK:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "b6a1c2e0-...",
    "name": "Maria Silva",
    "email": "maria@medclinic.com",
    "role": "admin"
  }
}
```

**Erros:**
- `400` — e-mail ou senha não informados
- `401` — credenciais inválidas

---

### `GET /users/me` — Dados do usuário autenticado

Retorna os dados do usuário associado ao token informado.

**Headers:**

```
Authorization: Bearer <token>
```

**Resposta — 200 OK:**

```json
{
  "id": "b6a1c2e0-...",
  "name": "Maria Silva",
  "email": "maria@medclinic.com",
  "role": "admin",
  "createdAt": "2026-01-10T12:00:00.000Z"
}
```

**Erros:**
- `401` — token ausente, inválido ou expirado

---

### `GET /admin/ping` — Endpoint restrito ao Administrador

Demonstra o funcionamento do RBAC: apenas usuários com `role = admin`
conseguem acessar.

**Headers:**

```
Authorization: Bearer <token>
```

**Resposta — 200 OK:**

```json
{
  "message": "Pong! Acesso concedido: você é um Administrador."
}
```

**Erros:**
- `401` — token ausente, inválido ou expirado
- `403` — usuário autenticado, mas sem perfil de Administrador

## Próximos passos

Esta entrega representa apenas a base de autenticação e autorização da
MedClinic API. Em uma etapa futura, sobre esta mesma estrutura, serão
implementados os módulos de domínio da clínica: especialidades, médicos,
pacientes e consultas.
