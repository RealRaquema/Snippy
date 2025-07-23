import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import './CodeEditor.css';
import CopySessionLink from './CopySessionLink';

const API_URL = import.meta.env.VITE_API_URL;
const socket = io(API_URL, { transports: ['websocket'] });



export default function CodeEditor() {
  const { sessionId } = useParams();
  const [code, setCode] = useState('//Start Coding...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [runError, setRunError] = useState('');
  const runBtnRef = useRef();

  useEffect(() => {
    socket.emit('join', { sessionId });
    setLoading(true);
    setError('');
    fetch(`${API_URL}/api/session/${sessionId}`)
      .then(res => {
        if (!res.ok) throw new Error('Session not found');
        return res.json();
      })
      .then(data => {
        if (data.code !== undefined) {
          setCode(data.code);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Session not found.');
        setLoading(false);
      });

    socket.on('codeChange', (newCode) => {
      setCode(newCode);
    });

    return () => {
      socket.off('codeChange');
      socket.disconnect();
    };
  }, [sessionId]);

  const handleChange = (value) => {
    setCode(value);
    socket.emit('codeChange', { sessionId, code: value });
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput('');
    setRunError('');
    try {
      const res = await fetch(`${API_URL}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, code })
      });
      const data = await res.json();
      if (data.error) setRunError(data.error);
      else setOutput(data.output);
    } catch (err) {
      setRunError('Failed to run code.');
    }
    setIsRunning(false);
  };

  const handleStop = async () => {
    setIsRunning(false);
    setOutput('');
    setRunError('');
    try {
      await fetch(`${API_URL}/api/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
    } catch {}
  };

  if (loading) {
    return <div className="editor-container dark"><p style={{color: 'white'}}>Loading session...</p></div>;
  }
  if (error) {
    return <div className="editor-container dark"><p style={{color: 'red'}}>{error}</p></div>;
  }

  return (
    <div className="editor-container dark">
      <CopySessionLink sessionId={sessionId} />
      <div className="editor-toolbar">
        <button
          ref={runBtnRef}
          className={`run-btn ${isRunning ? 'stop' : 'run'}`}
          onClick={isRunning ? handleStop : handleRun}
          disabled={isRunning && !runError && !output}
        >
          {isRunning ? 'Stop' : 'Run'}
        </button>
      </div>
      <CodeMirror
        value={code}
        height="70vh"
        extensions={[javascript()]}
        theme={oneDark}
        onChange={handleChange}
      />
      <div className="output-section">
        {output && <pre className="output-success">{output}</pre>}
        {runError && <pre className="output-error">{runError}</pre>}
      </div>
    </div>
  );
}
