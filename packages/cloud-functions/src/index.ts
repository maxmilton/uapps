// https://firebase.google.com/docs/functions/typescript
// https://firebase.google.com/docs/functions/manage-functions#set_timeout_and_memory_allocation
// https://firebase.google.com/docs/functions/schedule-functions
// https://firebase.google.com/docs/emulator-suite/install_and_configure#configure_emulator_suite

// TODO: Optimise networking, including connection reuse between function invocations
//  ↳ https://firebase.google.com/docs/functions/networking

/// <reference types="node" />

// import * as functions from 'firebase-functions';
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

// // Ping trackx periodically for testing purposes
// export const timerPing = functions
//   .runWith({
//     timeoutSeconds: 10,
//     memory: '128MB',
//   })
//   .pubsub.schedule('every 60 minutes')
//   .onRun(() => {
//     // XXX: The ping is sent twice when the cloud founction boots up, once for
//     // the function and once for the main script, it's not an issue because the
//     // session is calculated correctly, but worth knowing
//     trackx.ping();
//     return null;
//   });
