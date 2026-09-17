function MovieCard({ movie, onSelect, isFavorite = false, onToggleFavorite }) {
  const { title, year, poster, type, imdb_id } = movie;

  return (
    <div className="movie-card">
      <div className="movie-poster-wrapper">
        {poster ? (
          <img
            src={poster}
            alt={title}
            className="movie-poster"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="movie-poster-fallback"
          style={{ display: poster ? 'none' : 'flex' }}
        >
          <span>🎬</span>
          <span>Sin imagen</span>
        </div>

        {type && (
          <span className="movie-type-badge">
            {type.toUpperCase()}
          </span>
        )}
      </div>

      <div className="movie-info">
        <h3 className="movie-title" title={title}>
          {title}
        </h3>
        <div className="movie-meta">
          <span className="movie-year">{year || 'N/A'}</span>
          <span className="movie-imdb-id">{imdb_id}</span>
        </div>

        {onToggleFavorite && (
          <button
            className={`favorite-action-btn ${isFavorite ? 'active' : ''}`}
            onClick={() => onToggleFavorite(movie)}
            title={isFavorite ? 'Eliminar de favoritas' : 'Agregar a favoritas'}
          >
            {isFavorite ? '★ En Favoritas' : '☆ Favorita'}
          </button>
        )}
      </div>
    </div>
  );
}

export default MovieCard;
