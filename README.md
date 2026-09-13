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
├── controllers/     
│   ├── AuthController.ts
│   ├── UserController.ts
│   └── AdminController.ts
├── services/        
│   ├── AuthService.ts
│   └── UserService.ts
├── repositories/     
│   └── UserRepository.ts
├── entities/         
│   └── User.ts
├── dtos/             
│   ├── CreateUserDTO.ts
│   └── LoginDTO.ts
├── middlewares/      
│   ├── authMiddleware.ts
│   ├── rbacMiddleware.ts
│   └── errorHandler.ts
├── routes/           
│   ├── auth.routes.ts
│   ├── user.routes.ts
│   ├── admin.routes.ts
│   └── index.ts
├── database/
│   ├── data-source.ts      
│   └── migrations/         
├── utils/            
├── types/            
├── app.ts            
└── server.ts 