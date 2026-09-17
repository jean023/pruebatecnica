function HomePage({ user, onLogout }) {
  return (
    <div className="home-container">
      <header className="home-header">
        <h1>🎬 MoviesTech</h1>
        <div className="home-user-info">
          <span>Hola, <strong>{user.username}</strong></span>
          <button onClick={onLogout} className="logout-button">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="home-main">
        <div className="home-welcome">
          <h2>Bienvenido a MoviesTech</h2>
          <p style={{ color: '#8b949e', marginTop: '0.5rem' }}>
            Tu plataforma de películas favoritas
          </p>
        </div>

        <div className="home-placeholder">
          <p>🔍 El buscador de películas estará disponible próximamente</p>
          <p>⭐ Aquí podrás gestionar tus películas favoritas</p>
        </div>
      </main>
    </div>
  );
}

export default HomePage;
