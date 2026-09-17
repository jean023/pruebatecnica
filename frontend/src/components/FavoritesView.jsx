import { useState, useMemo } from 'react';

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

  // Estados de filtros y orden
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState('fecha_agregado_desc');
  const [minRatingFilter, setMinRatingFilter] = useState('all');

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

  // Procesamiento local de filtrado y ordenamiento en tiempo real
  const processedFavorites = useMemo(() => {
    let result = [...favorites];

    // Filtrar por texto
    if (filterText.trim()) {
      const q = filterText.trim().toLowerCase();
      result = result.filter(
        (f) =>
          f.titulo.toLowerCase().includes(q) ||
          (f.anio && f.anio.includes(q)) ||
          f.id_pelicula.toLowerCase().includes(q)
      );
    }

    // Filtrar por nota mínima
    if (minRatingFilter !== 'all') {
      const min = Number(minRatingFilter);
      result = result.filter((f) => (f.nota || 0) >= min);
    }

    // Ordenar
    result.sort((a, b) => {
      switch (sortBy) {
        case 'nota_desc':
          return (b.nota || 0) - (a.nota || 0);
        case 'nota_asc':
          return (a.nota || 0) - (b.nota || 0);
        case 'anio_desc':
          return (parseInt(b.anio, 10) || 0) - (parseInt(a.anio, 10) || 0);
        case 'anio_asc':
          return (parseInt(a.anio, 10) || 0) - (parseInt(b.anio, 10) || 0);
        case 'titulo_asc':
          return a.titulo.localeCompare(b.titulo);
        case 'titulo_desc':
          return b.titulo.localeCompare(a.titulo);
        case 'fecha_agregado_asc':
          return new Date(a.fecha_agregado) - new Date(b.fecha_agregado);
        case 'fecha_agregado_desc':
        default:
          return new Date(b.fecha_agregado) - new Date(a.fecha_agregado);
      }
    });

    return result;
  }, [favorites, filterText, sortBy, minRatingFilter]);

  if (loading) {
    return (
      <div className="search-loading-state">
        <div className="spinner"></div>
        <p>Cargando lista de favoritas...</p>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="empty-results-state">
        <h3>Aún no tienes películas favoritas</h3>
        <p>
          Busca películas en el catálogo para agregarlas a tu lista personal y calificarlas.
        </p>
        <button
          onClick={onSwitchToSearch}
          className="search-button"
          style={{ marginTop: '1rem' }}
        >
          Ir al Buscador
        </button>
      </div>
    );
  }

  return (
    <div className="favorites-container">
      {/* Barra de Filtros y Ordenamiento */}
      <div className="favorites-toolbar">
        <div className="filter-search-box">
          <input
            type="text"
            placeholder="Filtrar por título o año..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="filter-search-input"
          />
          {filterText && (
            <button
              type="button"
              onClick={() => setFilterText('')}
              className="filter-clear-btn"
            >
              ✕
            </button>
          )}
        </div>

        <div className="filter-selects-group">
          <div className="filter-select-wrapper">
            <label htmlFor="sort-select">Ordenar por:</label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="toolbar-select"
            >
              <option value="fecha_agregado_desc">Más recientes primero</option>
              <option value="fecha_agregado_asc">Más antiguas primero</option>
              <option value="nota_desc">Mayor calificación</option>
              <option value="nota_asc">Menor calificación</option>
              <option value="anio_desc">Año (más reciente)</option>
              <option value="anio_asc">Año (más antiguo)</option>
              <option value="titulo_asc">Título (A - Z)</option>
              <option value="titulo_desc">Título (Z - A)</option>
            </select>
          </div>

          <div className="filter-select-wrapper">
            <label htmlFor="rating-filter">Calificación mínima:</label>
            <select
              id="rating-filter"
              value={minRatingFilter}
              onChange={(e) => setMinRatingFilter(e.target.value)}
              className="toolbar-select"
            >
              <option value="all">Todas las notas</option>
              <option value="9">Nota 9 o superior</option>
              <option value="8">Nota 8 o superior</option>
              <option value="7">Nota 7 o superior</option>
              <option value="5">Nota 5 o superior</option>
            </select>
          </div>
        </div>
      </div>

      <div className="results-meta">
        <span>
          Mostrando <strong>{processedFavorites.length}</strong> de <strong>{favorites.length}</strong> película{favorites.length !== 1 ? 's' : ''} favorita{favorites.length !== 1 ? 's' : ''}
        </span>
      </div>

      {processedFavorites.length === 0 ? (
        <div className="empty-filter-state">
          <p>Ninguna película coincide con los filtros aplicados.</p>
          <button
            onClick={() => {
              setFilterText('');
              setMinRatingFilter('all');
            }}
            className="reset-filters-btn"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="favorites-grid">
          {processedFavorites.map((fav) => {
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
                    <span>Sin imagen</span>
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
                      Eliminar
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
                              Nota {n} / 10
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
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="rating-display-row">
                        {fav.nota ? (
                          <span className="current-rating-badge">
                            Nota: <strong>{fav.nota}</strong> / 10
                          </span>
                        ) : (
                          <span className="no-rating-text">Sin calificar</span>
                        )}
                        <button
                          className="edit-rating-btn"
                          onClick={() => startEdit(fav)}
                        >
                          {fav.nota ? 'Cambiar nota' : 'Calificar'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="favorite-footer">
                    <span className="added-date">Agregada: {formattedDate}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FavoritesView;
