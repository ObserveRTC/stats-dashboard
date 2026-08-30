/**
 * The in-app explanations, and the wiring that reaches them.
 *
 *   node --experimental-strip-types scripts/help.test.ts
 *
 * Two failure modes, both silent in a browser:
 *
 *   1. A component references a topic id that does not exist. `InfoIcon`
 *      renders nothing for an unknown id — deliberately, so a missing entry is
 *      an absent icon rather than a panel apologising — which means a typo
 *      removes an explanation without any visible error at all.
 *   2. A topic exists but says nothing useful. These are user-facing copy for
 *      a reader who does not know what a consumer is, so an entry that leans on
 *      the jargon it is supposed to be translating has failed at its only job.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { HELP_TOPICS, getHelpTopic, hasHelpTopic, type HelpTopic } from '../src/help/helpTopics.ts';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const entries = Object.entries(HELP_TOPICS);

/* Every .tsx/.ts under src/, for the wiring checks. */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (path.endsWith('.tsx') || path.endsWith('.ts')) out.push(path);
  }
  return out;
}
const files = sourceFiles('src').filter((f) => !f.endsWith('helpTopics.ts'));
const sources = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));

console.log('the registry');

check('there are explanations, and every one is keyed by its own id', () => {
  assert.ok(entries.length >= 40, `expected a populated registry, got ${entries.length}`);
  for (const [key, topic] of entries) {
    assert.equal(topic.id, key, `${key} is keyed inconsistently`);
  }
});

check('every topic answers what it is and why it matters', () => {
  for (const [key, topic] of entries) {
    assert.ok(topic.title.length > 0, `${key} has no title`);
    // Long enough to be a sentence rather than a restated label. "Duration:
    // the duration" is the failure this catches.
    assert.ok(topic.what.length > 40, `${key}: "what" is too short to explain anything`);
    assert.ok(topic.why.length > 40, `${key}: "why" is too short to explain anything`);
  }
});

check('a title is a noun phrase, not a sentence', () => {
  for (const [key, topic] of entries) {
    assert.ok(!topic.title.endsWith('.'), `${key}: title reads as a sentence`);
    assert.ok(topic.title.length <= 40, `${key}: title is too long to head a panel`);
  }
});

check('prose is prose — no unclosed markup or stray placeholders', () => {
  for (const [key, topic] of entries) {
    for (const [field, text] of Object.entries(topic)) {
      if (typeof text !== 'string') continue;
      assert.ok(!text.includes('TODO'), `${key}.${field} still has a TODO`);
      assert.ok(!text.includes('<'), `${key}.${field} contains markup`);
      assert.ok(!/\s{2,}/.test(text), `${key}.${field} has doubled whitespace`);
      assert.ok(text.trim() === text, `${key}.${field} has surrounding whitespace`);
    }
  }
});

check('an acronym is expanded the first time the reader could meet it', () => {
  // A topic that opens with a bare acronym is explaining jargon with jargon.
  const expansions: Record<string, RegExp> = {
    'concept/turn': /relay/i,
    'concept/sfu': /Selective Forwarding Unit/,
    'concept/ice': /candidate/i,
    'concept/rtt': /round-trip|round trip/i,
  };
  for (const [id, pattern] of Object.entries(expansions)) {
    const topic = getHelpTopic(id);
    assert.ok(topic, `${id} is missing`);
    assert.match(`${topic!.title} ${topic!.what}`, pattern, `${id} never explains its acronym`);
  }
});

console.log('\nthe headline numbers all have one');

check('every stat card on the call page carries a topic', () => {
  for (const id of [
    'call/duration',
    'call/clients',
    'call/avg-quality',
    'call/turn-users',
    'call/issues',
    'call/rejoins',
  ]) {
    assert.ok(hasHelpTopic(id), `${id} is missing`);
  }
});

check('the concepts every other topic leans on are defined', () => {
  for (const id of [
    'concept/quality-score',
    'concept/score-reasons',
    'concept/rtt',
    'concept/jitter',
    'concept/packet-loss',
    'concept/turn',
    'concept/sfu',
    'concept/producer-consumer',
    'concept/transport',
    'concept/ice',
  ]) {
    assert.ok(hasHelpTopic(id), `${id} is missing`);
  }
});

console.log('\nthe wiring');

/**
 * Every topic id referenced from application code.
 *
 * Two spellings, because topics reach the UI two ways: as a JSX prop
 * (`help="call/issues"`) on a section or icon, and as a field on a view model
 * (`help: 'call/duration'`) for the stat cards, which are data rather than
 * markup. Matching only the first silently exempts every headline card on the
 * call page from these checks.
 */
