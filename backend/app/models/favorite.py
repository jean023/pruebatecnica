from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, SmallInteger, func
from sqlalchemy.orm import relationship

from app.db.session import Base


class Favorite(Base):
    __tablename__ = "favoritas"

    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    id_pelicula = Column(String(20), nullable=False)
    titulo = Column(String(500), nullable=False)
    anio = Column(String(10), nullable=True)
    poster = Column(String(1000), nullable=True)
    nota = Column(SmallInteger, nullable=True)
    fecha_agregado = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="favorites")

    def __repr__(self):
        return f"<Favorite(id={self.id}, titulo='{self.titulo}')>"
