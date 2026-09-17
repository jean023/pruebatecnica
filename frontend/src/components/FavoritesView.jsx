import { useState } from 'react';

function FavoritesView({
  favorites,
  onUpdateNote,
  onRemoveFavorite,
  onSwitchToSearch,
  loading = false,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editRating, setEditRating] = useState(10);
  const [savingNote, setSavingNote] = useState(false);

  const startEdit = (fav) => {
    setEditingId(fav.id);
    setEditRating(fav.nota || 10);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveNote = async (favId) => {
    setSavingNote(true);
    try {
      await onUpdateNote(favId, Number(editRating));
      setEditingId(null);
    } catch (err) {
      alert(`Error al guardar calificación: ${err.message}`);
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="search-loading-state">
        <div className="spinner"></div>
        <p>Cargando tus películas favoritas...</p>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="empty-results-state">
        <span style={{ fontSize: '3.5rem' }}>⭐</span>
        <h3>Aún no tienes películas favoritas</h3>
        <p>
          Explora y busca películas en el catálogo para agregarlas a tu lista personal y calificarlas.
        </p>
        <button
          onClick={onSwitchToSearch}
          className="search-button"
          style={{ marginTop: '1rem' }}
        >
          🔍 Ir al Buscador de Películas
        </button>
      </div>
    );
  }

  return (
    <div className="favorites-container">
      <div className="results-meta">
        <span>
          Tienes <strong>{favorites.length}</strong> película{favorites.length !== 1 ? 's' : ''} en tu lista de favoritas
        </span>
      </div>

      <div className="favorites-grid">
        {favorites.map((fav) => {
          const isEditing = editingId === fav.id;
          const formattedDate = new Date(fav.fecha_agregado).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          return (
            <div key={fav.id} className="favorite-card">
              <div className="favorite-poster-wrapper">
                {fav.poster ? (
                  <img
                    src={fav.poster}
                    alt={fav.titulo}
                    className="favorite-poster"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div
                  className="movie-poster-fallback"
                  style={{ display: fav.poster ? 'none' : 'flex' }}
                >
                  <span>🎬</span>
                </div>
              </div>

              <div className="favorite-details">
                <div className="favorite-header-row">
                  <div>
                    <h3 className="favorite-title">{fav.titulo}</h3>
                    <div className="favorite-meta">
                      <span>{fav.anio || 'N/A'}</span>
                      <span>•</span>
                      <span className="movie-imdb-id">{fav.id_pelicula}</span>
                    </div>
                  </div>
                  <button
                    className="delete-favorite-btn"
                    onClick={() => onRemoveFavorite(fav.id)}
                    title="Eliminar de favoritas"
                  >
                    🗑️
                  </button>
                </div>

                <div className="favorite-rating-section">
                  <span className="rating-label">Calificación personal:</span>

                  {isEditing ? (
                    <div className="rating-edit-box">
                      <select
                        value={editRating}
                        onChange={(e) => setEditRating(e.target.value)}
                        className="rating-select"
                        disabled={savingNote}
                      >
                        {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            ⭐ {n} / 10
                          </option>
                        ))}
                      </select>
                      <button
                        className="save-note-btn"
                        onClick={() => handleSaveNote(fav.id)}
                        disabled={savingNote}
                      >
                        {savingNote ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button
                        className="cancel-note-btn"
                        onClick={cancelEdit}
                        disabled={savingNote}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="rating-display-row">
                      {fav.nota ? (
                        <span className="current-rating-badge">
                          ⭐ <strong>{fav.nota}</strong> / 10
                        </span>
                      ) : (
                        <span className="no-rating-text">Sin calificar</span>
                      )}
                      <button
                        className="edit-rating-btn"
                        onClick={() => startEdit(fav)}
                      >
                        ✏️ {fav.nota ? 'Cambiar nota' : 'Calificar'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="favorite-footer">
                  <span className="added-date">Agregada el {formattedDate}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FavoritesView;
