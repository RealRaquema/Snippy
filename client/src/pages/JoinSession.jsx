import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'https://snippy-server.onrender.com';

const JoinSession = () => {
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoin = async () => {
    setError('');
    if (!sessionId) {
      setError('Please enter a session ID');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/session/${sessionId}`);
      if (!res.ok) throw new Error('Session not found');
      navigate(`/code/${sessionId}`);
    } catch (err) {
      setError('Unable to join session. Please check the session ID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-session-container">
      <input
        className="join-session-input"
        type="text"
        value={sessionId}
        onChange={(e) => setSessionId(e.target.value)}
        placeholder="Enter session ID"
        disabled={loading}
      />
      <button className="join-session-button" onClick={handleJoin} disabled={loading}>
        {loading ? 'Joining...' : 'Join Session'}
      </button>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
    </div>
  );
};

export default JoinSession;
