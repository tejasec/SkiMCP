import 'dotenv/config';

const rawPort = process.env.PORT ?? '8080';
const port = Number.parseInt(rawPort, 10);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: ${rawPort}`);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port,
  frontendDist: process.env.FRONTEND_DIST ?? '',
} as const;
