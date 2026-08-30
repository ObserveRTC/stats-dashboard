/**
 * Local answer provider for the "Ask about this call" panel.
 *
 * This is a stand-in, not a language model: it keyword-matches the question
 * and answers from the dashboard's own view model, so every number it states
 * is one the page is already showing. Swap it for a real endpoint by passing
 * a different `answerProvider` to <CallChatPanel>.
 */

import type { DashboardModel, DashboardClient } from './dashboardModel.ts';
import { POOR_SCORE_THRESHOLD } from './dashboardModel.ts';

export type CallAnswerProvider = (
  question: string,
  model: DashboardModel,
) => string | Promise<string>;

function scored(model: DashboardModel): DashboardClient[] {
  return model.clients.filter((p) => p.score != null);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length / 2;
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[mid - 1] + s[mid]) / 2;
}

function overview(model: DashboardModel): string {
  const withScore = scored(model);
  const head = `${model.clientCount} client${model.clientCount === 1 ? '' : 's'} over ${model.durationLabel}`;

  if (withScore.length === 0) {
    return `This call had ${head}. There are no per-client quality metrics in the summary yet, so I can only speak to the topology: ${model.routerRows.length} router${model.routerRows.length === 1 ? '' : 's'} across ${model.topology.labels.length} SFU${model.topology.labels.length === 1 ? '' : 's'}.`;
  }

  const med = median(withScore.map((p) => p.score as number));
  const issues = model.clients.reduce(
    (a, p) => a + p.series.filter((v) => v < POOR_SCORE_THRESHOLD).length,
    0,
  );

  return `This call had ${head}. Median quality was ${med?.toFixed(1)}/5${
    issues > 0
      ? `, with ${issues} sample${issues === 1 ? '' : 's'} dropping into the poor range.`
      : ', and no samples fell into the poor range.'
  }`;
}

function worstConnection(model: DashboardModel): string {
  const withScore = scored(model);
  if (withScore.length === 0) {
    return 'The call summary carries no per-client quality metrics yet, so I cannot rank connections.';
  }

  const worst = withScore.reduce((a, b) =>
    (a.score as number) <= (b.score as number) ? a : b,
  );
  const parts = [`${worst.name} had the lowest quality at ${worst.scoreDisplay}`];
  if (worst.rttDisplay !== '—') parts.push(`median RTT ${worst.rttDisplay}`);
  if (worst.lossDisplay !== '—') parts.push(`P95 loss ${worst.lossDisplay}`);
  if (worst.turnConnected) parts.push('relayed through TURN');
  if (worst.rejoins > 0) parts.push(`${worst.rejoins} rejoin${worst.rejoins === 1 ? '' : 's'}`);
  return `${parts.join(', ')}.`;
}

function turnAnswer(model: DashboardModel): string {
  const relayed = model.clients.filter((p) => p.turnConnected);
  if (!model.hasQualityMetrics) {
    return 'TURN usage is not in this call summary yet.';
  }
  if (relayed.length === 0) return 'No client needed a TURN relay on this call.';
  return `${relayed.length} client${relayed.length === 1 ? '' : 's'} were relayed through TURN: ${relayed.map((p) => p.name).join(', ')}.`;
}

function topologyAnswer(model: DashboardModel): string {
  const routers = model.routerRows.length;
  if (routers === 0) return 'No router samples were loaded for this call.';
  const producers = model.routerRows.reduce((a, r) => a + r.producersTotal, 0);
  const consumers = model.routerRows.reduce((a, r) => a + r.consumersTotal, 0);
  const pipes = model.topology.pipes.length;
  return `${routers} router${routers === 1 ? '' : 's'} across ${model.topology.labels.length} SFU${model.topology.labels.length === 1 ? '' : 's'}, carrying ${producers} producers and ${consumers} consumers${pipes > 0 ? `, linked by ${pipes} pipe transport${pipes === 1 ? '' : 's'}` : ''}.`;
}

function issuesAnswer(model: DashboardModel): string {
  const offenders = model.clients
    .map((p) => ({ p, count: p.series.filter((v) => v < POOR_SCORE_THRESHOLD).length }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  if (!model.hasQualityMetrics) {
    return 'Quality samples are not in this call summary yet, so I cannot count freezes or drops.';
  }
  if (offenders.length === 0) {
    return 'No client dropped into the poor quality range during this call.';
  }
  return `Poor-quality samples came from ${offenders
    .slice(0, 3)
    .map((x) => `${x.p.name} (${x.count})`)
    .join(', ')}${offenders.length > 3 ? `, plus ${offenders.length - 3} more` : ''}.`;
}

export const localCallAnswers: CallAnswerProvider = (question, model) => {
  const q = question.toLowerCase();

  if (q.includes('worst') || q.includes('bad') || q.includes('poor')) return worstConnection(model);
  if (q.includes('turn') || q.includes('relay')) return turnAnswer(model);
  if (q.includes('router') || q.includes('sfu') || q.includes('pipe') || q.includes('topolog')) {
    return topologyAnswer(model);
  }
  if (q.includes('freeze') || q.includes('drop') || q.includes('issue') || q.includes('glitch')) {
    return issuesAnswer(model);
  }
  if (q.includes('overall') || q.includes('how did') || q.includes('summary') || q.includes('go')) {
    return overview(model);
  }

  return `${overview(model)} Ask me about a specific client, TURN usage, the router topology, or where the issues were.`;
};

/** The opening message, shown before the first question. */
export function openingMessage(model: DashboardModel): string {
  return `${overview(model)} Ask me anything about it.`;
}

export const QUICK_PROMPTS = [
  'How did the call go overall?',
  'Who had the worst connection?',
  'Which clients used TURN?',
  'Any freezes or drops?',
];
