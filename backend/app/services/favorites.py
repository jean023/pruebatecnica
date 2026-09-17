from fastapi import HTTPException, status
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session

from app.models.favorite import Favorite
from app.schemas.favorite import FavoriteCreate, FavoriteUpdate


def get_user_favorites(
    db: Session,
    user_id: int,
    sort_by: str = "fecha_agregado",
    order: str = "desc",
    min_nota: int | None = None,
    q: str | None = None,
) -> list[Favorite]:
    query = db.query(Favorite).filter(Favorite.id_usuario == user_id)

    # Filtro por búsqueda de texto
    if q and q.strip():
        query = query.filter(Favorite.titulo.ilike(f"%{q.strip()}%"))

    # Filtro por nota mínima
    if min_nota is not None:
        query = query.filter(Favorite.nota >= min_nota)

    # Ordenamiento
    sort_column_map = {
        "fecha_agregado": Favorite.fecha_agregado,
        "nota": Favorite.nota,
        "anio": Favorite.anio,
        "titulo": Favorite.titulo,
    }
    sort_column = sort_column_map.get(sort_by, Favorite.fecha_agregado)

    if order.lower() == "asc":
        # Para nota asc, colocar nulos al final
        if sort_by == "nota":
            query = query.order_by(Favorite.nota.asc().nullslast())
        else:
            query = query.order_by(asc(sort_column))
    else:
        if sort_by == "nota":
            query = query.order_by(Favorite.nota.desc().nullslast())
        else:
            query = query.order_by(desc(sort_column))

    return query.all()


def add_favorite(db: Session, user_id: int, favorite_data: FavoriteCreate) -> Favorite:
    existing = (
        db.query(Favorite)
        .filter(
            Favorite.id_usuario == user_id,
            Favorite.id_pelicula == favorite_data.id_pelicula,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La película ya se encuentra en tu lista de favoritas",
        )

    favorite = Favorite(
        id_usuario=user_id,
        id_pelicula=favorite_data.id_pelicula,
        titulo=favorite_data.titulo,
        anio=favorite_data.anio,
        poster=favorite_data.poster,
        nota=favorite_data.nota,
    )
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return favorite


def update_favorite_note(
    db: Session, user_id: int, favorite_id: int, update_data: FavoriteUpdate
) -> Favorite:
    favorite = (
        db.query(Favorite)
        .filter(Favorite.id == favorite_id, Favorite.id_usuario == user_id)
        .first()
    )
    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Película favorita no encontrada",
        )

    favorite.nota = update_data.nota
    db.commit()
    db.refresh(favorite)
    return favorite


def remove_favorite(db: Session, user_id: int, favorite_id: int) -> None:
    favorite = (
        db.query(Favorite)
        .filter(Favorite.id == favorite_id, Favorite.id_usuario == user_id)
        .first()
    )
    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Película favorita no encontrada",
        )

    db.delete(favorite)
    db.commit()


def remove_favorite_by_movie_id(db: Session, user_id: int, id_pelicula: str) -> None:
    favorite = (
        db.query(Favorite)
        .filter(Favorite.id_usuario == user_id, Favorite.id_pelicula == id_pelicula)
        .first()
    )
    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Película no encontrada en favoritas",
        )

    db.delete(favorite)
    db.commit()
