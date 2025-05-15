import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CodeEditor from './pages/CodeEditor';
import { ToastContainer } from 'react-toastify';

function App() {
  console.log('App component rendered');
  return (
    <BrowserRouter>
    <ToastContainer/>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/code/:sessionId" element={<CodeEditor />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
