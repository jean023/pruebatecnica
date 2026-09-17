# 🎬 MoviesTech

Plataforma web Full Stack para buscar películas a través de la API de OMDb y gestionar una colección personal de favoritas con calificaciones y notas privadas.

---

## 🏛️ Arquitectura

Monorepo con tres capas independientes desacopladas y orquestadas con Docker Compose:

```
Browser → React (Vite) :5173 → FastAPI (Uvicorn) :8000 → PostgreSQL :5432
                                       ↓
                                   OMDb API
```

- **Frontend**: React 18 + Vite — SPA interactiva con gestión de sesión y catálogo.
- **Backend**: FastAPI + SQLAlchemy — API REST segura con autenticación JWT y cliente OMDb asíncrono.
- **Base de datos**: PostgreSQL 16 — persistencia de usuarios y películas favoritas con integridad referencial.

---

## 🛠️ Tecnologías

| Capa | Tecnologías |
|------|------------|
| **Frontend** | React 18, Vite 5, JavaScript, CSS3 |
| **Backend** | Python 3.12+, FastAPI, Uvicorn, SQLAlchemy, Pydantic, Passlib (Bcrypt), Python-Jose (JWT), HTTPX |
| **Base de datos** | PostgreSQL 16 |
| **Infraestructura** | Docker, Docker Compose |

---

## 📁 Estructura del Proyecto

```text
moviestech/
├── backend/
│   ├── app/
│   │   ├── api/          # Routers (auth, movies, favorites, health)
│   │   ├── core/         # Configuración y módulo de seguridad (JWT + bcrypt)
│   │   ├── db/           # Conexión y sesión SQLAlchemy
│   │   ├── models/       # Modelos ORM (User, Favorite)
│   │   ├── schemas/      # Schemas Pydantic (request/response)
│   │   ├── services/     # Lógica de negocio (auth, omdb, favorites)
│   │   └── main.py       # Punto de entrada FastAPI + CORS + Routers
│   ├── tests/            # Tests unitarios y de integración
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/   # SearchBar, MovieCard, FavoritesView
│   │   ├── hooks/        # useAuth (gestión de sesión)
│   │   ├── pages/        # LoginPage, RegisterPage, HomePage
│   │   ├── services/     # api.js (cliente HTTP centralizado)
│   │   ├── App.jsx       # Componente raíz con enrutamiento condicional
│   │   ├── index.css     # Estilos modo oscuro
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js     # Proxy de desarrollo
│   ├── Dockerfile
│   └── .env.example
│
├── database/
│   └── schema.sql        # DDL para inicialización de PostgreSQL
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## ⚙️ Configuración y Variables de Entorno

Puedes configurar tus variables en los archivos `.env`:

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://moviestech_user:moviestech_pass@db:5432/moviestech
JWT_SECRET=dev_jwt_secret_key_moviestech_2026
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=60
OMDB_API_KEY=2e5d578c
```

---

## 🚀 Cómo Ejecutar con Docker

1. Inicia **Docker Desktop** en tu equipo.
2. Construye y levanta los servicios:

```bash
docker compose up --build
```

3. Accede a los servicios:

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **Frontend** | [http://localhost:5173](http://localhost:5173) | Aplicación web React |
| **API Docs (Swagger)** | [http://localhost:8000/docs](http://localhost:8000/docs) | Documentación interactiva de la API |
| **Backend Health** | [http://localhost:8000/health](http://localhost:8000/health) | Chequeo de estado |
| **PostgreSQL** | `localhost:5432` | Base de datos |

Para detener los contenedores:

```bash
docker compose down
```

---

## ✨ Funcionalidades Implementadas

- [x] **Autenticación Completa**: Registro y login con contraseñas encriptadas (`bcrypt`) y tokens `JWT`.
- [x] **Buscador de Películas**: Búsqueda en tiempo real conectada a la API oficial de OMDb con paginación de resultados.
- [x] **Catálogo Visual**: Tarjetas interactivas con pósters, año, ID de IMDb y badge de tipo.
- [x] **CRUD de Favoritas**:
  - Agregar películas a tu colección personal con 1 clic.
  - Listar tus películas favoritas en una vista dedicada.
  - Asignar y editar tu calificación personal del **1 al 10**.
  - Eliminar películas de favoritas.
- [x] **Protección de Rutas**: Endpoints asegurados que validan el token de autorización del usuario.
- [x] **Tests Automatizados**: Cobertura de tests unitarios para autenticación, búsqueda y favoritas en `backend/tests/`.
