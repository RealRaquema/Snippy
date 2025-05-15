import { useNavigate } from 'react-router-dom';
import JoinSession from './JoinSession';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();

  console.log('Home component rendered');

  const createSession = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/create', {
        method: 'POST'
      });
      const data = await res.json();
      navigate(`/code/${data.sessionId}`);
    } catch (err) {
      console.error(err);
      alert('Could not create session');
    }
  };

  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="home-title">Welcome to Snippy ✂️</h1>
        <p className="home-description">Collaborate and code in real-time with your team.</p>
        <button className="home-button" onClick={createSession}>
          Create New Code Session
        </button>
        <JoinSession />
      </div>
      <div className="home-image">
        <img src="/src/pages/img.jpg" alt="Snippy Preview" />
      </div>
    </div>
  );
}
