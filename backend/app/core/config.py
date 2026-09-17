from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "MoviesTech"
    VERSION: str = "0.1.0"

    DATABASE_URL: str = "postgresql://moviestech_user:moviestech_pass@db:5432/moviestech"

    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://frontend:5173"]

    # Placeholders para fases futuras
    JWT_SECRET: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 30
    OMDB_API_KEY: str = "2e5d578c"

    class Config:
        env_file = ".env"


settings = Settings()
