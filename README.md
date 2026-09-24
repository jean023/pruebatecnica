# MoviesTech

Plataforma web para buscar películas y gestionar una lista de favoritas con calificaciones personales.

# Arquitectura

Monorepo con tres capas independientes, cada una en su propio contenedor Docker:

```
Browser → React (Vite) :5173 → FastAPI (Uvicorn) :8000 → PostgreSQL :5432
```
- **Frontend**: React + Vite — interfaz de usuario SPA
- **Backend**: FastAPI + SQLAlchemy — API REST
- **Base de datos**: PostgreSQL 16 — persistencia relacional

# Tecnologías

| Capa | Tecnologías |
|------|------------|
| Frontend | React 18, Vite 5, JavaScript |
| Backend | Python 3.12, FastAPI, Uvicorn, SQLAlchemy, Pydantic |
| Base de datos | PostgreSQL 16 |
| Infraestructura | Docker, Docker Compose |

# Estructura de carpetas

```
moviestech/
├── backend/
│   ├── app/
│   │   ├── api/          # Routers / endpoints
│   │   ├── core/         # Configuración (Pydantic Settings)
│   │   ├── db/           # Conexión SQLAlchemy
│   │   ├── models/       # Modelos ORM
│   │   ├── schemas/      # Schemas Pydantic (request/response)
│   │   ├── services/     # Lógica de negocio
│   │   └── main.py       # Punto de entrada FastAPI
│   ├── tests/            # Tests
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/   # Componentes React reutilizables
│   │   ├── pages/        # Vistas / páginas
│   │   ├── services/     # Llamadas HTTP al backend
│   │   ├── hooks/        # Custom hooks
│   │   ├── App.jsx       # Componente raíz
│   │   └── main.jsx      # Punto de entrada
│   ├── package.json
│   ├── vite.config.js
│   ├── Dockerfile
│ 
│
├── database/
│   └── schema.sql        # DDL para crear tablas
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

# Requisitos

- Docker y Docker Compose
- Git

Para desarrollo local sin Docker:
- Python 3.12+
- Node.js 20+
- PostgreSQL 16

# Variables de entorno

Copiar los archivos de ejemplo y ajustar los valores:

```bash
cp backend/.env.example backend/.env
```

# Backend (`backend/.env`)

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de conexión a PostgreSQL |
| `JWT_SECRET` | Secreto para tokens JWT *(fase futura)* | 
| `JWT_ALGORITHM` | Algoritmo JWT *(fase futura)* |
| `JWT_EXPIRATION_MINUTES` | Expiración del token *(fase futura)* |
| `OMDB_API_KEY` | API key de OMDb *(fase futura)* |

# Frontend (`backend/.env`)

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL base del backend |
| `VITE_OMDB_API_KEY` | API key de OMDb *(fase futura)* |

# Ejecutar con Docker

```bash
docker compose up --build
```

Esto levanta tres servicios:

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| `frontend` | [http://localhost:5173](http://localhost:5173) | Aplicación React |
| `backend` | [http://localhost:8000](http://localhost:8000) | API FastAPI |
| `db` | `localhost:5432` | PostgreSQL |

Para detener:

```bash
docker compose down
```

Para eliminar también los datos de PostgreSQL:

```bash
docker compose down -v
```

# Puertos

| Puerto | Servicio |
|--------|----------|
| 5173 | Frontend (Vite dev server) |
| 8000 | Backend (Uvicorn) |
| 5432 | PostgreSQL |

# Verificar funcionamiento

1. **Backend**: Abrir [http://localhost:8000](http://localhost:8000) — debe responder `{"status": "ok", "project": "MoviesTech", "version": "0.1.0"}`
2. **Health check**: Abrir [http://localhost:8000/health](http://localhost:8000/health) — debe responder `{"status": "healthy"}`
3. **Frontend**: Abrir [http://localhost:5173](http://localhost:5173) — debe mostrar el estado de conexión con el backend
4. **Base de datos**: Las tablas `users` y `favoritas` se crean automáticamente al iniciar el contenedor

# al clonar , usar .env en " /backend " y buildear el docker compose  con:

docker compose up --build
 env:  (para futuros ejemplos) 

#aplication
PROJECT_NAME=MoviesTech
VERSION=0.1.0

# CORS
CORS_ORIGINS=["http://localhost:5173","http://frontend:5173"] #ejemplo

# Database
DATABASE_URL=postgresql://moviestech_user:moviestech_pass@db:5432/moviestech
POSTGRES_USER= moviestech_user
POSTGRES_PASSWORD= moviestech_pass
POSTGRES_DB= moviestech

# JWT
JWT_SECRET=dev_jwt_secret_key_moviestech_2026
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=60

# OMDb
OMDB_API_KEY=2e5d578c #el api

#Vite
VITE_API_URL=  http://localhost:8000