# Análisis completo del proyecto MoviesTech

Este documento describe lo que hace el código que está actualmente en el repositorio, cómo se conectan sus partes y los detalles que conviene conocer al explicar el proyecto en una entrevista. Cuando el comportamiento del código difiere de las guías de repaso o del README, se indica explícitamente.

## 1. Propósito y arquitectura

MoviesTech es una aplicación web para buscar películas en OMDb y administrar una lista personal de favoritas con una nota de 1 a 10. Es un monorepo con tres servicios:

```text
Navegador → React/Vite :5173 → proxy Vite → FastAPI/Uvicorn :8000 → PostgreSQL :5432
                                            ↘ OMDb API externa
```

- **Frontend:** React 18 y Vite. Presenta el login/registro, búsqueda, paginación y favoritos.
- **Backend:** FastAPI expone la API REST; SQLAlchemy accede a PostgreSQL; Pydantic valida y serializa datos.
- **OMDb:** servicio externo consultado por el backend para búsquedas y detalles. La clave se lee en el servidor.
- **Docker Compose:** inicia PostgreSQL, backend y frontend.

En desarrollo el navegador pide rutas como `/api/movies/search`. El servidor de Vite reenvía esa ruta a FastAPI y quita el prefijo `/api`, por lo que FastAPI recibe `/movies/search`. El proxy no cambia la ruta dentro de FastAPI ni sustituye la configuración CORS para otros escenarios.

## 2. Recorridos principales

### Registro e inicio de sesión

1. `RegisterPage` envía usuario y contraseña como JSON a `POST /auth/register`.
2. El router delega a `services/auth.py`; este busca el usuario, aplica hash bcrypt a la contraseña y persiste el registro.
3. `UserResponse` devuelve id, usuario y fecha de creación; no expone `password_hash`.
4. El login manda `username` y `password` como formulario `application/x-www-form-urlencoded`, porque FastAPI usa `OAuth2PasswordRequestForm`.
5. Si las credenciales son válidas, el backend firma un JWT cuyo `sub` es el id del usuario y devuelve `access_token` y `token_type`.
6. `useAuth` guarda el token en `localStorage`, actualiza estado y consulta `GET /auth/me` para cargar al usuario actual.

En las rutas protegidas, `get_current_user` valida firma y expiración del JWT, obtiene `sub`, busca el usuario en la base de datos y lo inyecta en el endpoint. Un token inválido o un usuario inexistente producen `401`.

### Búsqueda de películas

1. `SearchBar` entrega el texto a `HomePage.handleSearch`.
2. `api.js` crea los parámetros `q` y `page`, y adjunta `Authorization: Bearer <token>`.
3. Vite proxifica `/api/movies/search` hacia FastAPI `/movies/search` durante desarrollo.
4. `api/movies.py` requiere autenticación, valida texto y página, y llama al servicio OMDb.
5. `services/omdb.py` consulta OMDb con `httpx`, mapea la respuesta a `MovieItem` y `MovieSearchResponse`, y conserva resultados en caché.
6. React actualiza resultados, metadatos, paginación y estados de carga/error.

### Favoritos

1. `MovieCard` llama a `HomePage.handleToggleFavorite`.
2. El frontend añade el JWT y hace POST o DELETE a `/favorites`.
3. FastAPI resuelve `get_current_user` y `get_db`; el servicio filtra siempre por `current_user.id`.
4. SQLAlchemy crea, actualiza, consulta o elimina el registro en `favoritas`.
5. `FavoriteResponse` serializa los campos públicos y el frontend actualiza su estado.

El filtro por usuario en cada consulta evita que alguien acceda a favoritos ajenos modificando un id (riesgo IDOR). Sin embargo, en la tabla no hay una restricción única para `(id_usuario, id_pelicula)`, así que la comprobación de duplicados en Python no cubre una carrera de dos inserciones simultáneas.

## 3. Backend: descripción archivo por archivo

### Aplicación y rutas

#### `backend/app/main.py`

Construye la instancia FastAPI con nombre y versión desde `settings`, configura `CORSMiddleware` y registra los routers de health, autenticación, películas y favoritos. Aquí no se crean tablas con `Base.metadata.create_all`; en el entorno Compose la creación inicial se hace con `database/schema.sql`.

La política CORS toma orígenes de `CORS_ORIGINS`, permite credenciales y actualmente acepta cualquier método y encabezado. Es cómoda para el proyecto, pero una configuración de producción debería limitar esos valores a lo que realmente usa el frontend.

