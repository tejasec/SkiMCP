import type { Request, Response } from 'express';
import { scanManifest } from '../scanner';

export function scanHandler(req: Request, res: Response) {
  const body = req.body;

  if (!body || (typeof body !== 'object' && typeof body !== 'string')) {
    res.status(400).json({
      error: 'invalid_request',
      message: 'Request body must be a JSON object, array, or text manifest.',
    });
    return;
  }

  // Accept { manifest: ... } or { text: ... } or bare object/string
  const manifest =
    typeof body === 'object' && body !== null
      ? (body.manifest !== undefined ? body.manifest : body.text !== undefined ? body.text : body)
      : body;

  const options =
    typeof body === 'object' && body !== null && 'options' in body
      ? body.options
      : undefined;

  try {
    const report = scanManifest(manifest, options);
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
