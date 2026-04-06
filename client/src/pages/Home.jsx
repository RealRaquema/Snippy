import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from "socket.io-client";
import JoinSession from './JoinSession';
import './Home.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://snippy-server.onrender.com';
const socket = io(API_URL, { transports: ['websocket'] });
import img from './img.jpg';

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  console.log('Home component rendered');

  const createSession = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/create`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to create session');
      const data = await res.json();
      navigate(`/code/${data.sessionId}`);
    } catch (err) {
      console.error(err);
      setError('Could not create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="home-title">Welcome to Snippy ✂️</h1>
        <p className="home-description">Collaborate and code in real-time with your team.</p>
        <button className="home-button" onClick={createSession} disabled={loading}>
          {loading ? 'Creating Session...' : 'Create New Code Session'}
        </button>
        {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
        <JoinSession />
      </div>
      <div className="home-image">
        <img src={img} alt="Snippy Preview" />
      </div>
    </div>
  );
}
