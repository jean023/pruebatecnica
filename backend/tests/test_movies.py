from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base, get_db
from app.main import app
from app.schemas.movie import MovieDetail, MovieItem, MovieSearchResponse
from app.services.omdb import _search_cache, _detail_cache

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


def get_authenticated_token():
    client.post(
        "/auth/register",
        json={"username": "moviesearcher2", "password": "password123"},
    )
    login_res = client.post(
        "/auth/login",
        data={"username": "moviesearcher2", "password": "password123"},
    )
    return login_res.json()["access_token"]


def test_search_movies_unauthorized():
    response = client.get("/movies/search?q=Batman")
    assert response.status_code == 401


@patch("app.services.omdb.httpx.AsyncClient.get")
def test_search_movies_with_cache(mock_get):
    _search_cache.clear()
    
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "Response": "True",
        "Search": [
            {
                "Title": "The Matrix",
                "Year": "1999",
                "imdbID": "tt0133093",
                "Type": "movie",
                "Poster": "https://example.com/matrix.jpg",
            }
        ],
        "totalResults": "1",
    }
    mock_response.raise_for_status = lambda: None
    mock_get.return_value = mock_response

    token = get_authenticated_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Primera petición: va a la API externa
    res1 = client.get("/movies/search?q=matrix", headers=headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert len(data1["movies"]) == 1
    assert data1["movies"][0]["title"] == "The Matrix"
    assert mock_get.call_count == 1

    # Segunda petición idéntica: debe responder desde la caché en memoria (sin llamar a la API externa)
    res2 = client.get("/movies/search?q=matrix", headers=headers)
    assert res2.status_code == 200
    assert res2.json() == data1
    assert mock_get.call_count == 1  # No aumentó el call_count!


@patch("app.api.movies.get_movie_details", new_callable=AsyncMock)
def test_movie_details_success(mock_details):
    mock_details.return_value = MovieDetail(
        imdb_id="tt0372784",
        title="Batman Begins",
        year="2005",
        director="Christopher Nolan",
        genre="Action, Crime, Drama",
        plot="After training with his mentor, Batman begins his fight to free crime-ridden Gotham City from corruption.",
        poster="https://example.com/poster.jpg",
        imdb_rating="8.2",
    )

    token = get_authenticated_token()
    response = client.get(
        "/movies/tt0372784",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Batman Begins"
    assert data["director"] == "Christopher Nolan"
