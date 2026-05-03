
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

const sessionSockets = {}; // Track { sessionId: Set of socketIds }

const funnyAdjectives = [
  'Wacky', 'Sparkly', 'Fuzzy', 'Cosmic', 'Turbo', 'Silly', 'Zesty', 'Mighty', 'Sneaky', 'Happy', 'Quirky', 'Electric', 'Nimble', 'Jazzy', 'Bouncy'
];
const funnyNouns = [
  'Panda', 'Noodle', 'Llama', 'Rocket', 'Unicorn', 'Taco', 'Pirate', 'Wizard', 'Narwhal', 'Gizmo', 'Pixel', 'Muffin', 'Bubble', 'Captain', 'Squirrel'
];

const generateFunnyUsername = (existing = new Set()) => {
  let name;
  let tries = 0;
  do {
    const adjective = funnyAdjectives[Math.floor(Math.random() * funnyAdjectives.length)];
    const noun = funnyNouns[Math.floor(Math.random() * funnyNouns.length)];
    name = `${adjective} ${noun}`;
    if (!existing.has(name)) break;
    tries += 1;
  } while (tries < 10);
  return name;
};

io.on('connection', (socket) => {
  let userSessionId = null;

  socket.on('join', async ({ sessionId }) => {
    userSessionId = sessionId;
    socket.join(sessionId);

    // Track this socket in the session
    if (!sessionSockets[sessionId]) {
      sessionSockets[sessionId] = new Set();
    }
    sessionSockets[sessionId].add(socket.id);

    // Update session with user info
    const session = await CodeSession.findOne({ sessionId });
    if (session) {
      // Set the first user as admin if no admin exists
      if (!session.adminId) {
        session.adminId = socket.id;
      }

      // Add user to the session if not already there
      const userExists = session.users.some(u => u.socketId === socket.id);
      if (!userExists) {
        const existingNames = new Set(session.users.map(u => u.username).filter(Boolean));
        const username = generateFunnyUsername(existingNames);
        session.users.push({
          socketId: socket.id,
          username,
          permission: session.adminId === socket.id ? 'editor' : session.defaultPermission
        });
        await session.save();
      }
    }

    // Emit updated user count and session info to all in the room
    const activeUsers = sessionSockets[sessionId]?.size || 0;
    io.to(sessionId).emit('userCountUpdate', { activeUsers });
    io.to(sessionId).emit('sessionUpdate', {
      adminId: session?.adminId,
      defaultPermission: session?.defaultPermission,
      users: session?.users || []
    });
  });

  socket.on('codeChange', async ({ sessionId, code }) => {
    socket.to(sessionId).emit('codeChange', code);
    await CodeSession.updateOne(
      { sessionId },
      { code },
      { upsert: true }
    );
  });

  socket.on('setDefaultPermission', async ({ sessionId, permission }) => {
    const session = await CodeSession.findOne({ sessionId });
    if (session && session.adminId === socket.id) {
      session.defaultPermission = permission;
      session.users = session.users.map(u => ({
        ...u,
        permission: u.socketId === session.adminId ? 'editor' : permission
      }));
      await session.save();
      io.to(sessionId).emit('sessionUpdate', {
        adminId: session.adminId,
        defaultPermission: session.defaultPermission,
        users: session.users
      });
    }
  });

  socket.on('setUserPermission', async ({ sessionId, targetSocketId, permission }) => {
    const session = await CodeSession.findOne({ sessionId });
    if (session && session.adminId === socket.id) {
      const user = session.users.find(u => u.socketId === targetSocketId);
      if (user) {
        user.permission = permission;
        await session.save();
        io.to(sessionId).emit('sessionUpdate', {
          adminId: session.adminId,
          defaultPermission: session.defaultPermission,
          users: session.users
        });
      }
    }
  });

  socket.on('disconnect', async () => {
    if (userSessionId) {
      sessionSockets[userSessionId].delete(socket.id);
      
      // Remove user from session document
      await CodeSession.updateOne(
        { sessionId: userSessionId },
        { $pull: { users: { socketId: socket.id } } }
      );

      // Emit updated user count
      const activeUsers = sessionSockets[userSessionId]?.size || 0;
      io.to(userSessionId).emit('userCountUpdate', { activeUsers });
    }
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


const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.DB_CONNECT || 'mongodb://127.0.0.1:27017/snippy';

async function connectToMongo() {
  try {
    await mongoose.connect(mongoUrl);
    console.log(`MongoDB connected to ${mongoUrl}`);
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

connectToMongo();

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
  const sessionId = req.params.id;
  const session = await CodeSession.findOne({ sessionId });
  if (!session) return res.status(404).send('Session not found');
  res.json({
    code: session.code,
    adminId: session.adminId,
    defaultPermission: session.defaultPermission,
    users: session.users || []
  });
});



const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
