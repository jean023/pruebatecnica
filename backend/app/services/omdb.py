import math
import time
import httpx
from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.movie import MovieDetail, MovieItem, MovieSearchResponse

OMDB_API_BASE = "https://www.omdbapi.com/"
CACHE_TTL_SECONDS = 1800  # 30 minutos de caché

# Caché en memoria: { cache_key: (timestamp, data) }
_search_cache: dict[str, tuple[float, MovieSearchResponse]] = {}
_detail_cache: dict[str, tuple[float, MovieDetail]] = {}


def _get_from_cache(cache_dict: dict, key: str):
    if key in cache_dict:
        timestamp, data = cache_dict[key]
        if time.time() - timestamp < CACHE_TTL_SECONDS:
            return data
        else:
            del cache_dict[key]
    return None


def _set_in_cache(cache_dict: dict, key: str, data):
    # Limitar tamaño de caché a 1000 entradas para control de memoria
    if len(cache_dict) > 1000:
        cache_dict.clear()
    cache_dict[key] = (time.time(), data)


async def search_movies(query: str, page: int = 1) -> MovieSearchResponse:
    clean_query = query.strip().lower() if query else ""
    if not clean_query:
        return MovieSearchResponse(movies=[], total_results=0, page=page, total_pages=0)

    cache_key = f"{clean_query}:{page}"
    cached_result = _get_from_cache(_search_cache, cache_key)
    if cached_result:
        return cached_result

    api_key = settings.OMDB_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OMDb API key no configurada. Por favor define OMDB_API_KEY en tu .env o docker-compose.",
        )

    params = {
        "apikey": api_key,
        "s": clean_query,
        "page": page,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(OMDB_API_BASE, params=params)
            response.raise_for_status()
            data = response.json()
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="El servicio OMDb tardó demasiado en responder. Por favor intenta nuevamente.",
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error de conexión con el servicio OMDb: {str(exc)}",
        )

    if data.get("Response") == "False":
        error_msg = data.get("Error", "No se encontraron películas")

        if "Request limit reached" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Se ha alcanzado el límite diario de peticiones de la API de OMDb. Por favor intenta más tarde.",
            )

        if "Movie not found" in error_msg or "Too many results" in error_msg:
            res = MovieSearchResponse(movies=[], total_results=0, page=page, total_pages=0)
            _set_in_cache(_search_cache, cache_key, res)
            return res

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

    result = MovieSearchResponse(
        movies=movies,
        total_results=total_results,
        page=page,
        total_pages=total_pages,
    )
    _set_in_cache(_search_cache, cache_key, result)
    return result


async def get_movie_details(imdb_id: str) -> MovieDetail:
    clean_id = imdb_id.strip()
    cached_detail = _get_from_cache(_detail_cache, clean_id)
    if cached_detail:
        return cached_detail

    api_key = settings.OMDB_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OMDb API key no configurada.",
        )

    params = {
        "apikey": api_key,
        "i": clean_id,
        "plot": "full",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(OMDB_API_BASE, params=params)
            response.raise_for_status()
            data = response.json()
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="El servicio OMDb tardó demasiado en responder.",
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error al consultar detalles en OMDb: {str(exc)}",
        )

    if data.get("Response") == "False":
        error_msg = data.get("Error", "Película no encontrada")
        if "Request limit reached" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Límite de peticiones de OMDb alcanzado.",
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_msg,
        )

    detail = MovieDetail(
        imdb_id=data.get("imdbID", clean_id),
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
    _set_in_cache(_detail_cache, clean_id, detail)
    return detail