#### `backend/app/api/__init__.py`

Inicializador del paquete de rutas; no contiene lógica.

#### `backend/app/api/health.py`

Define dos rutas públicas: `GET /` responde estado, nombre y versión del proyecto; `GET /health` devuelve `{"status":"healthy"}`. Sirven como comprobaciones sencillas de disponibilidad.

#### `backend/app/api/auth.py`

Declara el router `/auth`:

- `POST /auth/register`: recibe `UserCreate`, obtiene sesión con `get_db`, crea el usuario y responde `UserResponse` con estado 201.
- `POST /auth/login`: recibe formulario OAuth2, compara credenciales y devuelve token. Si fallan, responde 401 con un error genérico.
- `GET /auth/me`: exige `get_current_user` y devuelve el usuario autenticado sin su hash.

El router coordina HTTP y dependencias; las operaciones de usuarios están en `services/auth.py`.

#### `backend/app/api/movies.py`

Declara `/movies`. Tanto `GET /movies/search` como `GET /movies/{imdb_id}` exigen JWT. Search valida `q` no vacío y `page` entre 1 y 100. Las dos rutas delegan el trabajo externo a `services/omdb.py` y declaran schemas de respuesta.

La autenticación de búsqueda también limita el uso del backend como proxy abierto que consumiría cuota de OMDb.

#### `backend/app/api/favorites.py`

Declara `/favorites`; todas sus operaciones exigen un usuario autenticado y una sesión de DB:

- `GET /favorites`: lista favoritas del usuario. Acepta `sort_by`, `order`, `min_nota` y `q` con validaciones de query.
- `POST /favorites`: crea una favorita y responde 201.
- `PATCH /favorites/{favorite_id}`: actualiza nota.
- `DELETE /favorites/{favorite_id}`: elimina por id interno, responde 204.
- `DELETE /favorites/movie/{imdb_id}`: elimina por id IMDb, responde 204.

Cada llamada de servicio usa el id del usuario autenticado, no un id_usuario confiado al cliente.

### Configuración, seguridad y base de datos

#### `backend/app/core/__init__.py`

Inicializador vacío del paquete `core`.

#### `backend/app/core/config.py`

Define `Settings` con Pydantic Settings. Carga nombre/versión (con valores por defecto), URL de DB, orígenes CORS, secreto/algoritmo/duración JWT y clave OMDb desde entorno o `.env`. Los campos de infraestructura son obligatorios; una configuración ausente o de tipo inválido puede impedir el arranque. `extra="ignore"` ignora variables adicionales.

La instancia global `settings` se crea al importar el módulo. El repositorio no contiene un `.env` versionado; el README indica que debe existir `backend/.env`.

#### `backend/app/core/security.py`

Configura `CryptContext` con bcrypt y el esquema OAuth2 Bearer. Incluye:

- `hash_password`: genera hash de contraseña.
- `verify_password`: compara contraseña plana con hash.
- `create_access_token`: agrega `exp` en UTC y firma el JWT con secreto y algoritmo configurados.
- `get_current_user`: toma token de `Authorization`, decodifica/verifica firma y vencimiento, lee `sub`, busca al usuario vía DB y lo devuelve. Ante errores de credenciales responde 401.

El token guarda el id como texto (`str(user.id)`); el validador luego lo convierte a entero para buscarlo.

#### `backend/app/db/__init__.py`

Inicializador vacío del paquete de base de datos.

#### `backend/app/db/session.py`

Crea el engine SQLAlchemy a partir de `DATABASE_URL`, configura `SessionLocal` y declara la clase base declarativa `Base`. `get_db` crea una sesión por petición, la entrega con `yield` y la cierra en `finally`, incluso si ocurre una excepción.

#### `backend/app/models/__init__.py`

Importa y exporta `User` y `Favorite`. Centraliza los modelos para que SQLAlchemy pueda descubrir sus metadatos.

#### `backend/app/models/user.py`

Mapea `User` a la tabla `users`: id entero, username único/no nulo, password_hash, fecha de creación. Define relación uno-a-muchos `favorites`; al borrar usuario, los favoritos asociados se eliminan por cascada ORM.

#### `backend/app/models/favorite.py`

Mapea `Favorite` a `favoritas`: id, FK `id_usuario`, id IMDb, título, año, poster, nota, fecha de agregado y relación inversa con `User`. La FK tiene `ON DELETE CASCADE`. **No declara unicidad conjunta de usuario y película**; tampoco el `schema.sql` actual.

