import type { Request, Response } from 'express';
import { hardenManifest } from '../scanner';

export function hardenHandler(req: Request, res: Response) {
  const body = req.body;

  if (!body || (typeof body !== 'object' && typeof body !== 'string')) {
    res.status(400).json({
      error: 'invalid_request',
      message: 'Request body must be a JSON object, array, or text manifest.',
    });
    return;
  }

  const manifest =
    typeof body === 'object' && body !== null
      ? (body.manifest !== undefined ? body.manifest : body.text !== undefined ? body.text : body)
      : body;

  try {
    const result = hardenManifest(manifest);
    res.json(result);
  } catch (err) {
    if (typeof err === 'string') {
      res.status(400).json({
        error: 'hardening_failed',
        message: err,
      });
      return;
    }
    console.error('Hardening error:', err);
    res.status(500).json({
      error: 'hardening_internal_error',
      message: 'Internal error hardening manifest.',
    });
  }
}
