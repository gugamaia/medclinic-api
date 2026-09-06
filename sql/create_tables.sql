CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE users_role_enum AS ENUM ('admin', 'atendente');

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role users_role_enum NOT NULL DEFAULT 'atendente',
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
