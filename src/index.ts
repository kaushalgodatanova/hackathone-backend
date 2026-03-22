import { createServer } from '../src/server';
import { loadEnv } from '../src/config/env';

loadEnv();

const app = createServer();

export default app;