### Schemas Pydantic

#### `backend/app/schemas/__init__.py`

Inicializador vacío.

#### `backend/app/schemas/user.py`

- `UserCreate` valida username entre 3 y 100 caracteres y contraseña entre 6 y 100.
- `UserResponse` expone id, username y created_at; `from_attributes` permite serializar atributos del ORM.
- `Token` define `access_token` y tipo bearer por defecto.

Separar schema del modelo ORM permite controlar qué datos acepta/devuelve la API y no revelar `password_hash`.

#### `backend/app/schemas/movie.py`

Define `MovieItem` para resultados resumidos, `MovieSearchResponse` con lista, totales y páginas, y `MovieDetail` para información ampliada (género, dirección, actores, argumento, calificación IMDb, etc.). Campos opcionales toleran valores ausentes del proveedor.

#### `backend/app/schemas/favorite.py`

- `FavoriteCreate`: valida id IMDb, título, año, poster y nota opcional 1–10.
- `FavoriteUpdate`: acepta nota opcional entre 1 y 10.
- `FavoriteResponse`: devuelve id, propietario, datos de película, nota y fecha, y serializa desde el ORM.

#### `backend/app/schemas/health.py`

Declara `HealthResponse` (status, project, version). Actualmente los endpoints de health devuelven diccionarios y no especifican este response model.

### Servicios

#### `backend/app/services/__init__.py`

Inicializador vacío del paquete de servicios.

#### `backend/app/services/auth.py`

`create_user` busca username duplicado, lanza 400 si existe, hashea password, inserta, hace commit y refresh. `authenticate_user` busca username y verifica hash; retorna el usuario o `None`. La ruta login transforma `None` en un mismo error para usuario desconocido y contraseña incorrecta.

#### `backend/app/services/favorites.py`

- `get_user_favorites`: comienza filtrando por usuario; opcionalmente filtra título con `ILIKE` y nota mínima. Elige una columna de orden permitida mediante un mapa y aplica ascendente/descendente, poniendo notas nulas al final.
- `add_favorite`: comprueba duplicado para usuario + id IMDb, inserta y confirma. La comprobación previa da un error amigable en el caso normal, pero sin `UNIQUE` en DB tiene condición de carrera.
- `update_favorite_note`: busca por id de favorita **y** usuario; si no existe para ese dueño responde 404.
- `remove_favorite`: misma protección de dueño, borra y confirma.
- `remove_favorite_by_movie_id`: busca por propietario e id IMDb y borra.

#### `backend/app/services/omdb.py`

Es la integración con `https://www.omdbapi.com/`. Mantiene dos diccionarios en memoria: uno para búsquedas y otro para detalles. Cada entrada tiene marca temporal y datos; TTL es de 30 minutos. Las búsquedas normalizan el texto a minúsculas y la llave combina texto y página. El detalle usa el id IMDb.

En caché válida evita la llamada HTTP. Si la llamada es necesaria, usa `httpx.AsyncClient` con timeout de 10 segundos, envía la API key desde settings, y convierte la respuesta externa a schemas propios.

Errores: timeout → 504; error de conexión HTTP → 503; límite reportado por OMDb → 429; búsqueda sin coincidencias/“Too many results” en search → respuesta vacía 200; otros errores de búsqueda → 400; película no encontrada en detalle → 404. Si falta API key genera 500.

Limitaciones: caché no compartida entre procesos/instancias, no usa política LRU y `_set_in_cache` limpia todas las entradas cuando su tamaño ya supera 1000 antes de insertar. Las excepciones de estado HTTP de `raise_for_status()` no están capturadas como `RequestError` en todos los casos de respuestas HTTP no exitosas.

### Inicializadores de aplicación

#### `backend/app/__init__.py`

Inicializador vacío del paquete Python principal.

## 4. Frontend: descripción archivo por archivo

#### `frontend/index.html`

Documento base del navegador en español. Define metadatos básicos, título MoviesTech, el elemento `#root` donde React monta la aplicación y carga `/src/main.jsx` como módulo.

#### `frontend/src/main.jsx`

Punto de entrada de React. Crea el root DOM, monta `App` dentro de `React.StrictMode` e importa estilos globales de `index.css`.

#### `frontend/src/App.jsx`

