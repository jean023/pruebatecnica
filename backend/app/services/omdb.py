import math
import httpx
from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.movie import MovieDetail, MovieItem, MovieSearchResponse

OMDB_API_BASE = "https://www.omdbapi.com/"


async def search_movies(query: str, page: int = 1) -> MovieSearchResponse:
    if not query or not query.strip():
        return MovieSearchResponse(movies=[], total_results=0, page=page, total_pages=0)

    api_key = settings.OMDB_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OMDb API key no configurada. Por favor define OMDB_API_KEY en tu .env o docker-compose.",
        )

    params = {
        "apikey": api_key,
        "s": query.strip(),
        "page": page,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(OMDB_API_BASE, params=params)
            response.raise_for_status()
            data = response.json()
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error al comunicarse con el servicio OMDb: {str(exc)}",
        )

    if data.get("Response") == "False":
        error_msg = data.get("Error", "No se encontraron películas")
        if "Movie not found" in error_msg or "Too many results" in error_msg:
            return MovieSearchResponse(movies=[], total_results=0, page=page, total_pages=0)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OMDb Error: {error_msg}",
        )

    raw_movies = data.get("Search", [])
    total_results = int(data.get("totalResults", 0))
    total_pages = math.ceil(total_results / 10) if total_results > 0 else 0

    movies = [
        MovieItem(
            imdb_id=item.get("imdbID", ""),
            title=item.get("Title", "Sin título"),
            year=item.get("Year"),
            poster=item.get("Poster") if item.get("Poster") != "N/A" else None,
            type=item.get("Type", "movie"),
        )
        for item in raw_movies
        if item.get("imdbID")
    ]

    return MovieSearchResponse(
        movies=movies,
        total_results=total_results,
        page=page,
        total_pages=total_pages,
    )


async def get_movie_details(imdb_id: str) -> MovieDetail:
    api_key = settings.OMDB_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OMDb API key no configurada.",
        )

    params = {
        "apikey": api_key,
        "i": imdb_id.strip(),
        "plot": "full",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(OMDB_API_BASE, params=params)
            response.raise_for_status()
            data = response.json()
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error al consultar detalles en OMDb: {str(exc)}",
        )

    if data.get("Response") == "False":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=data.get("Error", "Película no encontrada"),
        )

    return MovieDetail(
        imdb_id=data.get("imdbID", imdb_id),
        title=data.get("Title", "Sin título"),
        year=data.get("Year"),
        rated=data.get("Rated"),
        released=data.get("Released"),
        runtime=data.get("Runtime"),
        genre=data.get("Genre"),
        director=data.get("Director"),
        actors=data.get("Actors"),
        plot=data.get("Plot"),
        poster=data.get("Poster") if data.get("Poster") != "N/A" else None,
        imdb_rating=data.get("imdbRating"),
        type=data.get("Type", "movie"),
    )
