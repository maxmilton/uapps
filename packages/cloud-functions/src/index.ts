// https://firebase.google.com/docs/functions/typescript
// https://firebase.google.com/docs/functions/manage-functions#set_timeout_and_memory_allocation

// https://firebase.google.com/docs/emulator-suite/install_and_configure#configure_emulator_suite

// TODO: Optimise networking, including connection reuse between function invocations
//  ↳ https://firebase.google.com/docs/functions/networking

import functions from 'firebase-functions';
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
trackx.meta.NODE_ENV = process.env.NODE_ENV || 'NULL';
trackx.ping();

export const timerPing = functions
  .runWith({
    timeoutSeconds: 10,
    memory: '128MB',
  })
  .pubsub.schedule('every 5 minutes')
  // .schedule('every 6 hours')
  .onRun((_context) => {
    trackx.ping();
    return null;
  });