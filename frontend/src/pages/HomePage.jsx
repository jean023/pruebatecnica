import { useState, useCallback } from 'react';
import SearchBar from '../components/SearchBar';
import MovieCard from '../components/MovieCard';
import { searchMovies } from '../services/api';

function HomePage({ user, onLogout }) {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async (searchQuery, pageNumber = 1) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    setError(null);
    setQuery(searchQuery);
    setPage(pageNumber);
    setHasSearched(true);

    try {
      const data = await searchMovies(searchQuery, pageNumber, token);
      setMovies(data.movies || []);
      setTotalPages(data.total_pages || 0);
      setTotalResults(data.total_results || 0);
    } catch (err) {
      setError(err.message);
      setMovies([]);
      setTotalPages(0);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      handleSearch(query, newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-brand">
          <h1>🎬 MoviesTech</h1>
        </div>
        <div className="home-user-info">
          <span>
            Hola, <strong>{user.username}</strong>
          </span>
          <button onClick={onLogout} className="logout-button">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="home-main-content">
        <section className="search-section">
          <div className="search-header-text">
            <h2>Explorar Películas</h2>
            <p>Busca entre millones de películas, series y documentales</p>
          </div>
          <SearchBar onSearch={(q) => handleSearch(q, 1)} loading={loading} />
        </section>

        {error && (
          <div className="search-error-banner">
            <p>⚠️ {error}</p>
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
            <span style={{ fontSize: '3rem' }}>🔍</span>
            <h3>No se encontraron resultados</h3>
            <p>Intenta con otro título o palabra clave (ej. "Matrix", "Batman", "Spider").</p>
          </div>
        )}

        {!loading && !hasSearched && (
          <div className="initial-search-prompt">
            <span style={{ fontSize: '3.5rem' }}>🍿</span>
            <h3>¿Qué te gustaría ver hoy?</h3>
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
              {movies.map((movie) => (
                <MovieCard key={movie.imdb_id} movie={movie} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination-wrapper">
                <button
                  className="pagination-btn"
                  disabled={page <= 1 || loading}
                  onClick={() => handlePageChange(page - 1)}
                >
                  ← Anterior
                </button>
                <span className="pagination-info">
                  Página {page} de {totalPages}
                </span>
                <button
                  className="pagination-btn"
                  disabled={page >= totalPages || loading}
                  onClick={() => handlePageChange(page + 1)}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default HomePage;
