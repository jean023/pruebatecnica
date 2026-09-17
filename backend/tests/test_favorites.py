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


def get_authenticated_token(username="favuser_bonus"):
    client.post(
        "/auth/register",
        json={"username": username, "password": "password123"},
    )
    login_res = client.post(
        "/auth/login",
        data={"username": username, "password": "password123"},
    )
    return login_res.json()["access_token"]


def test_favorites_crud_and_sorting_filtering():
    token = get_authenticated_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Agregar varias películas con diferentes notas y años
    m1 = {"id_pelicula": "tt1", "titulo": "Avatar", "anio": "2009", "nota": 7}
    m2 = {"id_pelicula": "tt2", "titulo": "Inception", "anio": "2010", "nota": 10}
    m3 = {"id_pelicula": "tt3", "titulo": "Interstellar", "anio": "2014", "nota": 9}

    client.post("/favorites", json=m1, headers=headers)
    client.post("/favorites", json=m2, headers=headers)
    client.post("/favorites", json=m3, headers=headers)

    # Ordenar por nota DESC (debe ser: Inception [10], Interstellar [9], Avatar [7])
    res_rating_desc = client.get("/favorites?sort_by=nota&order=desc", headers=headers)
    assert res_rating_desc.status_code == 200
    movies_by_rating = res_rating_desc.json()
    assert movies_by_rating[0]["titulo"] == "Inception"
    assert movies_by_rating[1]["titulo"] == "Interstellar"
    assert movies_by_rating[2]["titulo"] == "Avatar"

    # Filtrar por nota mínima >= 9 (debe traer solo Inception e Interstellar)
    res_min_note = client.get("/favorites?min_nota=9", headers=headers)
    assert res_min_note.status_code == 200
    assert len(res_min_note.json()) == 2

    # Filtrar por búsqueda de texto "Avatar"
    res_search = client.get("/favorites?q=avatar", headers=headers)
    assert res_search.status_code == 200
    assert len(res_search.json()) == 1
    assert res_search.json()[0]["titulo"] == "Avatar"

    # Eliminar película
    del_res = client.delete("/favorites/movie/tt1", headers=headers)
    assert del_res.status_code == 204
    assert len(client.get("/favorites", headers=headers).json()) == 2
