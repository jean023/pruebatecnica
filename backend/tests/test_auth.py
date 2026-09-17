import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base, get_db
from app.main import app

# SQLite en memoria para tests aislados
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


def test_register_user_success():
    response = client.post(
        "/auth/register",
        json={"username": "testuser", "password": "password123"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "testuser"
    assert "id" in data
    assert "password" not in data
    assert "password_hash" not in data


def test_register_duplicate_username_fails():
    client.post(
        "/auth/register",
        json={"username": "duplicateuser", "password": "password123"},
    )
    response = client.post(
        "/auth/register",
        json={"username": "duplicateuser", "password": "password456"},
    )
    assert response.status_code == 400
    assert "ya está registrado" in response.json()["detail"]


def test_login_success():
    client.post(
        "/auth/register",
        json={"username": "loginuser", "password": "securepassword"},
    )
    response = client.post(
        "/auth/login",
        data={"username": "loginuser", "password": "securepassword"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_password():
    client.post(
        "/auth/register",
        json={"username": "wrongpassuser", "password": "securepassword"},
    )
    response = client.post(
        "/auth/login",
        data={"username": "wrongpassuser", "password": "wrongpassword"},
    )
    assert response.status_code == 401


def test_get_current_user_me():
    client.post(
        "/auth/register",
        json={"username": "meuser", "password": "securepassword"},
    )
    login_res = client.post(
        "/auth/login",
        data={"username": "meuser", "password": "securepassword"},
    )
    token = login_res.json()["access_token"]

    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "meuser"
