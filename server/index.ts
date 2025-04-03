import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../api/routes';
import path from 'path';

const app = express();
app.use(express.json());

// API routes should be handled first
app.use('/api', (req, res, next) => {
  // Set CORS headers for API requests
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Register API routes
registerRoutes(app).then(() => {
  console.log('API routes registered');
});

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '../dist')));

// Frontend route handling should come last
app.get('*', (req, res) => {
  // Only serve index.html for non-API routes
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  }
});


const server = createServer(app);
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// This file forwards to the api/index.ts file to maintain compatibility with existing scripts
import "../api/index.js";