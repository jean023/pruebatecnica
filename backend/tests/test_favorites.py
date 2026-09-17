import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base, get_db
from app.main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
Base.metadata.create_all(bind=engine)

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def get_authenticated_token(username="favuser"):
    client.post(
        "/auth/register",
        json={"username": username, "password": "password123"},
    )
    login_res = client.post(
        "/auth/login",
        data={"username": username, "password": "password123"},
    )
    return login_res.json()["access_token"]


def test_favorites_crud_flow():
    token = get_authenticated_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Listar inicialmente (vacío)
    res = client.get("/favorites", headers=headers)
    assert res.status_code == 200
    assert res.json() == []

    # 2. Agregar a favoritas
    movie_payload = {
        "id_pelicula": "tt0372784",
        "titulo": "Batman Begins",
        "anio": "2005",
        "poster": "https://example.com/batman.jpg",
        "nota": 9,
    }
    create_res = client.post("/favorites", json=movie_payload, headers=headers)
    assert create_res.status_code == 201
    created_fav = create_res.json()
    assert created_fav["titulo"] == "Batman Begins"
    assert created_fav["nota"] == 9
    fav_id = created_fav["id"]

    # 3. Evitar duplicados
    dup_res = client.post("/favorites", json=movie_payload, headers=headers)
    assert dup_res.status_code == 400

    # 4. Actualizar nota / calificación (1 a 10)
    patch_res = client.patch(f"/favorites/{fav_id}", json={"nota": 10}, headers=headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["nota"] == 10

    # 5. Listar favoritas (debe tener 1)
    list_res = client.get("/favorites", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # 6. Eliminar por movie imdb_id
    del_res = client.delete("/favorites/movie/tt0372784", headers=headers)
    assert del_res.status_code == 204

    # 7. Verificar que quedó vacío
    list_res2 = client.get("/favorites", headers=headers)
    assert list_res2.json() == []


def test_invalid_rating_rejected():
    token = get_authenticated_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Nota inválida (> 10)
    res = client.post(
        "/favorites",
        json={"id_pelicula": "tt123", "titulo": "Test", "nota": 15},
        headers=headers,
    )
    assert res.status_code == 422
