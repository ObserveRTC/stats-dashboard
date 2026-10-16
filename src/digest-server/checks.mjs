/**
 * The rules. One function per catalogue check, answering it for one client.
 *
 * Each rule receives the normalized client from `series.mjs` and returns a
 * `clientCheck` as the contract defines it. A rule may read nothing else — not
 * the raw samples, not another client, not the call summary. That is what keeps
 * the scope boundary checkable: baseline statistics, built-in events, built-in
 * issues, built-in metadata, and nothing beyond.
 *
 * ## The shape of every rule
 *
 * Three questions in order, and the order is the honesty:
 *
 *   1. Does this subject exist at all?  -> not-applicable
 *   2. Is the evidence present?         -> not-assessable, with `why`
 *   3. Does the rule fire?              -> failed, with observed values
 *                                       -> otherwise passed
 *
 * Step 2 before step 3 is the whole discipline. Checking "did the fault happen"
 * first and defaulting to `passed` is how an absent counter becomes a healthy
 * call — the single defect that made v1's output untrustworthy.
 *
 * ## Issues corroborate; they do not decide
 *
 * A built-in issue firing is a report from a detector. It is good evidence and
 * it is attached to the outcome, but a check whose statistic is missing stays
 * `not-assessable` even when an issue fired, and a check whose statistic is
 * present does not need an issue to fail. The detector and the counter are two
 * witnesses, and the contract prefers the one that can be re-derived.
 */

import { ISSUE_TYPES_BY_CHECK, EVENT_TYPES_BY_CHECK, checkDefinition } from './registry.mjs';
import { intervalsOf } from './series.mjs';

const iso = (ms) => (typeof ms === 'number' && Number.isFinite(ms) ? new Date(ms).toISOString() : undefined);

/** Build an outcome, attaching the issues and events the catalogue claims. */
function result(client, id, outcome, extra = {}) {
  const issues = client.issuesOfType(ISSUE_TYPES_BY_CHECK[id] ?? new Set());
  const events = client.eventsOfType(EVENT_TYPES_BY_CHECK[id] ?? new Set());

  const out = { id, outcome };
  if (extra.subject) out.subject = extra.subject;
  if (extra.rule) out.rule = extra.rule;
  if (extra.why) out.why = extra.why;
  if (extra.observed?.length) out.observed = extra.observed;
  if (extra.interval) out.interval = extra.interval;

  // Issues and events ride along on any outcome, not only a failure: an
  // unassessable check with a detector report is a meaningfully different thing
  // to show than an unassessable check with nothing at all.
  if (issues.length) {
    out.issues = issues.map((i) => ({
      type: i.type,
      at: iso(i.timestamp) ?? iso(client.coverage.firstAt),
      ...(i.payload && typeof i.payload === 'object' ? { payload: i.payload } : {}),
    })).filter((i) => i.at);
  }
  if (events.length) {
    out.events = events.map((e) => ({ type: e.type, at: iso(e.timestamp) })).filter((e) => e.at);
  }
  if (extra.evidence?.length) out.evidence = extra.evidence;
  return out;
}

const value = (label, v, unit, threshold) => ({
  label,
  value: v === undefined ? null : v,
  unit,
  ...(threshold === undefined ? {} : { threshold }),
});

/**
 * Walk every interval of every series, accumulating a numerator and a
 * denominator, and report whether ANY field was ever present.
 *
 * `sawField` is what separates "reported none" from "did not report". Without
 * it a rule cannot tell a clean call from an unobserved one.
 */
function fold(seriesList, fields, step) {
  let sawField = false;
  let intervals = 0;
  const state = {};
  for (const entry of seriesList) {
    for (const iv of intervalsOf(entry)) {
      intervals += 1;
      for (const f of fields) {
        if (iv.delta(f) !== undefined || iv.value(f) !== undefined) sawField = true;
      }
      step(iv, state, entry);
    }
  }
  return { sawField, intervals, state };
}

/** First interval where `predicate` holds, for the failure's time bounds. */
function firstMatch(seriesList, predicate) {
  for (const entry of seriesList) {
    for (const iv of intervalsOf(entry)) {
      if (predicate(iv)) return { entry, iv };
    }
  }
  return null;
}

function spanOf(seriesList, predicate) {
  let from;
  let to;
  for (const entry of seriesList) {
    for (const iv of intervalsOf(entry)) {
      if (!predicate(iv)) continue;
      if (from === undefined || iv.from < from) from = iv.from;
      if (to === undefined || iv.to > to) to = iv.to;
    }
  }
  return from === undefined ? undefined : { from: iso(from), to: iso(to) };
}

const consumerEvidence = (statId, chart, interval) => [
  { target: 'consumer', ...(statId ? { id: statId } : {}), ...(chart ? { chart } : {}), ...(interval ? { interval } : {}) },
  ...(interval ? [{ target: 'samples', interval }] : []),
];

