
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const CodeSession = require('./models/CodeSession');
const { Server } = require('socket.io');
const { VM } = require('vm2');
require('dotenv').config();

// Map to keep track of running VMs per session (per tab)
const runningVMs = new Map();

const app = express();
app.use(cors({
  origin: (origin, callback) => {
    // Allow localhost and any vercel.app subdomain
    const allowed = [
      /^http:\/\/localhost:\d+$/,
      /^https?:\/\/([\w-]+\.)*vercel\.app$/
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
      'https://snippy-five.vercel.app'
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

// --- Run/Stop JS code API ---
// POST /api/run { sessionId, code }
app.post('/api/run', async (req, res) => {
  const { sessionId, code } = req.body;
  if (!sessionId || !code) return res.status(400).json({ error: 'Missing sessionId or code' });

  // If already running, stop previous
  if (runningVMs.has(sessionId)) {
    try { runningVMs.get(sessionId).vm?.terminate?.(); } catch {}
    runningVMs.delete(sessionId);
  }

  // Create a new VM for this session
  const vm = new VM({ timeout: 5000, sandbox: {} });
  let stopped = false;
  let output = '';
  let error = null;
  // Capture console.log
  vm._context.console = {
    log: (...args) => { output += args.join(' ') + '\n'; },
    error: (...args) => { output += args.join(' ') + '\n'; }
  };
  // Run code async
  const runPromise = new Promise((resolve) => {
    try {
      const result = vm.run(code);
      output += (result !== undefined ? String(result) : '');
      resolve();
    } catch (err) {
      error = err.message;
      resolve();
    }
  });
  runningVMs.set(sessionId, { vm, runPromise });
  await runPromise;
  runningVMs.delete(sessionId);
  if (error) return res.json({ error });
  res.json({ output });
});

// POST /api/stop { sessionId }
app.post('/api/stop', (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
  if (runningVMs.has(sessionId)) {
    try { runningVMs.get(sessionId).vm?.terminate?.(); } catch {}
    runningVMs.delete(sessionId);
    return res.json({ stopped: true });
  }
  res.json({ stopped: false });
});

//Rest Apis
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

mongoose.connect(process.env.MONGO_URL).then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

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



const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
