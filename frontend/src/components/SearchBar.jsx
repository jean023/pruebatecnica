import { useState } from 'react';

function SearchBar({ onSearch, initialValue = '', loading = false }) {
  const [query, setQuery] = useState(initialValue);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
  };

  return (
    <form onSubmit={handleSubmit} className="search-bar-form">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar películas por título (ej. Matrix, Batman, Avengers)..."
          className="search-input"
          autoFocus
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="search-clear-btn"
            title="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>
      <button type="submit" className="search-button" disabled={loading || !query.trim()}>
        {loading ? 'Buscando...' : 'Buscar'}
      </button>
    </form>
  );
}

export default SearchBar;