const producerEvidence = (statId, chart, interval) => [
  { target: 'producer', ...(statId ? { id: statId } : {}), ...(chart ? { chart } : {}), ...(interval ? { interval } : {}) },
  ...(interval ? [{ target: 'samples', interval }] : []),
];

const transportEvidence = (statId, chart, interval) => [
  { target: 'transport', ...(statId ? { id: statId } : {}), ...(chart ? { chart } : {}), ...(interval ? { interval } : {}) },
  ...(interval ? [{ target: 'samples', interval }] : []),
];

/* ── a reusable rule for "a counter increased on this kind of track" ──────── */

/**
 * The shape most receive-side checks share.
 *
 * Fails when `counter` advanced. Not assessable when the platform never
 * reported `counter` at all — which is the case that must not read as a pass,
 * and is the reason this is one function rather than nine near-copies.
 */
function counterIncreased(client, id, { series, counter, extras = [], label, unit = 'count', chart, evidence = consumerEvidence, media }) {
  const def = checkDefinition(id);
  if (series.length === 0) {
    return result(client, id, 'not-applicable', { why: def.notApplicableWhen });
  }

  const { sawField, state } = fold(series, [counter, ...extras.map((e) => e.field)], (iv, s) => {
    const d = iv.delta(counter);
    if (d === undefined) return;
    s.total = (s.total ?? 0) + d;
    for (const extra of extras) {
      const e = iv.delta(extra.field);
      if (e !== undefined) s[extra.field] = (s[extra.field] ?? 0) + e;
    }
  });

  if (!sawField) {
    return result(client, id, 'not-assessable', {
      why: `${counter} was never reported on any inbound track in ${client.sampleCount} samples`,
      subject: { kind: 'inbound-track', ...(media ? { media } : {}) },
    });
  }

  const total = state.total ?? 0;
  if (total <= 0) {
    return result(client, id, 'passed', {
      observed: [value(label, 0, unit)],
      subject: { kind: 'inbound-track', ...(media ? { media } : {}) },
    });
  }

  const hit = firstMatch(series, (iv) => (iv.delta(counter) ?? 0) > 0);
  const interval = spanOf(series, (iv) => (iv.delta(counter) ?? 0) > 0);
  const observed = [value(label, total, unit)];
  for (const extra of extras) {
    const raw = state[extra.field];
    if (raw === undefined) continue;
    // Scaled explicitly, never inferred from the field name. The W3C duration
    // stats are in SECONDS, and a field called `...Duration` rendered as
    // milliseconds understates a two-second freeze by a factor of a thousand.
    const scaled = raw * (extra.scale ?? 1);
    observed.push(value(extra.label, Number(scaled.toFixed(1)), extra.unit));
  }

  return result(client, id, 'failed', {
    observed,
    interval,
    subject: { kind: 'inbound-track', id: hit?.entry.id, ...(media ? { media } : {}) },
    evidence: evidence(hit?.entry.id, chart, interval),
  });
}

/* ── received video ──────────────────────────────────────────────────────── */

const videoFreeze = (c) =>
  counterIncreased(c, 'video.receive.freeze', {
    series: c.inboundVideo,
    counter: 'freezeCount',
    extras: [{ field: 'totalFreezesDuration', label: 'Total freeze time', unit: 'ms', scale: 1000 }],
    label: 'Freezes',
    chart: 'inbound-video-flow',
    media: 'video',
  });

function videoDecode(client) {
  const id = 'video.receive.decode';
  const def = checkDefinition(id);
  if (client.inboundVideo.length === 0) {
    return result(client, id, 'not-applicable', { why: def.notApplicableWhen });
  }

  // Decode time per frame against the frame interval. Both are sums over the
  // interval and divided once at the end — a mean of per-interval ratios would
  // weight a two-frame interval like a sixty-frame one.
  const { sawField, state } = fold(client.inboundVideo, ['totalDecodeTime', 'framesDecoded'], (iv, s) => {
    const decode = iv.delta('totalDecodeTime');
    const frames = iv.delta('framesDecoded');
    if (decode === undefined || frames === undefined || frames <= 0) return;
    s.decodeMs = (s.decodeMs ?? 0) + decode * 1000; // W3C reports seconds
    s.frames = (s.frames ?? 0) + frames;
  });

  if (!sawField || state.frames === undefined) {
    return result(client, id, 'not-assessable', {
      why: 'totalDecodeTime or framesDecoded was never reported — common on platforms that do not expose decoder timing',
      subject: { kind: 'inbound-track', media: 'video' },
    });
  }

  const perFrameMs = state.decodeMs / state.frames;
  const THRESHOLD_MS = 1000 / 30; // one frame interval at 30fps
  const failed = perFrameMs > THRESHOLD_MS;
  const interval = failed ? spanOf(client.inboundVideo, (iv) => {
    const d = iv.delta('totalDecodeTime');
    const f = iv.delta('framesDecoded');
    return d !== undefined && f !== undefined && f > 0 && (d * 1000) / f > THRESHOLD_MS;
  }) : undefined;

  return result(client, id, failed ? 'failed' : 'passed', {
    rule: `Threshold ${THRESHOLD_MS.toFixed(1)} ms per frame.`,
    observed: [
      value('Decode time per frame', Number(perFrameMs.toFixed(2)), 'ms', Number(THRESHOLD_MS.toFixed(1))),
      value('Frames decoded', state.frames, 'count'),
    ],
    interval,
    subject: { kind: 'inbound-track', media: 'video' },
    evidence: failed ? consumerEvidence(undefined, 'inbound-decoder-load', interval) : undefined,
  });
}

