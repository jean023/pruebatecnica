from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.favorite import FavoriteCreate, FavoriteResponse, FavoriteUpdate
from app.services.favorites import (
    add_favorite,
    get_user_favorites,
    remove_favorite,
    remove_favorite_by_movie_id,
    update_favorite_note,
)

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=list[FavoriteResponse])
def list_favorites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista todas las películas favoritas del usuario autenticado."""
    return get_user_favorites(db=db, user_id=current_user.id)


@router.post("", response_model=FavoriteResponse, status_code=status.HTTP_201_CREATED)
def create_favorite(
    favorite_data: FavoriteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Agrega una película a la lista de favoritas del usuario."""
    return add_favorite(db=db, user_id=current_user.id, favorite_data=favorite_data)


@router.patch("/{favorite_id}", response_model=FavoriteResponse)
def update_note(
    favorite_id: int,
    update_data: FavoriteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Actualiza la nota/calificación personal (1-10) de una favorita."""
    return update_favorite_note(
        db=db,
        user_id=current_user.id,
        favorite_id=favorite_id,
        update_data=update_data,
    )


@router.delete("/{favorite_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_favorite(
    favorite_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Elimina una película de favoritas por el ID del registro."""
    remove_favorite(db=db, user_id=current_user.id, favorite_id=favorite_id)


@router.delete("/movie/{imdb_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_favorite_by_movie_id(
    imdb_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Elimina una película de favoritas por su imdbID."""
    remove_favorite_by_movie_id(db=db, user_id=current_user.id, id_pelicula=imdb_id)
