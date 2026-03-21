import fs from 'fs';
import { logger } from '../utils/logger';
import { openApiDocument } from './openapi';

fs.writeFileSync('openapi.json', JSON.stringify(openApiDocument, null, 2));
logger.info('✅ Generated openapi.json');