function videoAssembly(client) {
  const id = 'video.receive.assembly';
  const def = checkDefinition(id);
  if (client.inboundVideo.length === 0) {
    return result(client, id, 'not-applicable', { why: def.notApplicableWhen });
  }

  const { sawField, state } = fold(client.inboundVideo, ['pliCount', 'keyFramesDecoded'], (iv, s) => {
    const pli = iv.delta('pliCount');
    const keys = iv.delta('keyFramesDecoded');
    if (pli !== undefined) s.pli = (s.pli ?? 0) + pli;
    if (keys !== undefined) s.keys = (s.keys ?? 0) + keys;
  });

  if (!sawField) {
    return result(client, id, 'not-assessable', {
      why: 'pliCount and keyFramesDecoded were never reported',
      subject: { kind: 'inbound-track', media: 'video' },
    });
  }

  // Recovery requested repeatedly with no keyframe following is the fault. PLIs
  // with keyframes arriving is normal operation under loss, not a finding.
  const pli = state.pli ?? 0;
  const keys = state.keys ?? 0;
  const failed = pli >= 5 && keys === 0;

  return result(client, id, failed ? 'failed' : 'passed', {
    rule: `Threshold: 5 or more recovery requests with no decoded keyframe.`,
    observed: [
      value('Recovery requests (PLI)', pli, 'count', 5),
      value('Keyframes decoded', keys, 'count'),
    ],
    subject: { kind: 'inbound-track', media: 'video' },
    evidence: failed ? consumerEvidence(undefined, 'inbound-pli-keyframe', undefined) : undefined,
  });
}

const videoPlayout = (c) =>
  counterIncreased(c, 'video.receive.playout', {
    series: c.inboundVideo,
    counter: 'framesDropped',
    label: 'Frames dropped',
    chart: 'inbound-playout',
    media: 'video',
  });

function videoCompression(client) {
  const id = 'video.receive.compression';
  const def = checkDefinition(id);
  if (client.inboundVideo.length === 0) {
    return result(client, id, 'not-applicable', { why: def.notApplicableWhen });
  }

  const { state } = fold(client.inboundVideo, ['bytesReceived', 'framesDecoded'], (iv, s) => {
    const bytes = iv.delta('bytesReceived');
    const frames = iv.delta('framesDecoded');
    const w = iv.value('frameWidth');
    const h = iv.value('frameHeight');
    if (bytes === undefined || frames === undefined || frames <= 0 || !w || !h) return;
    s.bits = (s.bits ?? 0) + bytes * 8;
    s.pixels = (s.pixels ?? 0) + frames * w * h;
  });

  if (state.pixels === undefined || state.pixels <= 0) {
    return result(client, id, 'not-assessable', {
      why: 'frame dimensions were never reported, so bits per pixel cannot be formed',
      subject: { kind: 'inbound-track', media: 'video' },
    });
  }

  const bpp = state.bits / state.pixels;
  const THRESHOLD = 0.04;
  const failed = bpp < THRESHOLD;

  return result(client, id, failed ? 'failed' : 'passed', {
    rule: `Threshold ${THRESHOLD} bits per pixel.`,
    observed: [value('Bits per pixel', Number(bpp.toFixed(4)), 'fraction', THRESHOLD)],
    subject: { kind: 'inbound-track', media: 'video' },
    evidence: failed ? consumerEvidence(undefined, 'inbound-bits-per-pixel', undefined) : undefined,
  });
}

/* ── received audio ──────────────────────────────────────────────────────── */

