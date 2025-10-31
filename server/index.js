
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const CodeSession = require('./models/CodeSession');
const { Server } = require('socket.io');
const { VM } = require('vm2');
const CodeRunner = require('./runners/CodeRunner');
const checkDependencies = require('./runners/checkDependencies');
const { spawnSync } = require('child_process');
require('dotenv').config();

// Check required dependencies
checkDependencies();

// Initialize code runner and VM map
const codeRunner = new CodeRunner();
const runningVMs = new Map();

const app = express();
app.use(cors({
  origin: (origin, callback) => {
    // Allow localhost, vercel.app, and render.com subdomains
    const allowed = [
      /^http:\/\/localhost:\d+$/,
      /^https?:\/\/([\w-]+\.)*vercel\.app$/,
      /^https?:\/\/([\w-]+\.)*render\.com$/,
      /^https?:\/\/([\w-]+\.)*onrender\.com$/
    ];
    if (!origin || allowed.some(r => r.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://snippy-git-main-becomefaisals-projects.vercel.app',
      'https://snippy-five.vercel.app',
      /^https?:\/\/([\w-]+\.)*render\.com$/,
      /^https?:\/\/([\w-]+\.)*onrender\.com$/
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.on('connection', (socket) => {
  socket.on('join', ({ sessionId }) => {
    socket.join(sessionId); // Join a specific "room" for that session
  });

  socket.on('codeChange', async ({ sessionId, code }) => {
    socket.to(sessionId).emit('codeChange', code);
    await CodeSession.updateOne(
      { sessionId },
      { code },
      { upsert: true }
    );
  });

  socket.on('disconnect', () => {
  });
});

// Run code API
app.post('/api/run', async (req, res) => {
  const { sessionId, code, language = 'javascript' } = req.body;
  if (!sessionId || !code) {
    return res.status(400).json({ error: 'Missing sessionId or code' });
  }

  try {
    switch (language.toLowerCase()) {
      case 'javascript':
        // For JavaScript, use VM2
        if (runningVMs.has(sessionId)) {
          try { runningVMs.get(sessionId).vm?.terminate?.(); } catch {}
          runningVMs.delete(sessionId);
        }

        let output = '';
        const vm = new VM({
          timeout: 5000,
          sandbox: {
            console: {
              log: (...args) => { output += args.join(' ') + '\n'; },
              error: (...args) => { output += args.join(' ') + '\n'; }
            }
          }
        });
        try {
          runningVMs.set(sessionId, { vm });
          const result = vm.run(code);
          output += (result !== undefined ? String(result) : '');
          runningVMs.delete(sessionId);
          res.json({ output });
        } catch (err) {
          runningVMs.delete(sessionId);
          res.status(400).json({ error: err.message });
        }
        break;

      case 'python':
        try {
          const result = await codeRunner.runPython(code);
          if (result.success) {
            res.json({ output: result.output });
          } else {
            res.status(400).json({ 
              error: result.error || 'Execution failed',
              output: result.output || ''
            });
          }
        } catch (err) {
          res.status(500).json({ 
            error: 'Internal server error', 
            details: err.message
          });
        }
        break;
      

      case 'cpp':
        try {
          const result = await codeRunner.runCpp(code);
          if (result.success) {
            res.json({ output: result.output });
          } else {
            res.status(400).json({ 
              error: result.error || 'Execution failed',
              output: result.output || ''
            });
          }
        } catch (err) {
          res.status(500).json({ 
            error: 'Internal server error', 
            details: err.message
          });
        }
        break;

      case 'c':
        try {
          const result = await codeRunner.runC(code);
          if (result.success) {
            res.json({ output: result.output });
          } else {
            res.status(400).json({ 
              error: result.error || 'Execution failed',
              output: result.output || ''
            });
          }
        } catch (err) {
          res.status(500).json({ 
            error: 'Internal server error', 
            details: err.message
          });
        }
        break;

      default:
        res.status(400).json({ 
          error: `Unsupported language: ${language}. Supported languages are: javascript, python, c, cpp`
        });
        break;
    }
  } catch (err) {
    res.status(500).json({ 
      error: 'Internal server error',
      details: err.message
    });
  }
});

// POST /api/stop { sessionId }
app.post('/api/stop', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
  
  let stopped = false;
  
  // Stop VM if running
  if (runningVMs.has(sessionId)) {
    try { 
      runningVMs.get(sessionId).vm?.terminate?.(); 
      stopped = true;
    } catch {}
    runningVMs.delete(sessionId);
  }

  // Stop Docker container if running
  // No Docker containers used anymore; runtime processes are handled by CodeRunner

  res.json({ stopped });
});


mongoose.connect(process.env.MONGO_URL).then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Lightweight health endpoint to help Render / CI confirm runtimes are present
app.get('/api/health', (req, res) => {
  const pythonCheck = spawnSync('python3', ['-V']);
  const gccCheck = spawnSync('gcc', ['-v']);

  const python = pythonCheck.error ? { installed: false, message: pythonCheck.error.message } : { installed: true, version: (pythonCheck.stdout || pythonCheck.stderr || '').toString().trim() };
  const gcc = gccCheck.error ? { installed: false, message: gccCheck.error.message } : { installed: true, version: (gccCheck.stdout || gccCheck.stderr || '').toString().trim() };

  res.json({ ok: true, python, gcc });
});

// API routes
app.post('/api/create', async (req, res) => {
  const sessionId = Math.random().toString(36).substring(2, 8); // generates random 6-char ID
  const session = new CodeSession({ sessionId });
  await session.save();
  res.json({ sessionId });
});

app.get('/api/session/:id', async (req, res) => {
  const session = await CodeSession.findOne({ sessionId: req.params.id });
  if (!session) return res.status(404).send('Session not found');
  res.json({ code: session.code });
});



const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
