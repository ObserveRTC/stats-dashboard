import assert from 'node:assert/strict';
import { clientEvidenceHref, digestAnswer } from '../src/utils/digestNavigation.ts';
import type { CallDigest } from '../src/digest/types.ts';
const doc = {call: {roomId: 'room', callId: 'call'}, clients: []} as unknown as CallDigest;
assert.equal(digestAnswer({state: 'ready', document: doc}, 'room', 'call').state, 'ready');
assert.equal(digestAnswer({state: 'ready', document: doc}, 'other-room', 'call').state, 'invalid');
assert.equal(digestAnswer({state: 'ready', document: doc}, 'room', 'other-call').state, 'invalid');
assert.equal(digestAnswer({state: 'ready'}, 'room', 'call').state, 'invalid');
for (const state of ['missing', 'invalid', 'unsupported-version', 'failed']) {
  const answer = digestAnswer({state, document: doc, reason: 'detail'}, 'room', 'call');
  assert.equal(answer.state, state); assert.equal(answer.document, null); assert.equal(answer.reason, 'detail');
}
for (const body of [null, [], {success:false}, {state:'healthy'}]) assert.equal(digestAnswer(body,'room','call').state, 'failed');
assert.equal(clientEvidenceHref('room/name','call?','client#',{target:'consumer',id:'unverified'}), '/room%2Fname/call%3F/client%23#consumers');
assert.equal(clientEvidenceHref('r','c','p',{target:'producer'}), '/r/c/p#producers');
assert.equal(clientEvidenceHref('r','c','p',{target:'transport'}), '/r/c/p#transports');
assert.equal(clientEvidenceHref('r','c','p',{target:'samples'}), '/r/c/p#sample-browser');
assert.equal(clientEvidenceHref('r','c','p'), '/r/c/p#client-context');
console.log('Digest UI boundary: read states, call/room identity, safe URLs and evidence destinations passed.');
