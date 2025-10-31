import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import './CodeEditor.css';
import CopySessionLink from './CopySessionLink';


const API_URL = import.meta.env.VITE_API_URL;
const socket = io(API_URL, { transports: ['websocket'] });


export default function CodeEditor() {
  const languageOptions = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' },
  ];
  const { sessionId } = useParams();
  const [code, setCode] = useState('//Start Coding...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [runError, setRunError] = useState('');
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('javascript');
  const [copied, setCopied] = useState(false);
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

  // Change language handler
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    // Set appropriate starter code for each language
    switch (newLang) {
      case 'python':
        setCode('print("Hello, World!")');
        break;
      case 'cpp':
        setCode('#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}');
        break;
      case 'c':
        setCode('#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}');
        break;
      // Java removed
      default:
        setCode('console.log("Hello, World!");');
    }
    // Clear previous output when changing languages
    setOutput('');
    setRunError('');
  };

  // Copy code to clipboard
  const handleCopyCode = async () => {
    try {
      if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(code || '');
      } else {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = code || '';
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      // ignore copy errors
      console.error('Copy failed', err);
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput('');
    setRunError('');
    try {
      const res = await fetch(`${API_URL}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId, 
          code,
          language // Add the selected language to the request
        })
      });
      const data = await res.json();
      if (data.error) {
        setRunError(data.error);
        if (data.output) setOutput(data.output); // Show compilation output if available
      } else {
        setOutput(data.output);
      }
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

  // Choose CodeMirror extension based on language
  const getExtension = () => {
    switch (language) {
      case 'python': return python();
      case 'cpp': return cpp();
      case 'c': return cpp(); // C uses cpp extension for highlighting
      default: return javascript();
    }
  };

  return (
    <div className={`editor-app-root ${theme}`}>
      <div className="editor-header">
        <div className="header-session-group">
          <span className="filename">{sessionId}</span>
          <CopySessionLink sessionId={sessionId} />
        </div>
        <div className="editor-header-actions">
          <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="12" cy="12" r="4" fill="currentColor" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          <button
            ref={runBtnRef}
            className={`run-btn modern ${isRunning ? 'stop' : 'run'}`}
            onClick={isRunning ? handleStop : handleRun}
            disabled={isRunning && !runError && !output}
          >
            {isRunning ? 'Stop' : 'Run Code'}
          </button>
        </div>
      </div>
      <div className="editor-main" style={{ fontFamily: 'Fira Mono, JetBrains Mono, Consolas, monospace' }}>
        <div className="output-panel code-panel" style={{ width: `${editorWidth}%` }}>
          <div className="output-header code-header">
            <span>Code</span>
            <select
              className="language-dropdown code-language-dropdown"
              value={language}
              onChange={handleLanguageChange}
              title="Choose language"
            >
              {languageOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              className={`copy-code-btn icon ${copied ? 'copied' : ''}`}
              onClick={handleCopyCode}
              title={copied ? 'Copied' : 'Copy code'}
              aria-label="Copy code"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 2H8a2 2 0 0 0-2 2v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="8" y="6" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 6V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {copied && <span className="copy-tooltip">Copied</span>}
            </button>
          </div>
          <div className="output-section terminal-output initial-terminal code-section">
            <CodeMirror
              value={code}
              height="100vh" /* Changed height to a static value to fill the viewport */
              extensions={[getExtension()]}
              theme={theme === 'dark' ? oneDark : undefined}
              onChange={handleChange}
              style={{ fontFamily: 'Fira Mono, JetBrains Mono, Consolas, monospace', fontSize: '1.1rem', background: 'transparent' }}
              ref={codeMirrorRef}
            />
          </div>
        </div>
        <div
          className="splitter"
          onMouseDown={onDragStart}
          onTouchStart={onDragStart}
        />
        <div className="output-panel" style={{ width: `${100 - editorWidth}%` }}>
          <div className="output-header">
            <span>Output</span>
            <button className="clear-output-btn" onClick={handleClearOutput} title="Clear Output" aria-label="Clear Output">
              Clear
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