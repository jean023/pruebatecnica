const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || `Error ${response.status}: ${response.statusText}`);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export async function getHealthStatus() {
  return request('/');
}

export async function registerUser(username, password) {
  return request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

export async function loginUser(username, password) {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  return request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });
}

export async function getMe(token) {
  return request('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function searchMovies(query, page = 1, token) {
  const params = new URLSearchParams({ q: query, page: page.toString() });
  return request(`/movies/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getMovieDetails(imdbId, token) {
  return request(`/movies/${imdbId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getFavorites(token, { sortBy = 'fecha_agregado', order = 'desc', minNota = null, q = '' } = {}) {
  const params = new URLSearchParams();
  if (sortBy) params.append('sort_by', sortBy);
  if (order) params.append('order', order);
  if (minNota) params.append('min_nota', minNota.toString());
  if (q) params.append('q', q);

  const queryString = params.toString() ? `?${params.toString()}` : '';
  return request(`/favorites${queryString}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function addFavorite(movieData, token) {
  return request('/favorites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(movieData),
  });
}

export async function updateFavoriteNote(favoriteId, note, token) {
  return request(`/favorites/${favoriteId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ nota: note }),
  });
}

export async function removeFavorite(favoriteId, token) {
  return request(`/favorites/${favoriteId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function removeFavoriteByMovieId(imdbId, token) {
  return request(`/favorites/movie/${imdbId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
