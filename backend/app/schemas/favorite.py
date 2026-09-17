from datetime import datetime
from pydantic import BaseModel, Field


class FavoriteCreate(BaseModel):
    id_pelicula: str = Field(..., min_length=1, max_length=20)
    titulo: str = Field(..., min_length=1, max_length=500)
    anio: str | None = Field(None, max_length=10)
    poster: str | None = Field(None, max_length=1000)
    nota: int | None = Field(None, ge=1, le=10, description="Calificación personal del 1 al 10")


class FavoriteUpdate(BaseModel):
    nota: int | None = Field(None, ge=1, le=10, description="Calificación personal del 1 al 10")


class FavoriteResponse(BaseModel):
    id: int
    id_usuario: int
    id_pelicula: str
    titulo: str
    anio: str | None = None
    poster: str | None = None
    nota: int | None = None
    fecha_agregado: datetime

    class Config:
        from_attributes = True
