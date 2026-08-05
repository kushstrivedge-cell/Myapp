import {createServer} from 'node:http';
import {setTimeout as setNodeTimeout} from 'node:timers';
import {app} from './app.js';
import {env} from './config/env.js';
import {prisma} from './lib/prisma.js';

const server = createServer(app);
server.listen(env.PORT, '0.0.0.0', () => console.info(`Cartly API listening on http://localhost:${env.PORT}`));

const shutdown = (signal: string) => {
  console.info(`${signal} received; shutting down`);
  server.close(() => {void prisma.$disconnect().finally(() => process.exit(0));});
  setNodeTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