Componente raíz. Usa el hook `useAuth`; mientras valida sesión muestra pantalla de carga. Si hay token y usuario muestra `HomePage`; si no, alterna entre login y registro con estado local `page`. Pasa funciones del hook a cada vista como props.

#### `frontend/src/hooks/useAuth.js`

Hook de autenticación. Mantiene usuario, token, loading y error. Inicializa token desde `localStorage`; al existir, solicita `/auth/me`; si falla elimina token y usuario. `login` llama login API y almacena token; `register` crea la cuenta; `logout` limpia estado y almacenamiento.

Implicación de seguridad: el JWT es legible por JavaScript en `localStorage`; un XSS con ejecución en el origen podría robarlo. Cambiar a cookies `httpOnly` implica ajustar servidor y cliente y revisar CSRF/SameSite.

#### `frontend/src/services/api.js`

Centraliza fetches y el manejo de respuestas. `API_BASE_URL` toma `VITE_API_URL` o `/api`. `request` envía fetch, extrae `detail` de errores JSON, lanza `Error`, devuelve null en 204 o decodifica JSON.

Funciones exportadas: health, registro, login form-urlencoded, `/auth/me`, búsqueda, detalles, listar favoritas con filtros query, crear favorito, actualizar nota, eliminar por id y eliminar por id IMDb. Las funciones protegidas adjuntan Bearer token.

#### `frontend/src/pages/LoginPage.jsx`

Formulario controlado de usuario/contraseña. Previene reload, maneja loading/error local y delegado, llama `onLogin`, y ofrece navegación a registro. No conoce directamente el servicio API.

#### `frontend/src/pages/RegisterPage.jsx`

Formulario controlado con usuario, contraseña y confirmación. Valida coincidencia y longitud mínima en cliente, llama `onRegister`, muestra éxito y vuelve al login tras 1.5 segundos. El backend valida nuevamente los límites definidos por Pydantic.

#### `frontend/src/pages/HomePage.jsx`

Vista principal autenticada. Controla pestaña (buscar/favoritos), búsqueda/página/resultados, estados de carga/error, favoritos y notificaciones. Al montar carga favoritos.

- `handleSearch`: solicita búsqueda, reemplaza resultados o los concatena al cargar más, evitando ids IMDb repetidos con `Set` y `.map()`/`.filter()`.
- `handlePageChange` y `handleLoadMore`: paginación y desplazamiento al inicio.
- `handleToggleFavorite`: alterna crear/eliminar según estado local. **Al crear envía `nota: 10` por defecto**, el valor hardcodeado mencionado en la guía.
- `handleUpdateNote`: llama API y actualiza el elemento correspondiente usando `map`.
- `handleRemoveFavoriteById`: elimina y actualiza estado.

Renderiza encabezado, usuario, logout, resultados con `MovieCard`, `FavoritesView`, paginación, errores, loading y toast.

#### `frontend/src/components/SearchBar.jsx`

Input controlado y formulario `onSubmit`; Enter y clic ejecutan búsqueda. Evita búsqueda vacía con `trim()` y deshabilita el botón durante carga. El botón de limpiar no envía formulario.

#### `frontend/src/components/MovieCard.jsx`

Presenta poster o fallback, tipo, título, año e id IMDb. Muestra badge de nota si se le pasa rating. El botón de favorito solo aparece cuando recibe `onToggleFavorite`, lo que permite reutilizar el componente en vistas de solo lectura. Maneja error de carga de poster ocultando imagen y mostrando fallback.

#### `frontend/src/components/FavoritesView.jsx`

Muestra estado de carga o vacío; si hay favoritas, presenta controles y tarjetas. Filtra localmente por texto, año/id IMDb y nota mínima, y ordena localmente por fecha/nota/año/título. `useMemo` recalcula lista derivada cuando cambian sus dependencias.

Permite editar nota (selector 1–10), guardar/cancelar y eliminar. Usa `key={fav.id}` para identidad estable en listas. Aunque `GET /favorites` también acepta filtros y orden, la pantalla actual no los manda al servidor: opera sobre favoritas ya descargadas.

#### `frontend/src/index.css`

Contiene estilos globales y de todas las vistas: reset y tipografía, contenedores de auth, botones y formularios, cabecera/tabs, búsqueda, tarjetas y grillas, estados vacío/loading/error, favoritos y toolbar, calificaciones, paginación, toast y media queries responsivas. No contiene lógica funcional.

#### `frontend/vite.config.js`

