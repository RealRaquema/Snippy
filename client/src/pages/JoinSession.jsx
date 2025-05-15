import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const JoinSession = () => {
  const [sessionId, setSessionId] = useState('');
  const navigate = useNavigate();

  const handleJoin = () => {
    if (sessionId) {
      navigate(`/code/${sessionId}`);
    } else {
      alert('Please enter a session ID');
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
      />
      <button className="join-session-button" onClick={handleJoin}>
        Join Session
      </button>
    </div>
  );
};

export default JoinSession;
