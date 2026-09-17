from pydantic import BaseModel, Field


class MovieItem(BaseModel):
    imdb_id: str
    title: str
    year: str | None = None
    poster: str | None = None
    type: str | None = "movie"


class MovieSearchResponse(BaseModel):
    movies: list[MovieItem] = Field(default_factory=list)
    total_results: int = 0
    page: int = 1
    total_pages: int = 0


class MovieDetail(BaseModel):
    imdb_id: str
    title: str
    year: str | None = None
    rated: str | None = None
    released: str | None = None
    runtime: str | None = None
    genre: str | None = None
    director: str | None = None
    actors: str | None = None
    plot: str | None = None
    poster: str | None = None
    imdb_rating: str | None = None
    type: str | None = "movie"