Configura plugin React, servidor accesible desde contenedor (`0.0.0.0`) en puerto 5173 y proxy `/api`. Target usa `process.env.VITE_API_URL` o `http://localhost:8000`; rewrite elimina `/api`. En Docker, `localhost` dentro del contenedor frontend apunta al propio contenedor, así que para que el proxy llegue al backend el entorno debe establecer un target resoluble (normalmente el nombre de servicio `backend`). Revisar esto junto con el `.env` efectivo antes de ejecutar.

#### `frontend/package.json`

Declara React/ReactDOM y dependencias de desarrollo Vite/plugin React. Scripts: `dev`, `build`, `preview`. No hay script de lint ni de tests frontend declarado.

#### `frontend/Dockerfile`

Usa Node 20 Alpine, instala dependencias desde `package.json`, copia frontend, expone 5173 y ejecuta Vite dev server. El comando es de desarrollo (`vite`), no un bundle servido por servidor de producción.

## 5. Base de datos e infraestructura

#### `database/schema.sql`

DDL para una base PostgreSQL vacía. Crea `users` y `favoritas`; incluye username `UNIQUE`, clave foránea con borrado en cascada, chequeo de nota de 1 a 10 e índices. No crea `UNIQUE(id_usuario, id_pelicula)`, de modo que la misma película puede tener más de una fila para el mismo usuario ante concurrencia o inserciones directas.

Docker ejecuta este script como inicialización de PostgreSQL cuando el volumen de datos se crea por primera vez. Si el volumen ya existe, los scripts de `/docker-entrypoint-initdb.d` no se vuelven a aplicar automáticamente; un cambio de schema requiere migración o intervención explícita.

#### `docker-compose.yml`

Define:

- `db`: PostgreSQL 16 Alpine, lee `backend/.env`, publica 5432, persiste en `postgres_data`, monta el SQL de inicialización y espera `pg_isready`.
- `backend`: construye `backend/`, publica 8000, lee el mismo env y espera que DB esté healthy.
- `frontend`: construye `frontend/`, publica 5173, también lee `backend/.env` y depende de backend.

El uso de un mismo `.env` para servicios distintos hace importante revisar nombres/valores: el frontend Vite necesita que el target del proxy sea alcanzable desde su contenedor; `localhost:8000` dentro del contenedor no identifica al contenedor `backend`.

#### `backend/Dockerfile`

Usa Python 3.12 slim, instala `requirements.txt`, copia backend, publica 8000 y lanza Uvicorn con `--reload`. Esa recarga y el servidor son configuración orientada al desarrollo.

#### `backend/requirements.txt`

Fija las dependencias Python: FastAPI/Uvicorn, SQLAlchemy/driver PostgreSQL, Pydantic y settings, JWT (`python-jose`), bcrypt/passlib, multipart para OAuth2 form, httpx para OMDb y pytest.

#### `.gitignore`

Ignora artefactos Python, entornos virtuales, `node_modules`, build de Vite, archivos `.env`, archivos de IDE, logs y resultados/caché de tests. Por ello las credenciales locales no están versionadas.

#### `README.md`

Describe objetivo, arquitectura, tecnologías, estructura, requisitos, variables y comandos Docker, además de endpoints de salud. Es orientación general; algunos detalles no coinciden con el código actual: llama a variables OMDb/JWT “fase futura” aunque ya se usan; menciona `.env.example` que no aparece en el inventario actual; dice que frontend muestra estado de conexión al backend, mientras `App` muestra login/registro; y presenta una estructura de carpetas orientativa.

## 6. Tests existentes

Los tests están en `backend/tests`; usan `TestClient` y reemplazan `get_db` por una sesión SQLite `:memory:` compartida en conexión (`StaticPool`). Esto prueba la integración de rutas, servicios y persistencia sin PostgreSQL.

#### `backend/tests/__init__.py`

Inicializador vacío del paquete de tests.

#### `backend/tests/test_auth.py`

Comprueba registro exitoso (incluye que no salga password/password_hash), duplicación de username, login válido/inválido y `/auth/me` con Bearer JWT. Usa fixture autouse para recrear tablas antes de cada test.

#### `backend/tests/test_favorites.py`

Registra/inicia usuario, crea varias favoritas, comprueba orden por nota, filtro mínimo, búsqueda textual y borrado por id IMDb. Es integración porque pasa por HTTP, servicios y DB de prueba. También recrea tablas por test.

