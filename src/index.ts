import { loadEnv } from './config/env';
import { startServer } from './server';

loadEnv();
startServer();
