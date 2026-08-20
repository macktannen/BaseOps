import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import Logo from '../components/Logo';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await auth?.login(email, password);
      navigate('/');
    } catch (err) {
      setError('Failed to log in: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-color)', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '40px', backgroundColor: 'white' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <Logo size={48} style={{ marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-muted)', marginTop: '0px', fontSize: '0.95rem' }}>Log in to your account</p>
        </div>
        
        {error && <div style={{ backgroundColor: '#fed7d7', color: '#c53030', padding: '10px', borderRadius: '4px', marginBottom: '20px', fontSize: '0.875rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email</label>
            <input 
              type="email" 
              className="form-control" 
              style={{ width: '100%' }}
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Password</label>
            <input 
              type="password" 
              className="form-control" 
              style={{ width: '100%' }}
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px', marginTop: '10px' }} disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.875rem' }}>
          Don't have an account? <Link to="/signup" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 'bold' }}>Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