function audioConcealment(client) {
  const id = 'audio.receive.concealment';
  const def = checkDefinition(id);
  if (client.inboundAudio.length === 0) {
    return result(client, id, 'not-applicable', { why: def.notApplicableWhen });
  }

  const { sawField, state } = fold(client.inboundAudio, ['concealedSamples', 'totalSamplesReceived'], (iv, s) => {
    const concealed = iv.delta('concealedSamples');
    const total = iv.delta('totalSamplesReceived');
    if (concealed === undefined || total === undefined || total <= 0) return;
    s.concealed = (s.concealed ?? 0) + concealed;
    s.total = (s.total ?? 0) + total;
  });

  if (!sawField || state.total === undefined) {
    return result(client, id, 'not-assessable', {
      why: 'concealedSamples or totalSamplesReceived was never reported',
      subject: { kind: 'inbound-track', media: 'audio' },
    });
  }

  // A ratio of sums, divided once. Not a mean of interval ratios.
  const share = state.concealed / state.total;
  const THRESHOLD = 0.05;
  const failed = share > THRESHOLD;
  const interval = failed
    ? spanOf(client.inboundAudio, (iv) => {
        const c = iv.delta('concealedSamples');
        const t = iv.delta('totalSamplesReceived');
        return c !== undefined && t !== undefined && t > 0 && c / t > THRESHOLD;
      })
    : undefined;

  return result(client, id, failed ? 'failed' : 'passed', {
    rule: `Threshold ${THRESHOLD * 100}% of received samples.`,
    observed: [
      value('Concealed share', Number((share * 100).toFixed(2)), 'percent', THRESHOLD * 100),
      value('Samples received', state.total, 'count'),
    ],
    interval,
    subject: { kind: 'inbound-track', media: 'audio' },
    evidence: failed ? consumerEvidence(undefined, 'inbound-invented-speech', interval) : undefined,
  });
}

const audioSynthesized = (c) =>
  counterIncreased(c, 'audio.receive.synthesized', {
    series: c.inboundAudio,
    counter: 'insertedSamplesForDeceleration',
    label: 'Inserted samples',
    chart: 'inbound-invented-speech',
    media: 'audio',
  });

function audioJitterBuffer(client) {
  const id = 'audio.receive.jitterBuffer';
  const def = checkDefinition(id);
  if (client.inboundAudio.length === 0) {
    return result(client, id, 'not-applicable', { why: def.notApplicableWhen });
  }

  const { sawField, state } = fold(client.inboundAudio, ['jitterBufferDelay', 'jitterBufferEmittedCount'], (iv, s) => {
    const delay = iv.delta('jitterBufferDelay');
    const emitted = iv.delta('jitterBufferEmittedCount');
    if (delay === undefined || emitted === undefined || emitted <= 0) return;
    s.delaySeconds = (s.delaySeconds ?? 0) + delay;
    s.emitted = (s.emitted ?? 0) + emitted;
  });

  if (!sawField || state.emitted === undefined) {
    return result(client, id, 'not-assessable', {
      why: 'jitterBufferEmittedCount was never reported or never advanced',
      subject: { kind: 'inbound-track', media: 'audio' },
    });
  }

  // Seconds to milliseconds, explicitly. The W3C stat is in seconds and a
  // missing x1000 here reads as an impossibly good call.
  const meanMs = (state.delaySeconds / state.emitted) * 1000;
  const THRESHOLD_MS = 150;
  const failed = meanMs > THRESHOLD_MS;

  return result(client, id, failed ? 'failed' : 'passed', {
    rule: `Threshold ${THRESHOLD_MS} ms mean.`,
    observed: [value('Mean jitter buffer delay', Number(meanMs.toFixed(1)), 'ms', THRESHOLD_MS)],
    subject: { kind: 'inbound-track', media: 'audio' },
    evidence: failed ? consumerEvidence(undefined, 'inbound-jitter-buffer', undefined) : undefined,
  });
}

function audioSync(client) {
  const id = 'audio.receive.sync';
  const def = checkDefinition(id);
  if (client.inboundAudio.length === 0 || client.inboundVideo.length === 0) {
    return result(client, id, 'not-applicable', { why: def.notApplicableWhen });
  }

  // The only evidence in scope is the built-in detector: reconstructing
  // presentation offset from two jitter buffers needs a common playout clock
  // the stats do not carry. So this check is honest about resting on a detector
  // alone, and says not-assessable rather than passed when none fired.
  const fired = client.issuesOfType(ISSUE_TYPES_BY_CHECK[id]);
  if (fired.length > 0) {
    return result(client, id, 'failed', {
      observed: [value('Desync reports', fired.length, 'count')],
      interval: { from: iso(fired[0].timestamp), to: iso(fired[fired.length - 1].timestamp) },
      subject: { kind: 'inbound-track' },
      evidence: consumerEvidence(undefined, 'inbound-av-desync', undefined),
    });
  }

  return result(client, id, 'not-assessable', {
    why: 'sync is only knowable here from the built-in detector, and it reported nothing — which is not the same as proven in sync',
    subject: { kind: 'inbound-track' },
  });
}

/* ── capture and sending ─────────────────────────────────────────────────── */

