import { useState } from 'react';

function RegisterPage({ onRegister, onSwitchToLogin, error: authError }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (password !== confirmPassword) {
      setLocalError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await onRegister(username, password);
      setSuccess(true);
      setTimeout(() => onSwitchToLogin(), 1500);
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
        <h1 className="auth-title">MoviesTech</h1>
        <p className="auth-subtitle">Crea tu cuenta de usuario</p>

        {success ? (
          <div className="auth-success">
            <p>Cuenta creada exitosamente</p>
            <p style={{ fontSize: '0.9rem', color: '#8b949e' }}>
              Redirigiendo al inicio de sesión...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="username">Usuario</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Elige un usuario (mínimo 3 caracteres)"
                required
                autoFocus
                minLength={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar contraseña</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                required
              />
            </div>

            {displayError && <p className="auth-error">{displayError}</p>}

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </form>
        )}

        <p className="auth-switch">
          ¿Ya tienes cuenta?{' '}
          <button type="button" onClick={onSwitchToLogin} className="auth-link">
            Inicia sesión aquí
          </button>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
