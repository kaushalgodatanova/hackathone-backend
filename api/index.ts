/**
 * Vercel serverless entry: one function handles all paths (see root vercel.json rewrites).
 */
import '../src/init-env';
import { createServer } from '../src/server';

export default createServer();
