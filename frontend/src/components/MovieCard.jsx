function MovieCard({
  movie,
  isFavorite = false,
  onToggleFavorite,
  rating,
}) {
  const { title, year, poster, type, imdb_id } = movie;

  return (
    <div className={`movie-card ${isFavorite ? 'is-fav' : ''}`}>
      <div className="movie-poster-wrapper">
        {poster ? (
          <img
            src={poster}
            alt={title}
            className="movie-poster"
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
          style={{ display: poster ? 'none' : 'flex' }}
        >
          <span>Sin imagen</span>
        </div>

        {type && (
          <span className="movie-type-badge">
            {type.toUpperCase()}
          </span>
        )}

        {rating !== undefined && rating !== null && (
          <span className="movie-user-rating-badge" title={`Calificación personal: ${rating}/10`}>
            Nota: {rating}/10
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
            {isFavorite ? 'En Favoritas' : '+ Agregar a Favoritas'}
          </button>
        )}
      </div>
    </div>
  );
}

export default MovieCard;