function sendCaptureKeepUp(client) {
  const id = 'send.capture.keepUp';
  const def = checkDefinition(id);
  if (client.outboundVideo.length === 0) {
    return result(client, id, 'not-applicable', { why: def.notApplicableWhen });
  }

  const videoSources = client.mediaSources.filter((e) => (e.readings[0]?.kind ?? e.readings[0]?.mediaType) === 'video');
  const { sawField, state } = fold(videoSources, ['framesPerSecond'], (iv, s) => {
    const fps = iv.value('framesPerSecond');
    if (fps === undefined) return;
    s.samples = (s.samples ?? 0) + 1;
    s.sum = (s.sum ?? 0) + fps;
    s.min = s.min === undefined ? fps : Math.min(s.min, fps);
  });

  if (!sawField || !state.samples) {
    return result(client, id, 'not-assessable', {
      why: "the video media source's framesPerSecond was never reported",
      subject: { kind: 'outbound-track', media: 'video' },
    });
  }

  const mean = state.sum / state.samples;
  const THRESHOLD = 10;
  const failed = mean < THRESHOLD;

  return result(client, id, failed ? 'failed' : 'passed', {
    rule: `Threshold ${THRESHOLD} fps mean at the source.`,
    observed: [
      value('Mean capture rate', Number(mean.toFixed(1)), 'fps', THRESHOLD),
      value('Lowest capture rate', Number((state.min ?? 0).toFixed(1)), 'fps'),
    ],
    subject: { kind: 'outbound-track', media: 'video' },
    evidence: failed ? producerEvidence(undefined, 'outbound-capture-fps', undefined) : undefined,
  });
}

function sendEncodeKeepUp(client) {
  const id = 'send.encode.keepUp';
  const def = checkDefinition(id);
  if (client.outboundVideo.length === 0) {
    return result(client, id, 'not-applicable', { why: def.notApplicableWhen });
  }

  const { sawField, state } = fold(client.outboundVideo, ['totalEncodeTime', 'framesEncoded'], (iv, s) => {
    const encode = iv.delta('totalEncodeTime');
    const frames = iv.delta('framesEncoded');
    if (encode === undefined || frames === undefined || frames <= 0) return;
    s.encodeMs = (s.encodeMs ?? 0) + encode * 1000;
    s.frames = (s.frames ?? 0) + frames;
  });

  if (!sawField || state.frames === undefined) {
    return result(client, id, 'not-assessable', {
      why: 'totalEncodeTime was never reported',
      subject: { kind: 'outbound-track', media: 'video' },
    });
  }

  const perFrameMs = state.encodeMs / state.frames;
  const THRESHOLD_MS = 1000 / 30;
  const failed = perFrameMs > THRESHOLD_MS;

  return result(client, id, failed ? 'failed' : 'passed', {
    rule: `Threshold ${THRESHOLD_MS.toFixed(1)} ms per frame.`,
    observed: [
      value('Encode time per frame', Number(perFrameMs.toFixed(2)), 'ms', Number(THRESHOLD_MS.toFixed(1))),
      value('Frames encoded', state.frames, 'count'),
    ],
    subject: { kind: 'outbound-track', media: 'video' },
    evidence: failed ? producerEvidence(undefined, 'outbound-encoder', undefined) : undefined,
  });
}

function sendSourceAudio(client) {
  const id = 'send.source.audio';
  const def = checkDefinition(id);
  if (client.outboundAudio.length === 0) {
    return result(client, id, 'not-applicable', { why: def.notApplicableWhen });
  }

  const audioSources = client.mediaSources.filter((e) => (e.readings[0]?.kind ?? e.readings[0]?.mediaType) === 'audio');
  const { sawField, state } = fold(audioSources, ['audioLevel', 'totalAudioEnergy'], (iv, s) => {
    const energy = iv.delta('totalAudioEnergy');
    const level = iv.value('audioLevel');
    if (energy !== undefined) s.energy = (s.energy ?? 0) + energy;
    if (level !== undefined) s.peak = Math.max(s.peak ?? 0, level);
  });

  if (!sawField) {
    return result(client, id, 'not-assessable', {
      why: "the audio media source's audioLevel and totalAudioEnergy were never reported",
      subject: { kind: 'outbound-track', media: 'audio' },
    });
  }

  // A muted track is silent on purpose, which the catalogue calls
  // not-applicable rather than a fault.
  const muted = client.eventsOfType(new Set(['MEDIA_TRACK_MUTED', 'CAPTURE_TRACK_MUTED']));
  const unmuted = client.eventsOfType(new Set(['MEDIA_TRACK_UNMUTED', 'MEDIA_TRACK_RESUMED']));
  if (muted.length > 0 && unmuted.length === 0) {
    return result(client, id, 'not-applicable', {
      why: 'the outbound audio track was muted and never unmuted',
      subject: { kind: 'outbound-track', media: 'audio' },
    });
  }

  const energy = state.energy ?? 0;
  const failed = energy <= 0;

  return result(client, id, failed ? 'failed' : 'passed', {
    rule: `Fails when total audio energy never advanced on an unmuted track.`,
    observed: [
      value('Total audio energy', Number(energy.toFixed(6)), 'none', 0),
      value('Peak audio level', Number((state.peak ?? 0).toFixed(4)), 'dBov'),
    ],
    subject: { kind: 'outbound-track', media: 'audio' },
    evidence: failed ? producerEvidence(undefined, 'media-source-audio-level', undefined) : undefined,
  });
}

