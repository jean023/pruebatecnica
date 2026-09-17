import { useState } from 'react';

function LoginPage({ onLogin, onSwitchToRegister, error: authError }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);
    try {
      await onLogin(username, password);
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">🎬 MoviesTech</h1>
        <p className="auth-subtitle">Inicia sesión en tu cuenta</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tu nombre de usuario"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              required
            />
          </div>

          {displayError && <p className="auth-error">{displayError}</p>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="auth-switch">
          ¿No tienes cuenta?{' '}
          <button type="button" onClick={onSwitchToRegister} className="auth-link">
            Regístrate
          </button>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
