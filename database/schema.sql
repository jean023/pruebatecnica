-- MoviesTech - Esquema de base de datos
-- Ejecutar sobre una base de datos PostgreSQL vacía

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(100) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

-- Tabla de películas favoritas
CREATE TABLE IF NOT EXISTS favoritas (
    id              SERIAL PRIMARY KEY,
    id_usuario      INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    id_pelicula     VARCHAR(20)  NOT NULL,
    titulo          VARCHAR(500) NOT NULL,
    anio            VARCHAR(10),
    poster          VARCHAR(1000),
    nota            SMALLINT     CHECK (nota >= 1 AND nota <= 10),
    fecha_agregado  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_favoritas_id_usuario ON favoritas (id_usuario);
CREATE INDEX IF NOT EXISTS idx_favoritas_id_pelicula ON favoritas (id_pelicula);