#### `backend/tests/test_health.py`

Comprueba `GET /` y `/health`, estado HTTP y algunos valores JSON. No requiere DB de test.

#### `backend/tests/test_movies.py`

Comprueba que búsqueda sin token devuelve 401, que una búsqueda exitosa usa caché (mock de llamada HTTP y comparación de call_count), y que detalles se serializan correctamente (mock del servicio). Se limpian manualmente caché de búsqueda en su test de cache. No hay una suite amplia de todos los errores de OMDb ni test de conexión real.

No se declara una suite de tests frontend. No ejecuté tests como parte de este análisis; el documento se basa en lectura estática de los archivos.

## 7. Puntos importantes y discrepancias comprobadas

1. **Favoritos duplicados:** `services/favorites.py` revisa duplicados, pero ni el modelo ni `database/schema.sql` aplican unicidad compuesta. Solución robusta: constraint `UNIQUE(id_usuario, id_pelicula)` y manejo de la violación en el backend.
2. **Nota inicial:** `HomePage.jsx` crea favoritas con `nota: 10`; es un comportamiento de producto, no una regla inevitable del backend.
3. **JWT:** se almacena en `localStorage`, con riesgo de lectura por JavaScript ante XSS. Cookie `httpOnly` requiere modificar contrato cliente-servidor y considerar CSRF.
4. **CORS frente a proxy:** para solicitudes que el navegador hace al mismo origen Vite y que Vite reenvía en servidor, normalmente CORS no participa. Sí aplica si frontend llama desde navegador a otro origen directamente, por ejemplo despliegue separado.
5. **Filtros de favoritos:** API admite filtros/orden del lado servidor; UI actual filtra y ordena localmente después de descargar la lista completa.
6. **Caché OMDb:** TTL de 30 min, separado para búsqueda/detalle, en memoria por proceso; vaciado completo al rebasar umbral.
7. **Base de datos:** el SQL se ejecuta al inicializar volumen vacío; editar ORM o SQL no migra una base existente. El repositorio no incluye herramienta/migraciones Alembic.
8. **Docker/proxy:** revisar `VITE_API_URL` para que el contenedor frontend apunte a `backend:8000`, no a su propio `localhost:8000`.
9. **Variables locales:** `backend/.env` se requiere y se espera por Compose, pero no está versionado; sus valores efectivos dependen del entorno de la máquina.
10. **Tests:** son útiles pruebas de integración, pero `test_movies.py` no recrea explícitamente tablas antes de cada test como los otros módulos; también depende del estado de cachés globales.

## 8. Preguntas de entrevista que este código permite contestar

- ¿Qué diferencia hay entre router, servicio, modelo y schema?
- ¿Cómo funciona `Depends(get_current_user)` y qué contiene `sub`?
- ¿Por qué registro usa JSON y login formulario URL encoded?
- ¿Qué hace el proxy de Vite y cuándo aplica CORS?
- ¿Qué evita el filtro por propietario y qué problema queda sin constraint único?
- ¿Cómo se mapean errores de timeout, conexión y cuota de OMDb?
- ¿Qué devuelve `.map()` y por qué una lista React necesita `key` estable?
- ¿Cómo se prueba FastAPI con `dependency_overrides` y SQLite?
- ¿Qué cambio de base necesita una migración?
- ¿Qué limitaciones tiene el caché y cuáles son las prioridades de mejora?

## 9. Mapa rápido para navegar el código

| Tema | Archivos principales |
|---|---|
| Arranque/routers/CORS | `backend/app/main.py`, `backend/app/api/` |
| Autenticación | `frontend/src/hooks/useAuth.js`, `frontend/src/pages/LoginPage.jsx`, `backend/app/api/auth.py`, `backend/app/services/auth.py`, `backend/app/core/security.py` |
| Búsqueda OMDb | `frontend/src/pages/HomePage.jsx`, `frontend/src/services/api.js`, `backend/app/api/movies.py`, `backend/app/services/omdb.py` |
| Favoritos | `frontend/src/components/FavoritesView.jsx`, `backend/app/api/favorites.py`, `backend/app/services/favorites.py` |
| Contratos de datos | `backend/app/schemas/` |
| Persistencia | `backend/app/models/`, `backend/app/db/session.py`, `database/schema.sql` |
| Docker/configuración | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/vite.config.js`, `backend/app/core/config.py` |
| Pruebas | `backend/tests/` |
