/// <reference types="node" />

import { logger } from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';
// biome-ignore lint/style/noNamespaceImport: More readable
import * as trackx from 'trackx/node';

// https://dash.trackx.app/projects/uapps
trackx.setup(
  'https://api.trackx.app/v1/ze3tss9sk1z',
  process.env.NODE_ENV === 'production'
    ? 'https://us-central1-mm-uapps.cloudfunctions.net'
    : 'http://localhost:6001',
);
trackx.meta.app = 'cloud-functions';
trackx.meta.release = process.env.APP_RELEASE;
trackx.meta.NODE_ENV = process.env.NODE_ENV ?? 'NULL';
trackx.ping();

// Ping trackx every hour for testing purposes
export const trackxPingTask = onSchedule(
  {
    schedule: '0 * * * *', // hourly
    memory: '128MiB',
    timeoutSeconds: 10,
  },
  () => {
    try {
      // NOTE: The ping is sent twice when the cloud function boots up, once for
      // the function and once for the main script, but it's not an issue because
      // the session is still calculated correctly.
      trackx.ping();
    } catch (error) {
      logger.error(error);
      throw error;
    }
  },
);
