import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { registerRoutes } from './api';
import { env } from './config/env';

const app = express();

app.use(express.json({ limit: '1mb' }));
registerRoutes(app);

const frontendDist =
  env.frontendDist || path.resolve(process.cwd(), '../frontend/dist');
const indexHtml = path.join(frontendDist, 'index.html');

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'not_found', path: req.path });
    return;
  }

  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
    return;
  }

  res
    .status(404)
    .send(
      'MCP Manifest Scanner backend is running. Frontend build not found yet.',
    );
});

export default app;
