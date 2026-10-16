import assert from 'node:assert/strict';
import {overviewQuality, overviewSelection} from '../src/utils/overviewQuality.ts';
import type {PeriodSummary} from '../src/digest/types.ts';
const doc = {totals:{observedSeconds:100,assessedSeconds:60},classification:{qoeSymptom:2,qosOnly:3,noIssueWithinCoverage:4,insufficientEvidence:1},checks:[{id:'video.receive.freeze',counts:{failed:2,passed:3,notAssessable:4,notApplicable:1,evaluated:10}},{id:'video.receive.decode',counts:{failed:1,passed:2,notAssessable:5,notApplicable:2,evaluated:10}}]} as unknown as PeriodSummary;
const view=overviewQuality(doc);
assert.equal(view.coverage,.6);
assert.equal(view.classifications.reduce((n,c)=>n+c.count,0),10);
const video=view.sections.find(s=>s.id==='received-video')!;
assert.deepEqual([video.failed,video.passed,video.unknown,video.ineligible],[3,5,9,3]);
assert.equal(overviewQuality({...doc,totals:{...doc.totals,observedSeconds:0}}).coverage,null);
assert.equal(overviewQuality({...doc,totals:{calls:0,clientSessions:0,clientSessionsAssessed:0}}).coverage,null);
assert.deepEqual(overviewQuality({...doc,classification:undefined}).classifications,[]);
console.log('Overview charts: coverage denominators, absent evidence, disjoint classification and overlapping check totals passed.');

const now = Date.parse('2026-10-16T12:00:00Z');
assert.deepEqual(overviewSelection('?month=2026-09',now),{period:'month',id:'2026-09'});
assert.deepEqual(overviewSelection('?day=2026-02-28',now),{period:'day',id:'2026-02-28'});
for(const query of ['?day=2026-02-31','?month=2026-13','?day=garbage','']) assert.deepEqual(overviewSelection(query,now),{period:'day',id:'2026-10-16'});
console.log('Overview URL state: day/month selection and real calendar date validation passed.');
