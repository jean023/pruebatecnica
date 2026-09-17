import { useState, useEffect } from 'react';
import { getHealthStatus } from './services/api';

function App() {
  const [backendStatus, setBackendStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getHealthStatus()
      .then((data) => {
        setBackendStatus(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎬 MoviesTech</h1>
      <p style={{ color: '#8b949e', marginBottom: '2rem' }}>
        Plataforma de películas favoritas
      </p>

      <div
        style={{
          background: '#161b22',
          borderRadius: '8px',
          padding: '1.5rem',
          maxWidth: '400px',
          margin: '0 auto',
        }}
      >
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
          Estado del Backend
        </h2>

        {loading && <p style={{ color: '#8b949e' }}>Conectando...</p>}

        {error && (
          <p style={{ color: '#f85149' }}>❌ Error: {error}</p>
        )}

        {backendStatus && (
          <div>
            <p style={{ color: '#3fb950', marginBottom: '0.5rem' }}>
              ✅ Conectado
            </p>
            <p style={{ color: '#8b949e', fontSize: '0.9rem' }}>
              Proyecto: {backendStatus.project}
            </p>
            <p style={{ color: '#8b949e', fontSize: '0.9rem' }}>
              Versión: {backendStatus.version}
            </p>
            <p style={{ color: '#8b949e', fontSize: '0.9rem' }}>
              Estado: {backendStatus.status}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
