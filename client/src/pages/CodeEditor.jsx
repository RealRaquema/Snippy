
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
  const [theme, setTheme] = useState('dark');
  const [editorWidth, setEditorWidth] = useState(50); // percent
  const runBtnRef = useRef();
  const dragging = useRef(false);
  const codeMirrorRef = useRef();
  // Only focus editor on mount if it hasn't been focused by user
  useEffect(() => {
    let hasFocused = false;
    const handler = () => { hasFocused = true; };
    if (codeMirrorRef.current && codeMirrorRef.current.view && !hasFocused) {
      codeMirrorRef.current.view.focus();
    }
    window.addEventListener('mousedown', handler, { once: true });
    return () => window.removeEventListener('mousedown', handler);
  }, [loading]);

  // Removed auto-select handler on click
  // Clear output handler
  const handleClearOutput = () => {
    setOutput('');
    setRunError('');
  };


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

  // Split pane drag logic - reimplemented for robustness
  const onDragStart = (e) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('touchmove', onDrag, { passive: false });
    window.addEventListener('mouseup', onDragEnd);
    window.addEventListener('touchend', onDragEnd);
  };

  const onDrag = (e) => {
    if (!dragging.current) return;
    e.preventDefault();
    const x = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const container = document.querySelector('.editor-main');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    let offsetX = x - rect.left;
    const minWidth = rect.width * 0.2;
    const maxWidth = rect.width * 0.8;
    if (offsetX < minWidth) offsetX = minWidth;
    if (offsetX > maxWidth) offsetX = maxWidth;
    const percent = (offsetX / rect.width) * 100;
    setEditorWidth(percent);
  };

  const onDragEnd = (e) => {
    dragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('touchmove', onDrag);
    window.removeEventListener('mouseup', onDragEnd);
    window.removeEventListener('touchend', onDragEnd);
  };

  // Theme toggle
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

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
    return <div className="editor-app-root"><p style={{color: 'white'}}>Loading session...</p></div>;
  }
  if (error) {
    return <div className="editor-app-root"><p style={{color: 'red'}}>{error}</p></div>;
  }

  return (
    <div className={`editor-app-root ${theme}`}>
      <div className="editor-header">
        <div className="header-session-group">
          <span className="filename">{sessionId}</span>
          <CopySessionLink sessionId={sessionId} />
        </div>
        <div className="editor-header-actions">
          <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
          <button
            ref={runBtnRef}
            className={`run-btn modern ${isRunning ? 'stop' : 'run'}`}
            onClick={isRunning ? handleStop : handleRun}
            disabled={isRunning && !runError && !output}
          >
            {isRunning ? 'Stop' : 'Run'}
          </button>
        </div>
      </div>
      <div className="editor-main" style={{ fontFamily: 'Fira Mono, JetBrains Mono, Consolas, monospace' }}>
        <div className="editor-panel" style={{ width: `${editorWidth}%` }}>
          <CodeMirror
            value={code}
            height="100vh"
            extensions={[javascript()]}
            theme={theme === 'dark' ? oneDark : undefined}
            onChange={handleChange}
            style={{ fontFamily: 'Fira Mono, JetBrains Mono, Consolas, monospace', fontSize: '1.1rem' }}
            ref={codeMirrorRef}
          />
        </div>
        <div
          className="splitter"
          onMouseDown={onDragStart}
          onTouchStart={onDragStart}
        />
        <div className="output-panel" style={{ width: `${100 - editorWidth}%` }}>
          <div className="output-header">
            <span>Output</span>
            <button className="clear-output-btn icon" onClick={handleClearOutput} title="Clear Output" aria-label="Clear Output">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M7 13L13 7M13 13L7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="output-section terminal-output initial-terminal">
            {!output && !runError && (
              <div className="terminal-placeholder">Output will appear here after you run your code.</div>
            )}
            {output && <pre className="output-success terminal-pre">{output}</pre>}
            {runError && <pre className="output-error terminal-pre">{runError}</pre>}
          </div>
        </div>
      </div>
    </div>
  );
}
