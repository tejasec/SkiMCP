import type { Request, Response } from 'express';
import { scanManifest } from '../scanner';

export function scanHandler(req: Request, res: Response) {
  const body = req.body;

  if (!body || typeof body !== 'object') {
    res.status(400).json({
      error: 'invalid_request',
      message: 'Request body must be a JSON object.',
    });
    return;
  }

  // Accept { manifest: { tools: [...] } } or { manifest: [...] }
  // or bare { tools: [...] } or bare [...]
  const manifest = body.manifest ?? body;

  try {
    const report = scanManifest(manifest);
    res.json(report);
  } catch (err) {
    if (typeof err === 'string') {
      res.status(400).json({
        error: 'invalid_manifest',
        message: err,
      });
      return;
    }
    console.error('Scan error:', err);
    res.status(500).json({
      error: 'scan_failed',
      message: 'Internal scanner error.',
    });
  }
}
