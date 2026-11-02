# MedClinic API — Etapa 2 (NestJS)

![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5_strict-3178C6?logo=typescript&logoColor=white)
![TypeORM](https://img.shields.io/badge/TypeORM-0.3-FE0803)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-cobertura_%E2%89%A580%25-6E9F18?logo=vitest&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-multi--stage-2496ED?logo=docker&logoColor=white)
![CI](https://img.shields.io/badge/GitHub_Actions-PR_%2B_deploy-2088FF?logo=githubactions&logoColor=white)

API REST para gestão de uma clínica médica: cadastro de pacientes e médicos, escala de trabalho, agenda, agendamento de consultas e prontuário eletrônico, com autenticação e autorização por perfil (RBAC).

> Continuação da Etapa 1 (Express). Esta versão reimplementa e expande o escopo em **NestJS**, conforme o enunciado da Etapa 2.

## Sumário

- [Escopo e requisitos atendidos](#escopo-e-requisitos-atendidos)
- [Stack técnica](#stack-técnica)
- [Arquitetura e decisões de projeto](#arquitetura-e-decisões-de-projeto)
- [Como rodar localmente](#como-rodar-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Migrations e seed](#migrations-e-seed)
- [Testes e cobertura](#testes-e-cobertura)
- [Qualidade de código](#qualidade-de-código)
- [Docker](#docker)
- [CI/CD](#cicd)
- [Perfis de acesso](#perfis-de-acesso)
- [Convenções da API](#convenções-da-api)
- [Endpoints](#endpoints)
- [URL pública](#url-pública)

## Escopo e requisitos atendidos

| Requisito | Onde está implementado |
|---|---|
| RF01 — Autenticação JWT | `src/auth/*`, `src/users/auth.controller.ts` |
| RF02/RN02 — Cadastro de pacientes, CPF único | `src/patients/*` |
| RF03/RN03 — Cadastro de médico (usuário + perfil, atômico) | `src/doctors/doctors.service.ts` (transação) |
| RF04/RN05 — Escala de trabalho do médico | `src/work-schedule/*` |
| RF05 — Agenda (escala + agendamentos no período) | `src/calendar/*` |
| RF06/RF07/RN07-RN10 — Criação de agendamento com lock pessimista | `src/appointments/appointments.service.ts#create` |
| RF08/RN11/RN12 — Transição de status do agendamento | `src/appointments/appointments.service.ts#updateStatus` |
| RF09/RN14 — Prontuário com vínculo médico-paciente | `src/medical-records/*` |
| RF11/RP03 — Formato único de erro | `src/common/filters/all-exceptions.filter.ts` |
| RF12 — Validação de entrada | DTOs com `class-validator` + `ValidationPipe` global |
| RF13 — Apenas admin cria novos usuários | `@Roles('admin')` em `UsersController`/`DoctorsController` |
| RP02 — Injeção de dependência | Construtor em todos os services/repositories |
| RP04 — Unicidade garantida no banco | `UNIQUE` em `email`, `cpf`, `crm` (migration) |
| RP05 — Instantes com fuso (`timestamptz`) | `Appointment.startsAt`/`endsAt` |
| RP06 — Schema via migration, nunca `synchronize` | `synchronize: false` fixo em `data-source-options.ts` |
| RP07 — Usuário admin inicial | `src/seed/seed-admin.ts` |
| RP10 — Escuta em `0.0.0.0` | `src/main.ts` |
| RNF01 — Senha nunca em texto puro | bcrypt + coluna `select: false` |
| RNF03 — Erro interno não vaza detalhe | `AllExceptionsFilter` (log só no servidor) |
| RNF06 — Convenção de nomenclatura do banco | `SnakeCaseNamingStrategy` (ver abaixo) |
| RNF07 — Cobertura mínima de 80% | `vitest.config.ts`, ver [Testes e cobertura](#testes-e-cobertura) |

## Stack técnica

- **Node.js 22** + **TypeScript 5** (modo `strict`)
- **NestJS 11** (módulos, guards, pipes, filtros, injeção de dependência)
- **TypeORM 0.3** + **PostgreSQL** (migrations manuais, sem `synchronize`)
- **class-validator** / **class-transformer** — validação de DTOs
- **jsonwebtoken** + **bcrypt** — autenticação
- **Vitest** — testes unitários e cobertura (`@vitest/coverage-v8`)
- **ESLint** (typescript-eslint) + **Prettier** — análise estática e formatação
- **Docker** multi-estágio + **docker-compose** (Postgres local)
- **GitHub Actions** — CI (PR) e CD (deploy)

## Arquitetura e decisões de projeto

O projeto segue a divisão em camadas do NestJS (**M**ódulo → **C**ontroller → **Service** → **Repository**), com injeção de dependência via construtor em todas as classes (RP02).

```text
Requisição HTTP
   │
   ▼
JwtGuard (global)        → valida o token e confere o perfil exigido pela rota
   │
   ▼
ValidationPipe (global)  → valida corpo, parâmetros e query contra os DTOs
   │
   ▼
Controller               → lê a requisição e chama o service
   │
   ▼
Service                  → regra de negócio; lança AppError, sem conhecer HTTP
   │
   ▼
Repository               → acesso ao banco via TypeORM
   │
   ▼
PostgreSQL

Qualquer erro em qualquer etapa → AllExceptionsFilter → envelope JSON padronizado
```

| Camada | Responsabilidade |
|---|---|
| Controller | Extrai dados da requisição, aplica `@Roles()` e delega ao service. Sem regra de negócio |
| Service | Concentra a regra de negócio (escala, conflito de horário, transição de status, vínculo do prontuário). É a camada medida pela cobertura |
| Repository | Consultas ao banco, sem decisão de negócio |
| Entity | Estrutura persistida, com os decorators do TypeORM |
| DTO | Forma e validação dos dados que entram e saem da API |
| Guard / Filter | Autenticação, autorização por perfil e formato único de erro |

**Tratamento de erro centralizado (RP03/RF11).** Toda regra de negócio lança `AppError`, um erro de domínio com um código semântico fixo (`DADOS_INVALIDOS`, `CREDENCIAIS_INVALIDAS`, `HORARIO_INDISPONIVEL` etc. — catálogo completo em `src/common/errors/error-code.ts`). Um único `AllExceptionsFilter` global traduz qualquer exceção (de domínio ou do próprio Nest/`ValidationPipe`) para o mesmo envelope JSON:

```json
{ "statusCode": 400, "error": "DADOS_INVALIDOS", "message": "..." }
```

**Convenção de nomenclatura do banco (RNF06).** Entidades e colunas são escritas em `camelCase` no TypeScript (padrão da linguagem), mas o banco usa `snake_case` (padrão do Postgres). Em vez de anotar cada coluna manualmente, uma `NamingStrategy` própria (`SnakeCaseNamingStrategy`) converte automaticamente `startsAt` → `starts_at`, `workShift` → `work_shift` etc. — um único lugar garante a convenção em todo o schema, sem risco de uma coluna esquecida.

**Atomicidade onde duas tabelas mudam juntas (RF03, RF04).** Criar um médico grava em `user` e `doctor`; trocar a escala apaga e insere turnos. Ambos usam `dataSource.transaction(...)`, operando sobre o `manager` transacional (nunca sobre os repositories injetados) para garantir que ou tudo é gravado, ou nada é.

**Concorrência no agendamento (RF07/RN10).** Duas requisições de agendamento para o mesmo médico, no mesmo instante, são serializadas com um lock pessimista (`SELECT ... FOR UPDATE`) na linha do médico dentro da transação — a segunda requisição só enxerga o agendamento da primeira depois que ela commita, evitando horários duplicados.

**Simplificações conscientes** (documentadas em comentário no próprio código, caso a avaliação queira a razão):
- perfis (`roles`) são uma coluna `text[]` no usuário, em vez de uma tabela de papéis à parte — não há necessidade de papéis dinâmicos no escopo do projeto;
- o JWT carrega um payload assinado simples (`sub`, `roles`), sem uma camada extra de criptografia do payload — o conteúdo não é sensível e HTTPS já protege o transporte;
- horários de turno (`work_shift.start_time`/`end_time`) são strings `"HH:MM"`, não o tipo `time` do Postgres — mais simples de comparar e testar em unidade, sem pegadinha de fuso horário. Eles são **hora local da clínica** (`America/Sao_Paulo`, RN06): o `startsAt` (UTC) é convertido para esse relógio em `src/common/clinic-time.ts` antes de comparar com a escala, e `from`/`to` do calendário e da listagem cobrem o dia inteiro local;
- IDs são inteiros autoincrementais, não UUID — compatível com os exemplos de payload do contrato da API.

## Como rodar localmente

Pré-requisitos: Node.js 22+, Docker (para o Postgres local).

```bash
# 1. instalar dependências
npm ci

# 2. copiar e preencher o .env
cp .env.example .env

# 3. subir um Postgres local
docker compose up -d

# 4. build (gera dist/ e também é usado pelos comandos de migration)
npm run build

# 5. rodar as migrations (cria o schema)
npm run migration:run

# 6. criar o usuário admin inicial
npm run seed:admin

# 7. subir a API em modo desenvolvimento (hot-reload)
npm run start:dev
```

A API sobe em `http://localhost:3000/api/v1` (prefixo fixo — ver `src/main.ts`).

> O arquivo `.npmrc` do repositório ativa `legacy-peer-deps` (por isso `npm ci` funciona no CI e no Docker sem flags): o `@nestjs/schematics` mais recente da sua máquina pode exigir TypeScript 6, enquanto o projeto é construído sobre a linha estável 11.x do Nest (compatível com TypeScript 5). Isso evita um conflito de resolução do npm sem baixar uma versão experimental do framework.

## Variáveis de ambiente

Veja `.env.example` para a lista completa com valores de exemplo. Resumo:

| Variável | Descrição | Default |
|---|---|---|
| `PORT` | Porta HTTP da API | `3000` |
| `LOG_LEVEL` | Nível de log da aplicação | `log` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexão com o Postgres | — |
| `DB_SYNCHRONIZE` | Sempre `false` em qualquer ambiente (RP06) | `false` |
| `DB_SSL` | Exigir SSL na conexão (necessário em alguns provedores gerenciados) | `false` |
| `JWT_SECRET` | Chave de assinatura do token — troque em produção | — |
| `JWT_EXPIRES_IN` | Validade do token | `8h` |
| `JWT_ISSUER` | Claim `iss` validado na verificação | `medclinic` |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Usados só pelo script de seed (RP07) | — |
| `CONTAINER_NAME_DB`, `CONTAINER_NAME_API` | Nomes dos containers nos arquivos de compose | `medclinic-postgres`, `medclinic-api` |

## Migrations e seed

O schema nunca é criado por `synchronize` (RP06) — sempre por migration versionada em `src/common/database/migrations/`.

```bash
npm run migration:run       # aplica as migrations pendentes
npm run migration:generate  # gera uma nova migration a partir do diff das entidades
npm run migration:create    # cria uma migration em branco
npm run seed:admin          # garante que existe ao menos um usuário admin (idempotente)
```

Em produção, a própria aplicação também roda `runMigrations()` automaticamente na subida (`DatabaseModule`), então o passo manual é mais relevante para desenvolvimento local.

## Testes e cobertura

```bash
npm run test        # roda a suíte uma vez
npm run test:watch  # modo watch
npm run test:cov    # roda com relatório de cobertura e aplica o limite mínimo
```

RNF07 exige 80% de cobertura (linhas/branches/funções/statements), medida **apenas** sobre os arquivos `src/**/*.service.ts` — onde vive a regra de negócio (ver `vitest.config.ts`). Os testes usam dublês de repository/dataSource escritos à mão (sem banco, sem rede), então rodam em segundos.

Cenários mínimos exigidos pela Seção 4.5 do enunciado, e onde cada um está:

| Cenário | Arquivo |
|---|---|
| Sobreposição de períodos (5 casos) | `test/common/period-overlap.spec.ts` |
| Validações de criação de agendamento (6+ ramos) | `test/appointments/appointments.service.spec.ts` |
| Sobreposição de turnos na escala | `test/work-schedule/work-schedule.service.spec.ts` |
| Transição de status (válida e inválida) | `test/appointments/appointments.service.spec.ts` |
| Acesso a prontuário (com/sem vínculo) | `test/medical-records/medical-records.service.spec.ts` |
| Login (credencial inválida + comparação de hash) | `test/users/users.service.spec.ts` |

A suíte cobre também `patients`, `doctors` (incluindo a transação atômica e a tradução de violação de unique), `calendar` e os dois serviços de `auth` (`jwt.service.ts`, `password.service.ts`), totalizando 78 testes.

## Qualidade de código

```bash
npm run lint:check  # ESLint + Prettier, só reporta (é o que roda no CI)
npm run lint        # ESLint com correção automática
npm run format      # Prettier em src/ e test/
```

- O ESLint usa `typescript-eslint` com regras que consultam os tipos (`recommendedTypeChecked`) e o Prettier roda como regra do próprio ESLint, então um único comando cobre estilo e erros.
- Estilo do Prettier em `.prettierrc`: aspas simples, ponto e vírgula, vírgula final.
- O build usa `tsconfig.build.json`, que estende o `tsconfig.json`, fixa `rootDir` em `src/` e exclui testes e `vitest.config.ts`, para que nada fora de `src/` entre no `dist/`.
- `test/tsconfig.json` existe só para o ESLint conseguir ler os tipos dos testes; não afeta o build.

## Docker

```bash
docker build -t medclinic-api .
docker run --env-file .env -p 3000:3000 medclinic-api
```

O `Dockerfile` é multi-estágio: o estágio de build instala todas as dependências e compila; o estágio final instala só as dependências de produção e copia apenas `dist/`, sem o código-fonte TypeScript nem devDependencies.

O `Dockerfile` instala com `npm ci`, que segue o `package-lock.json` à risca e deixa a imagem reprodutível.

Há dois arquivos de compose, um por responsabilidade:

| Arquivo | O que sobe | Quando usar |
|---|---|---|
| `docker-compose.yml` | Apenas o Postgres 16 | Desenvolvimento local, com a API fora do compose (`npm run start:dev`) para ter hot-reload |
| `api.compose.yml` | A API, construída a partir do `Dockerfile` | Testar a imagem real; alcança o Postgres do outro compose por `host.docker.internal` |

```bash
docker compose up -d                              # banco
docker compose -f api.compose.yml up -d --build   # API em container
```

Os nomes dos containers vêm de `CONTAINER_NAME_DB` e `CONTAINER_NAME_API` no `.env`.

## CI/CD

- **`.github/workflows/pr-workflow.yml`** — roda em toda PR para `main` (job `build-and-test`, Node 22): `npm ci`, roda o lint (`npm run lint:check`), builda e roda `npm run test:cov` (o merge é bloqueado se a cobertura cair abaixo do limite).
- **`.github/workflows/deploy.yml`** — roda em todo push para `main` (ou seja, após o merge de uma PR): builda a imagem Docker e publica no GitHub Container Registry (`ghcr.io/<owner>/<repo>`); o último passo chama o Deploy Hook do Render (`curl` na URL guardada no secret `RENDER_DEPLOY_HOOK_URL`). Nenhuma variável da aplicação fica no workflow: ficam no painel da plataforma.

## Perfis de acesso

O usuário carrega um array `roles` no token. Cada rota declara com `@Roles(...)` quais perfis aceita; basta um deles bater.

| Perfil | O que pode fazer |
|---|---|
| `admin` | Cria usuários e médicos, define a escala, cadastra, edita e remove pacientes, cria agendamentos e cancela qualquer consulta. Inicia e conclui consultas e lê o prontuário de qualquer paciente (auditoria), mas não escreve |
| `secretary` | Cadastra e edita pacientes, cria agendamentos e cancela consultas **agendadas** (não as em andamento). Não acessa prontuário |
| `doctor` | Inicia, conclui e cancela as próprias consultas e só enxerga as próprias. Escreve e lê o prontuário apenas de pacientes com quem tem vínculo |

**Vínculo (RN14):** um médico tem vínculo com um paciente quando existe ao menos uma consulta entre os dois com status `in_progress` ou `done`. Sem vínculo, escrita e leitura de prontuário devolvem `ACESSO_NEGADO`.

## Convenções da API

**Listagens** aceitam `page` (padrão 1) e `pageSize` (padrão 20, máximo 100) e respondem:

```json
{
  "data": [],
  "meta": { "total": 42, "page": 1, "pageSize": 20, "totalPages": 3 }
}
```

**Erros** seguem sempre o mesmo envelope, com o código vindo de `src/common/errors/error-code.ts`:

```json
{
  "statusCode": 409,
  "error": "HORARIO_INDISPONIVEL",
  "message": "O medico ja possui um agendamento nesse horario."
}
```

| Código | Status | Quando |
|---|---|---|
| `DADOS_INVALIDOS` | 400 | Corpo, parâmetro ou query fora do formato esperado |
| `NAO_AUTENTICADO` | 401 | Token ausente, inválido ou expirado |
| `CREDENCIAIS_INVALIDAS` | 401 | E-mail ou senha incorretos no login |
| `ACESSO_NEGADO` | 403 | Perfil sem permissão ou médico sem vínculo |
| `RECURSO_NAO_ENCONTRADO` | 404 | Registro inexistente |
| `EMAIL_JA_CADASTRADO`, `CPF_JA_CADASTRADO`, `CRM_JA_CADASTRADO` | 409 | Valor único já existente |
| `HORARIO_INDISPONIVEL` | 409 | Médico já tem consulta no período |
| `PACIENTE_INDISPONIVEL` | 409 | Paciente já tem consulta no período |
| `HORARIO_FORA_DA_ESCALA` | 422 | Horário fora da escala, desalinhado da grade ou que ultrapassa o turno |
| `TRANSICAO_INVALIDA` | 422 | Mudança de status que o ciclo de vida não permite |

**Exemplos de corpo de requisição:**

```json
// POST /auth/login
{ "email": "admin@medclinic.com", "password": "TrocarSenhaForte@123" }

// POST /doctors
{ "name": "Dra. Ana", "email": "ana@medclinic.com", "password": "123456", "crm": "CRM12345" }

// PUT /doctors/1/work-schedule
{ "shifts": [{ "weekDay": 1, "startTime": "08:00", "endTime": "12:00", "slotDurationMinutes": 30 }] }

// POST /appointments  (startsAt com fuso; o fim é calculado pelo slot do turno)
{ "doctorId": 1, "patientId": 1, "startsAt": "2026-10-12T08:00:00-03:00" }

// PATCH /appointments/1/status
{ "status": "in_progress" }

// POST /patients/1/medical-records  (doctorId vem do token)
{ "text": "Paciente relata melhora dos sintomas." }
```

## Endpoints

Prefixo fixo: `/api/v1`. Perfis entre colchetes indicam `@Roles(...)`; sem colchetes = qualquer usuário autenticado; 🔓 = rota pública.

| Método | Rota | Perfis | Descrição |
|---|---|---|---|
| GET | `/health` | 🔓 | Healthcheck |
| POST | `/auth/login` | 🔓 | Login, devolve `accessToken` |
| POST | `/users` | `admin` | Cria usuário (qualquer perfil) |
| GET | `/users/me` | — | Dados do usuário autenticado |
| POST | `/patients` | `admin`, `secretary` | Cadastra paciente |
| GET | `/patients` | — | Lista paciente (paginado, filtro por nome) |
| GET | `/patients/:id` | — | Detalhe do paciente |
| PATCH | `/patients/:id` | `admin`, `secretary` | Atualiza nome do paciente |
| DELETE | `/patients/:id` | `admin` | Remove logicamente (soft delete) |
| POST | `/doctors` | `admin` | Cria médico (usuário + registro profissional) |
| GET | `/doctors` | — | Lista médicos (paginado, filtro por nome) |
| GET | `/doctors/:id` | — | Detalhe do médico |
| PUT | `/doctors/:doctorId/work-schedule` | `admin` | Substitui a escala inteira do médico |
| GET | `/doctors/:doctorId/work-schedule` | — | Consulta a escala do médico |
| GET | `/doctors/:doctorId/calendar?from=&to=` | — | `{ workSchedule: { shifts }, appointments }` no período `YYYY-MM-DD` inclusivo (máx. 31 dias) |
| POST | `/appointments` | `admin`, `secretary` | Cria agendamento |
| GET | `/appointments` | — | Lista agendamentos (médico só vê os próprios) |
| GET | `/appointments/:id` | — | Detalhe (médico só acessa os próprios) |
| PATCH | `/appointments/:id/status` | — | Transição de status (autoridade validada por regra) |
| POST | `/patients/:patientId/medical-records` | `doctor` | Cria entrada de prontuário (exige vínculo; `doctorId` vem do token) |
| GET | `/patients/:patientId/medical-records` | `admin`, `doctor` | Histórico do paciente (médico exige vínculo; admin lê para auditoria) |

## URL pública

`TODO` — preencher com a URL do deploy antes da entrega final.

//the end
