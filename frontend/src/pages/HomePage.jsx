import { useState, useEffect, useCallback } from 'react';
import SearchBar from '../components/SearchBar';
import MovieCard from '../components/MovieCard';
import FavoritesView from '../components/FavoritesView';
import {
  searchMovies,
  getFavorites,
  addFavorite,
  removeFavorite,
  removeFavoriteByMovieId,
  updateFavoriteNote,
} from '../services/api';

function HomePage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'favorites'
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [favorites, setFavorites] = useState([]);
  const [loadingFavs, setLoadingFavs] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  const token = localStorage.getItem('token');

  // Cargar lista de favoritas del usuario
  const loadFavorites = useCallback(async () => {
    if (!token) return;
    setLoadingFavs(true);
    try {
      const data = await getFavorites(token);
      setFavorites(data || []);
    } catch (err) {
      console.error('Error al cargar favoritas:', err);
    } finally {
      setLoadingFavs(false);
    }
  }, [token]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const showNotification = (message) => {
    setActionFeedback(message);
    setTimeout(() => {
      setActionFeedback(null);
    }, 2500);
  };

  // Buscar películas en OMDb
  const handleSearch = useCallback(
    async (searchQuery, pageNumber = 1, append = false) => {
      if (!token) return;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setMovies([]);
      }
      setError(null);
      setQuery(searchQuery);
      setPage(pageNumber);
      setHasSearched(true);

      try {
        const data = await searchMovies(searchQuery, pageNumber, token);
        if (append) {
          // Evitar duplicados si OMDb repite elementos
          setMovies((prev) => {
            const existingIds = new Set(prev.map((m) => m.imdb_id));
            const newItems = (data.movies || []).filter((m) => !existingIds.has(m.imdb_id));
            return [...prev, ...newItems];
          });
        } else {
          setMovies(data.movies || []);
        }
        setTotalPages(data.total_pages || 0);
        setTotalResults(data.total_results || 0);
      } catch (err) {
        setError(err.message);
        if (!append) {
          setMovies([]);
          setTotalPages(0);
          setTotalResults(0);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [token]
  );

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      handleSearch(query, newPage, false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      handleSearch(query, page + 1, true);
    }
  };

  // Toggle de favoritas desde la tarjeta de película
  const handleToggleFavorite = async (movie) => {
    if (!token) return;
    const existingFav = favorites.find((f) => f.id_pelicula === movie.imdb_id);

    try {
      if (existingFav) {
        await removeFavoriteByMovieId(movie.imdb_id, token);
        setFavorites((prev) => prev.filter((f) => f.id_pelicula !== movie.imdb_id));
        showNotification(`Removida "${movie.title}" de favoritas`);
      } else {
        const newFav = await addFavorite(
          {
            id_pelicula: movie.imdb_id,
            titulo: movie.title,
            anio: movie.year,
            poster: movie.poster,
            nota: 10,
          },
          token
        );
        setFavorites((prev) => [newFav, ...prev]);
        showNotification(`"${movie.title}" agregada a favoritas`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Actualizar calificación desde vista de favoritas
  const handleUpdateNote = async (favId, newNote) => {
    if (!token) return;
    const updated = await updateFavoriteNote(favId, newNote, token);
    setFavorites((prev) =>
      prev.map((f) => (f.id === favId ? { ...f, nota: updated.nota } : f))
    );
    showNotification(`Calificación actualizada a ${newNote}/10`);
  };

  // Eliminar favorita por ID
  const handleRemoveFavoriteById = async (favId) => {
    if (!token) return;
    try {
      await removeFavorite(favId, token);
      setFavorites((prev) => prev.filter((f) => f.id !== favId));
      showNotification('Película eliminada de tus favoritas');
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  return (
    <div className="home-container">
      {actionFeedback && (
        <div className="toast-notification">
          <span>{actionFeedback}</span>
        </div>
      )}

      <header className="home-header">
        <div className="header-brand">
          <h1>MoviesTech</h1>
        </div>

        <nav className="nav-tabs">
          <button
            className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            Explorar
          </button>
          <button
            className={`tab-button ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            Mis Favoritas <span className="tab-badge">{favorites.length}</span>
          </button>
        </nav>

        <div className="home-user-info">
          <span>
            Usuario: <strong>{user.username}</strong>
          </span>
          <button onClick={onLogout} className="logout-button">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="home-main-content">
        {activeTab === 'search' ? (
          <>
            <section className="search-section">
              <div className="search-header-text">
                <h2>Explorar Películas</h2>
                <p>Busca películas en OMDb y agrégalas a tu colección personal</p>
              </div>
              <SearchBar onSearch={(q) => handleSearch(q, 1, false)} loading={loading} />
            </section>

            {error && (
              <div className="search-error-banner">
                <p>{error}</p>
              </div>
            )}

            {loading && (
              <div className="search-loading-state">
                <div className="spinner"></div>
                <p>Buscando películas en OMDb...</p>
              </div>
            )}

            {!loading && hasSearched && movies.length === 0 && !error && (
              <div className="empty-results-state">
                <h3>No se encontraron resultados</h3>
                <p>Intenta con otro título o palabra clave (ej. Matrix, Batman, Spider-Man).</p>
              </div>
            )}

            {!loading && !hasSearched && (
              <div className="initial-search-prompt">
                <h3>Buscador de Películas</h3>
                <p>Escribe el nombre de una película en el buscador superior para comenzar.</p>
              </div>
            )}

            {!loading && movies.length > 0 && (
              <section className="results-section">
                <div className="results-meta">
                  <span>
                    Mostrando <strong>{movies.length}</strong> de <strong>{totalResults}</strong> resultados para "<em>{query}</em>"
                  </span>
                  <span>Página {page} de {totalPages}</span>
                </div>

                <div className="movies-grid">
                  {movies.map((movie) => {
                    const isFav = favorites.some((f) => f.id_pelicula === movie.imdb_id);
                    const favItem = favorites.find((f) => f.id_pelicula === movie.imdb_id);
                    return (
                      <MovieCard
                        key={movie.imdb_id}
                        movie={movie}
                        isFavorite={isFav}
                        rating={favItem ? favItem.nota : undefined}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="pagination-controls-container">
                    {/* Botón Cargar Más */}
                    {page < totalPages && (
                      <button
                        className="load-more-btn"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                      >
                        {loadingMore ? 'Cargando más películas...' : `Cargar más películas (+10 de ${totalResults})`}
                      </button>
                    )}

                    {/* Paginación Tradicional */}
                    <div className="pagination-wrapper">
                      <button
                        className="pagination-btn"
                        disabled={page <= 1 || loading || loadingMore}
                        onClick={() => handlePageChange(page - 1)}
                      >
                        ← Anterior
                      </button>
                      <span className="pagination-info">
                        Página {page} de {totalPages}
                      </span>
                      <button
                        className="pagination-btn"
                        disabled={page >= totalPages || loading || loadingMore}
                        onClick={() => handlePageChange(page + 1)}
                      >
                        Siguiente →
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        ) : (
          <FavoritesView
            favorites={favorites}
            loading={loadingFavs}
            onUpdateNote={handleUpdateNote}
            onRemoveFavorite={handleRemoveFavoriteById}
            onSwitchToSearch={() => setActiveTab('search')}
          />
        )}
      </main>
    </div>
  );
}

export default HomePage;
