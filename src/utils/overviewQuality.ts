import type { PeriodSummary } from '../digest/types.ts';
import { orderedSections, checkDefinition } from '../digest/index.ts';

export function overviewQuality(doc: PeriodSummary) {
  const c = doc.classification;
  const classifications = c ? [
    {label: 'QoE symptom evidence', count: c.qoeSymptom, tone: 'symptom'},
    {label: 'QoS conditions only', count: c.qosOnly, tone: 'qos'},
    {label: 'No detected issue within coverage', count: c.noIssueWithinCoverage, tone: 'passed'},
    {label: 'Insufficient evidence', count: c.insufficientEvidence, tone: 'unknown'},
  ] : [];
  const sections = orderedSections().map(s => {
    const checks = doc.checks.filter(c => checkDefinition(c.id)?.section === s.id);
    return {...s, failed: checks.reduce((n,c)=>n+c.counts.failed,0), passed: checks.reduce((n,c)=>n+c.counts.passed,0), unknown: checks.reduce((n,c)=>n+c.counts.notAssessable,0), ineligible: checks.reduce((n,c)=>n+c.counts.notApplicable,0)};
  });
  const coverage = typeof doc.totals.assessedSeconds === 'number' && typeof doc.totals.observedSeconds === 'number' && doc.totals.observedSeconds > 0 ? doc.totals.assessedSeconds / doc.totals.observedSeconds : null;
  return {classifications, sections, coverage};
}

export function overviewSelection(search: string, now = Date.now()) {
  const params = new URLSearchParams(search);
  const month = params.get('month');
  const day = params.get('day');
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const date = new Date(`${month}-01T00:00:00Z`);
    if (Number.isFinite(date.getTime()) && date.toISOString().slice(0,7) === month) return {period: 'month' as const, id: month};
  }
  if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const date = new Date(`${day}T00:00:00Z`);
    if (Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === day) return {period: 'day' as const, id: day};
  }
  return {period:'day' as const, id:new Date(now).toISOString().slice(0,10)};
}
