import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';

function App() {
  const { user, token, loading, error, login, register, logout } = useAuth();
  const [page, setPage] = useState('login');

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h1 className="auth-title"> MoviesTech</h1>
          <p style={{ color: '#8b949e' }}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (token && user) {
    return <HomePage user={user} onLogout={logout} />;
  }

  if (page === 'register') {
    return (
      <RegisterPage
        onRegister={register}
        onSwitchToLogin={() => setPage('login')}
        error={error}
      />
    );
  }

  return (
    <LoginPage
      onLogin={login}
      onSwitchToRegister={() => setPage('register')}
      error={error}
    />
  );
}

export default App;
