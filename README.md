# MoviesTech - Prueba Tecnica Full Stack

Aplicacion web para buscar peliculas a traves de la API de OMDb y gestionar una lista personal de favoritas con calificaciones del 1 al 10.

---

## Arquitectura del Proyecto

El proyecto esta organizado como un monorepo dividido en tres capas principales:

```text
Browser -> React (Vite) :5173 -> FastAPI (Uvicorn) :8000 -> PostgreSQL :5432
                                        |
                                    OMDb API
```

- **Frontend**: Single Page Application construida con React y Vite. Maneja el estado de autenticacion, consumo de la API REST, busqueda con paginacion y visualizacion de favoritas.
- **Backend**: API REST construida con FastAPI y SQLAlchemy. Implementa autenticacion con JWT y contraseñas hasheadas con bcrypt, conexion a PostgreSQL y cliente HTTP asincrono para OMDb con cache en memoria.
- **Base de Datos**: PostgreSQL 16 con tablas `users` y `favoritas`, llaves foraneas en cascada y restricciones de integridad.
- **Infraestructura**: Orquestacion mediante Docker Compose para levantar todos los servicios en contenedores independientes.

---

## Stack Tecnologico

- **Frontend**: React 18, Vite, JavaScript, CSS3
- **Backend**: Python 3.12, FastAPI, Uvicorn, SQLAlchemy, Pydantic, Passlib (bcrypt), python-jose (JWT), HTTPX, Pytest
- **Base de Datos**: PostgreSQL 16
- **Contenedores**: Docker, Docker Compose

---

## Estructura de Carpetas

```text
moviestech/
├── backend/
│   ├── app/
│   │   ├── api/          # Routers de FastAPI (auth, movies, favorites, health)
│   │   ├── core/         # Configuracion con Pydantic Settings y seguridad (JWT/bcrypt)
│   │   ├── db/           # Conexion a base de datos y sesion SQLAlchemy
│   │   ├── models/       # Modelos ORM (User, Favorite)
│   │   ├── schemas/      # Validacion de datos con Pydantic
│   │   ├── services/     # Logica de negocio y cliente OMDb
│   │   └── main.py       # Punto de entrada de la aplicacion
│   ├── tests/            # Pruebas automatizadas (pytest)
│   ├── requirements.txt  # Dependencias de Python
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/   # Componentes reutilizables (SearchBar, MovieCard, FavoritesView)
│   │   ├── hooks/        # Custom hook useAuth para manejo de sesion
│   │   ├── pages/        # Vistas principales (LoginPage, RegisterPage, HomePage)
│   │   ├── services/     # Cliente HTTP para llamadas a la API
│   │   ├── App.jsx       # Componente principal con enrutamiento condicional
│   │   ├── index.css     # Estilos globales de la aplicacion
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── Dockerfile
│   └── .env.example
│
├── database/
│   └── schema.sql        # Script DDL para inicializar tablas en PostgreSQL
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Variables de Entorno

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://moviestech_user:moviestech_pass@db:5432/moviestech
JWT_SECRET=dev_jwt_secret_key_moviestech_2026
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=60
OMDB_API_KEY=2e5d578c
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:8000
```

---

## Como Ejecutar el Proyecto con Docker

1. Iniciar Docker Desktop.
2. En la raiz del proyecto ejecutar:

```bash
docker compose up --build
```

3. Acceder a los servicios disponibles:

| Servicio | URL | Descripcion |
|----------|-----|-------------|
| Frontend | http://localhost:5173 | Aplicacion web en React |
| Backend Docs | http://localhost:8000/docs | Documentacion interactiva Swagger |
| Healthcheck | http://localhost:8000/health | Estado del servidor |
| Base de datos | localhost:5432 | PostgreSQL |

Para detener los contenedores:

```bash
docker compose down
```

---

## Funcionalidades Desarrolladas

1. **Autenticacion de Usuarios**:
   - Registro de usuarios con validacion de nombre unico.
   - Hashing seguro de contraseñas con `bcrypt`.
   - Inicio de sesion y generacion de tokens `JWT` (OAuth2 Bearer).
   - Endpoint protegido `/auth/me` y persistencia de sesion en `localStorage`.

2. **Buscador de Peliculas**:
   - Consumo asincrono de la API externa de OMDb.
   - Paginacion tradicional (Anterior / Siguiente) y opcion de "Cargar mas" (+10 peliculas).
   - Cache en memoria con TTL de 30 minutos para evitar consultas repetidas y optimizar el uso de la API externa.
   - Control de errores ante caidas o limite de peticiones de OMDb (HTTP 429 / 504).

3. **Gestion de Favoritas (CRUD)**:
   - Agregar peliculas a favoritas vinculadas al usuario autenticado.
   - Listar peliculas favoritas con filtros y ordenamiento:
     - Ordenar por: fecha de agregado, nota personal, año de estreno, titulo (A-Z).
     - Filtrar por: calificacion minima (ej. nota 7+, 8+, 9+) o busqueda por texto.
   - Editar calificacion personal (1 a 10) con persistencia en base de datos.
   - Eliminar peliculas de la lista de favoritas.

4. **Pruebas Automatizadas**:
   - Tests de autenticacion (`test_auth.py`).
   - Tests de integracion simulando OMDb con mocks y verificacion de cache (`test_movies.py`).
   - Tests de CRUD, filtros y ordenamiento en favoritas (`test_favorites.py`).
   - Test de endpoints base de salud (`test_health.py`).

Para ejecutar las pruebas:

```bash
pytest backend/tests
```