function sendFlow(client) {
  const id = 'send.flow';
  const def = checkDefinition(id);
  if (client.outboundAll.length === 0) {
    return result(client, id, 'not-applicable', { why: def.notApplicableWhen });
  }

  const { sawField, state } = fold(client.outboundAll, ['bytesSent', 'packetsSent'], (iv, s) => {
    const bytes = iv.delta('bytesSent');
    if (bytes === undefined) return;
    s.intervals = (s.intervals ?? 0) + 1;
    s.bytes = (s.bytes ?? 0) + bytes;
    if (bytes === 0) s.dry = (s.dry ?? 0) + 1;
  });

  if (!sawField || !state.intervals) {
    return result(client, id, 'not-assessable', {
      why: 'outbound byte counters reset with no usable interval either side',
      subject: { kind: 'outbound-track' },
    });
  }

  // A few empty intervals are ordinary (a paused track, silence suppression).
  // A majority of them while the track exists is a stall.
  const dryShare = (state.dry ?? 0) / state.intervals;
  const failed = dryShare > 0.5;
  const interval = failed ? spanOf(client.outboundAll, (iv) => iv.delta('bytesSent') === 0) : undefined;

  return result(client, id, failed ? 'failed' : 'passed', {
    rule: `Fails when more than half of the measured intervals carried no bytes.`,
    observed: [
      value('Intervals with no bytes', Number((dryShare * 100).toFixed(1)), 'percent', 50),
      value('Bytes sent', state.bytes ?? 0, 'bytes'),
    ],
    interval,
    subject: { kind: 'outbound-track' },
    evidence: failed ? producerEvidence(undefined, 'outbound-bitrate', interval) : undefined,
  });
}

function sendQualityLimitation(client) {
  const id = 'send.endpoint.qualityLimitation';
  const def = checkDefinition(id);
  if (client.outboundAll.length === 0) {
    return result(client, id, 'not-applicable', { why: def.notApplicableWhen });
  }

  let saw = false;
  const reasons = new Map();
  for (const entry of client.outboundAll) {
    for (const reading of entry.readings) {
      const reason = reading?.qualityLimitationReason;
      if (typeof reason !== 'string') continue;
      saw = true;
      if (reason !== 'none') reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
    }
  }

  if (!saw) {
    return result(client, id, 'not-assessable', {
      why: 'qualityLimitationReason was never reported, which is the case outside Chromium',
      subject: { kind: 'client' },
    });
  }

  const failed = reasons.size > 0;
  const top = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0];

  return result(client, id, failed ? 'failed' : 'passed', {
    observed: failed
      ? [
          value('Encoder-reported reason', top[0], 'none'),
          value('Readings reporting a limitation', top[1], 'count'),
        ]
      : [value('Encoder-reported reason', 'none', 'none')],
    subject: { kind: 'client' },
    evidence: failed ? producerEvidence(undefined, 'cpu-limitation', undefined) : undefined,
  });
}

/* ── transport and continuity ────────────────────────────────────────────── */

function transportRtt(client) {
  const id = 'transport.rtt';
  const def = checkDefinition(id);
  if (client.candidatePairs.length === 0 && client.remoteInbound.length === 0) {
    return result(client, id, 'not-applicable', { why: def.notApplicableWhen });
  }

  const THRESHOLD_MS = 300;
  let saw = false;
  let worstMs;
  let worstAt;
  const seenAt = new Set();

  // Fresh observations only. One stale remote report read once per local sample
  // would turn a single bad reading into a sustained fault.
  for (const entry of client.candidatePairs) {
    for (const reading of entry.readings) {
      const rtt = reading?.currentRoundTripTime;
      if (typeof rtt !== 'number' || !Number.isFinite(rtt)) continue;
      const stamp = reading.timestamp;
      const fingerprint = `${entry.id}:${rtt}:${stamp}`;
      if (seenAt.has(fingerprint)) continue;
      seenAt.add(fingerprint);
      saw = true;
      const ms = rtt * 1000;
      if (worstMs === undefined || ms > worstMs) {
        worstMs = ms;
        worstAt = stamp;
      }
    }
  }

  if (!saw) {
    return result(client, id, 'not-assessable', {
      why: 'no candidate-pair report carried currentRoundTripTime',
      subject: { kind: 'peer-connection' },
    });
  }

  const failed = worstMs > THRESHOLD_MS;
  return result(client, id, failed ? 'failed' : 'passed', {
    rule: `Threshold ${THRESHOLD_MS} ms, worst fresh observation.`,
    observed: [value('Worst round-trip time', Number(worstMs.toFixed(1)), 'ms', THRESHOLD_MS)],
    interval: failed ? { from: iso(worstAt), to: iso(worstAt) } : undefined,
    subject: { kind: 'peer-connection' },
    evidence: failed ? transportEvidence(undefined, 'ice-rtt', undefined) : undefined,
  });
}