function referencedIds(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const patterns = [/\b(?:help|topic)="([^"]+)"/g, /\b(?:help|topic):\s*'([^']+)'/g];
  for (const [file, text] of sources) {
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        const id = match[1];
        found.set(id, [...(found.get(id) ?? []), file]);
      }
    }
  }
  return found;
}

check('every topic a component asks for exists', () => {
  // The one that actually bites: a renamed id silently removes an icon.
  const missing: string[] = [];
  for (const [id, where] of referencedIds()) {
    if (!hasHelpTopic(id)) missing.push(`${id} (referenced from ${where.join(', ')})`);
  }
  assert.deepEqual(missing, [], `components reference topics that do not exist:\n  ${missing.join('\n  ')}`);
});

check('the explanations are actually reachable from the UI', () => {
  const referenced = referencedIds();
  assert.ok(referenced.size >= 25, `only ${referenced.size} topics are wired up`);
  // Concept topics are reference material and may be linked later; every other
  // topic exists to be opened from a specific control.
  const orphans = entries
    .map(([id]) => id)
    .filter((id) => !id.startsWith('concept/') && !referenced.has(id));
  assert.deepEqual(orphans, [], `topics nothing opens:\n  ${orphans.join('\n  ')}`);
});

check('the help icon sits outside the section toggle, not inside it', () => {
  // A button nested in a button is invalid HTML, and clicking the help would
  // collapse the section instead of explaining it.
  const section = sources.get(join('src', 'components', 'sections', 'CollapsibleSection.tsx'));
  assert.ok(section, 'CollapsibleSection not found');
  const toggleOpen = section!.indexOf('className={styles.toggle}');
  const toggleClose = section!.indexOf('</button>', toggleOpen);
  const icon = section!.indexOf('<InfoIcon');
  assert.ok(icon > toggleClose, 'the InfoIcon is nested inside the toggle button');
});

check('an unknown id resolves to nothing rather than a placeholder', () => {
  assert.equal(getHelpTopic('nope/not-a-topic'), undefined);
  assert.equal(hasHelpTopic('nope/not-a-topic'), false);
});

console.log('\nwhat the copy must not do');

check('no topic tells the reader to contact somebody or read the source', () => {
  // Both are non-answers in a panel whose whole job is to answer.
  for (const [key, topic] of entries) {
    const all = Object.values(topic).join(' ').toLowerCase();
    for (const phrase of ['contact your', 'see the source', 'refer to the code', 'ask your administrator']) {
      assert.ok(!all.includes(phrase), `${key} punts with "${phrase}"`);
    }
  }
});

check('a "watch out" names a real misreading, not a disclaimer', () => {
  const withWatchOut = entries.filter(([, t]) => t.watchOut);
  assert.ok(withWatchOut.length >= 12, 'the traps are the most valuable part; there should be many');
  for (const [key, topic] of withWatchOut) {
    assert.ok((topic.watchOut as string).length > 50, `${key}: watchOut is too short to be a caution`);
  }
});

check('the score topics say the score cannot see everything', () => {
  // The single most important caveat on the page: a perfect score on a call
  // where somebody was on mute is not a contradiction.
  const score = getHelpTopic('concept/quality-score') as HelpTopic;
  assert.ok(score.watchOut, 'the quality score must carry its limits');
  assert.match(score.watchOut!, /measure|experienc/i);
});

console.log('\nevery chart explains itself');

check('no MiniChart ships with a title and no description', () => {
  // The chart's own info tip is the only explanation a metric chart gets, and
  // a title like "Width" or "Total Audio Energy" tells a non-specialist
  // nothing. A chart added without one is the easiest way to reintroduce an
  // unexplained number, so the check is structural rather than a convention.
  const missing: string[] = [];
  for (const [file, text] of sources) {
    for (const match of text.matchAll(/<MiniChart\b/g)) {
      const segment = text.slice(match.index, match.index + 900);
      const end = segment.indexOf('/>');
      const element = end > 0 ? segment.slice(0, end) : segment;
      // A chart built from a spread of props declares its description there.
      if (element.includes('description=') || element.includes('{...')) continue;
      // ...as does one whose props come from a ChartDef, which carries `tip`.
      if (element.includes('c.tip') || element.includes('.tip}')) continue;
      const title = /title=\{?["`]([^"`}]{0,60})/.exec(element)?.[1] ?? '(untitled)';
      missing.push(`${file}: ${title}`);
    }
  }
  assert.deepEqual(missing, [], `charts with no explanation:\n  ${missing.join('\n  ')}`);
});

console.log(`\n${passed} checks passed`);
