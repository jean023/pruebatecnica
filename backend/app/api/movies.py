from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user
from app.models.user import User
from app.schemas.movie import MovieDetail, MovieSearchResponse
from app.services.omdb import get_movie_details, search_movies

router = APIRouter(prefix="/movies", tags=["movies"])


@router.get("/search", response_model=MovieSearchResponse)
async def search(
    q: str = Query(..., min_length=1, description="Texto de búsqueda para títulos de películas"),
    page: int = Query(1, ge=1, le=100, description="Número de página de resultados"),
    current_user: User = Depends(get_current_user),
):
    """Busca películas en la API de OMDb (requiere autenticación)."""
    return await search_movies(query=q, page=page)


@router.get("/{imdb_id}", response_model=MovieDetail)
async def details(
    imdb_id: str,
    current_user: User = Depends(get_current_user),
):
    """Obtiene los detalles completos de una película por su imdbID (requiere autenticación)."""
    return await get_movie_details(imdb_id=imdb_id)