function transportInboundLoss(client) {
  const id = 'transport.inboundLoss';
  const def = checkDefinition(id);
  if (client.inboundAll.length === 0) {
    return result(client, id, 'not-applicable', { why: def.notApplicableWhen });
  }

  const { sawField, state } = fold(client.inboundAll, ['packetsLost', 'packetsReceived'], (iv, s) => {
    const lost = iv.delta('packetsLost');
    const received = iv.delta('packetsReceived');
    if (lost === undefined || received === undefined) return;
    const total = lost + received;
    if (total <= 0) return;
    s.lost = (s.lost ?? 0) + lost;
    s.total = (s.total ?? 0) + total;
  });

  if (!sawField || state.total === undefined) {
    return result(client, id, 'not-assessable', {
      why: 'packetsLost was never reported, or both counters reset leaving no usable interval',
      subject: { kind: 'peer-connection' },
    });
  }

  const share = state.lost / state.total;
  const THRESHOLD = 0.05;
  const failed = share > THRESHOLD;
  const interval = failed
    ? spanOf(client.inboundAll, (iv) => {
        const l = iv.delta('packetsLost');
        const r = iv.delta('packetsReceived');
        return l !== undefined && r !== undefined && l + r > 0 && l / (l + r) > THRESHOLD;
      })
    : undefined;

  return result(client, id, failed ? 'failed' : 'passed', {
    rule: `Threshold ${THRESHOLD * 100}%, as a ratio of sums over the whole session.`,
    observed: [
      value('Inbound loss', Number((share * 100).toFixed(2)), 'percent', THRESHOLD * 100),
      value('Packets accounted for', state.total, 'count'),
    ],
    interval,
    subject: { kind: 'peer-connection' },
    evidence: failed ? transportEvidence(undefined, 'ice-loss', interval) : undefined,
  });
}

function transportOutboundLossRatio(client) {
  const id = 'transport.outboundLossRatio';
  const def = checkDefinition(id);
  if (client.outboundAll.length === 0) {
    return result(client, id, 'not-applicable', { why: def.notApplicableWhen });
  }

  // An availability check. Outbound loss is only knowable from a remote-inbound
  // report; with none, the honest answer is that we cannot tell. Reporting 0%
  // would be a claim nobody measured.
  let fractions = 0;
  for (const entry of client.remoteInbound) {
    for (const reading of entry.readings) {
      if (typeof reading?.fractionLost === 'number') fractions += 1;
    }
  }

  if (fractions === 0) {
    return result(client, id, 'not-assessable', {
      why: `no remote-inbound RTP report arrived in ${client.sampleCount} samples, so sent-packet loss cannot be formed`,
      subject: { kind: 'peer-connection' },
    });
  }

  return result(client, id, 'passed', {
    observed: [value('Remote reports carrying fractionLost', fractions, 'count')],
    subject: { kind: 'peer-connection' },
  });
}

function transportCongestion(client) {
  const id = 'transport.congestion';
  const def = checkDefinition(id);
  if (client.candidatePairs.length === 0) {
    return result(client, id, 'not-applicable', { why: def.notApplicableWhen });
  }

  let sawEstimate = false;
  for (const entry of client.candidatePairs) {
    for (const reading of entry.readings) {
      if (typeof reading?.availableOutgoingBitrate === 'number') sawEstimate = true;
    }
  }

  const fired = client.issuesOfType(ISSUE_TYPES_BY_CHECK[id]);
  if (!sawEstimate) {
    return result(client, id, 'not-assessable', {
      why: 'no available-bitrate estimate was reported, so a congestion report cannot be corroborated',
      subject: { kind: 'peer-connection' },
    });
  }

  if (fired.length > 0) {
    return result(client, id, 'failed', {
      observed: [value('Congestion reports', fired.length, 'count')],
      interval: { from: iso(fired[0].timestamp), to: iso(fired[fired.length - 1].timestamp) },
      subject: { kind: 'peer-connection' },
      evidence: transportEvidence(undefined, 'session-bitrate', undefined),
    });
  }

  return result(client, id, 'passed', {
    observed: [value('Congestion reports', 0, 'count')],
    subject: { kind: 'peer-connection' },
  });
}

function transportContinuity(client) {
  const id = 'transport.continuity';
  const def = checkDefinition(id);

  const stateEvents = client.eventsOfType(
    new Set(['ICE_CONNECTION_STATE_CHANGED', 'PEER_CONNECTION_STATE_CHANGED']),
  );
  if (client.candidatePairs.length === 0 && stateEvents.length === 0) {
    return result(client, id, 'not-applicable', { why: def.notApplicableWhen });
  }

  const fired = client.issuesOfType(ISSUE_TYPES_BY_CHECK[id]);
  // A state history is the corroborating evidence; the issue types are the
  // detector's verdict. With neither, nothing can be said.
  if (stateEvents.length === 0 && fired.length === 0) {
    return result(client, id, 'not-assessable', {
      why: 'no connection state history is available for the session',
      subject: { kind: 'peer-connection' },
    });
  }

  const bad = stateEvents.filter((e) => {
    const payload = e.payload ?? {};
    const value_ = String(payload.state ?? payload.iceConnectionState ?? payload.connectionState ?? '');
    return value_ === 'disconnected' || value_ === 'failed' || value_ === 'closed';
  });

  const failed = fired.length > 0 || bad.length > 0;
  return result(client, id, failed ? 'failed' : 'passed', {
    observed: [
      value('Interruption reports', fired.length, 'count'),
      value('Adverse state changes', bad.length, 'count'),
    ],
    interval: failed && bad.length
      ? { from: iso(bad[0].timestamp), to: iso(bad[bad.length - 1].timestamp) }
      : undefined,
    subject: { kind: 'peer-connection' },
    evidence: failed ? transportEvidence(undefined, 'ice-bytes', undefined) : undefined,
  });
}

