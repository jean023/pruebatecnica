from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base, get_db
from app.main import app
from app.schemas.movie import MovieDetail, MovieItem, MovieSearchResponse

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
        json={"username": "moviesearcher", "password": "password123"},
    )
    login_res = client.post(
        "/auth/login",
        data={"username": "moviesearcher", "password": "password123"},
    )
    return login_res.json()["access_token"]


def test_search_movies_unauthorized():
    response = client.get("/movies/search?q=Batman")
    assert response.status_code == 401


@patch("app.api.movies.search_movies", new_callable=AsyncMock)
def test_search_movies_success(mock_search):
    mock_search.return_value = MovieSearchResponse(
        movies=[
            MovieItem(
                imdb_id="tt0372784",
                title="Batman Begins",
                year="2005",
                poster="https://example.com/poster.jpg",
                type="movie",
            )
        ],
        total_results=1,
        page=1,
        total_pages=1,
    )

    token = get_authenticated_token()
    response = client.get(
        "/movies/search?q=Batman",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["movies"]) == 1
    assert data["movies"][0]["title"] == "Batman Begins"
    assert data["total_results"] == 1


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