/* ── data confidence ─────────────────────────────────────────────────────── */

function confidenceClientTime(client) {
  const id = 'confidence.clientTime';
  const def = checkDefinition(id);
  const { observedSeconds, assessedSeconds, unassessedSeconds, gaps } = client.coverage;

  if (client.sampleCount < 2) {
    return result(client, id, 'not-assessable', {
      why: `only ${client.sampleCount} sample(s) arrived, so no interval exists to measure`,
      subject: { kind: 'client' },
    });
  }

  // Not a quality fault: a statement about how much of the session the other
  // checks could speak for.
  const failed = observedSeconds > 0 && unassessedSeconds / observedSeconds > 0.05;
  return result(client, id, failed ? 'failed' : 'passed', {
    rule: `Fails above 5% unassessed.`,
    observed: [
      value('Observed', Number(observedSeconds.toFixed(1)), 's'),
      value('Assessed', Number(assessedSeconds.toFixed(1)), 's'),
      value('Unassessed', Number(unassessedSeconds.toFixed(1)), 's'),
      value('Gaps', gaps.length, 'count'),
    ],
    subject: { kind: 'client' },
    evidence: failed && gaps.length
      ? [{ target: 'samples', interval: { from: iso(gaps[0].fromMs), to: iso(gaps[0].toMs) } }]
      : undefined,
  });
}

function confidenceAssessment(client, context = {}) {
  const id = 'confidence.assessment';
  const def = checkDefinition(id);

  const monitorVersion = client.meta.find((m) => m?.type === 'BROWSER' || m?.payload?.monitorVersion);
  const missing = [];
  if (!context.callSummaryPresent) missing.push('the call summary was not readable');
  if (client.sampleCount === 0) missing.push('this client session has no samples');

  if (!monitorVersion && missing.length === 0) {
    return result(client, id, 'not-assessable', {
      why: 'the monitor version could not be read from client metadata',
      subject: { kind: 'client' },
    });
  }

  const failed = missing.length > 0;
  return result(client, id, failed ? 'failed' : 'passed', {
    why: failed ? missing.join('; ') : undefined,
    observed: [value('Samples read', client.sampleCount, 'count')],
    subject: { kind: 'client' },
  });
}

/* ── the engine ──────────────────────────────────────────────────────────── */

const RULES = {
  'video.receive.freeze': videoFreeze,
  'video.receive.decode': videoDecode,
  'video.receive.assembly': videoAssembly,
  'video.receive.playout': videoPlayout,
  'video.receive.compression': videoCompression,
  'audio.receive.concealment': audioConcealment,
  'audio.receive.synthesized': audioSynthesized,
  'audio.receive.jitterBuffer': audioJitterBuffer,
  'audio.receive.sync': audioSync,
  'send.capture.keepUp': sendCaptureKeepUp,
  'send.encode.keepUp': sendEncodeKeepUp,
  'send.source.audio': sendSourceAudio,
  'send.flow': sendFlow,
  'send.endpoint.qualityLimitation': sendQualityLimitation,
  'transport.rtt': transportRtt,
  'transport.inboundLoss': transportInboundLoss,
  'transport.outboundLossRatio': transportOutboundLossRatio,
  'transport.congestion': transportCongestion,
  'transport.continuity': transportContinuity,
  'confidence.clientTime': confidenceClientTime,
  'confidence.assessment': confidenceAssessment,
};

/** Which catalogue checks the engine implements. A test asserts this is all of them. */
export const IMPLEMENTED = new Set(Object.keys(RULES));

/**
 * Run every rule for one normalized client.
 *
 * A rule that throws becomes `not-assessable` rather than failing the whole
 * digest: one bad rule must not cost a call its other twenty answers, and
 * silently dropping the check would leave a hole the UI reads as "not
 * evaluated" with no reason attached.
 */
export function runChecks(client, context = {}) {
  const out = [];
  for (const [id, rule] of Object.entries(RULES)) {
    try {
      out.push(rule(client, context));
    } catch (err) {
      out.push({
        id,
        outcome: 'not-assessable',
        why: `the rule failed to run: ${err.message}`,
      });
    }
  }
  return out;
}
