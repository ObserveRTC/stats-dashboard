/**
 * Plain-language explanations for everything the dashboard shows.
 *
 * ## Who these are for
 *
 * Someone who has been handed a link because a call went badly, and who does
 * not know what a *consumer* is, what a *jitter buffer* does, or why a score of
 * 3.2 should worry them. The dashboard reports WebRTC internals faithfully, and
 * faithful reporting of internals is unreadable without a translation layer.
 * This is that layer.
 *
 * ## The shape, and why it is fixed
 *
 * Every topic answers the same four questions in the same order, because a
 * reader who has learned the shape once can skim it everywhere after that:
 *
 *   `what`       — what the thing is, in ordinary words, no acronyms unexpanded
 *   `why`        — the question it answers; why it is on the page at all
 *   `howToRead`  — what a good reading and a bad reading look like
 *   `watchOut`   — the misreading that looks like a finding and is not
 *
 * `watchOut` is the one that earns its place. Most wrong conclusions drawn from
 * a diagnostics dashboard come from a number that means something narrower than
 * it appears — a "0%" that means "not measured", a peak that is really a lower
 * bound, a frozen video that was a deliberately paused camera. Where such a
 * trap exists it is named; where none does the field is absent rather than
 * padded.
 *
 * ## Rules
 *
 * Prose here is user-facing copy, so it says what is true rather than what
 * would be reassuring: where the dashboard cannot know something, the topic
 * says so. Ids are stable strings — they appear in components, and a renamed id
 * silently removes an explanation, which `scripts/help.test.ts` exists to catch.
 */

export interface HelpTopic {
  /** Stable key. Referenced from components; never reuse or repurpose one. */
  id: string;
  /** Heading of the panel. A noun phrase, matching what the reader clicked. */
  title: string;
  what: string;
  why: string;
  howToRead?: string;
  /** The reading that looks like a finding and is not. Omit when there is none. */
  watchOut?: string;
}

function topics(list: HelpTopic[]): Record<string, HelpTopic> {
  const out: Record<string, HelpTopic> = {};
  for (const topic of list) out[topic.id] = topic;
  return out;
}

/* ── the ideas everything else is built on ─────────────── */

const CONCEPTS: HelpTopic[] = [
  {
    id: 'concept/quality-score',
    title: 'Quality score',
    what: 'A single number from 0 to 5 summarising how good a call felt, calculated in the participant’s own browser while the call was happening. 5 is flawless; 4 and above is good; 2.5 to 4 is noticeably imperfect; below 2.5 is bad enough that people complain.',
    why: 'It is the fastest way to find the person who had a bad time. Everything else on the dashboard explains *why* a score was low; the score is how you find out *who* to look at.',
    howToRead:
      'Each thing being scored — the network connection, each video track, each audio track — starts at a perfect 5 and has points subtracted for problems that were actually measured. A score of 3 means two points’ worth of problems, and the score reasons say which. A participant’s overall score is a weighted blend of theirs.',
    watchOut:
      'The score describes what the browser could measure, not what the person experienced. A call can score 5 while somebody was on mute, pointing at the ceiling, or in a noisy room — none of which is visible in network statistics.',
  },
  {
    id: 'concept/score-reasons',
    title: 'Score reasons',
    what: 'The named problems that took points off a score, each with how many points it cost — “high packet loss, −2”, “frozen video, −2”.',
    why: 'A low score on its own tells you nothing actionable. The reasons turn “this was bad” into “this was bad *because the uplink was losing packets*”, which is a different conversation with a different fix.',
    howToRead:
      'Rank by points, not by how often a reason appeared. A reason that fired once and cost 5 points ruined the call; one that fired constantly for 0.2 points each time is background noise. Reasons are attributed to the specific connection or track that raised them, so you can tell a bad network from one bad camera.',
    watchOut:
      'Recordings made by older client software carry the reason names without the points. Where that is the case the dashboard ranks by frequency instead and says so, rather than inventing magnitudes it does not have.',
  },
  {
    id: 'concept/rtt',
    title: 'Round-trip time (RTT)',
    what: 'How long a packet takes to get to the other end and back, in milliseconds. Essentially the physical and routing distance between the participant and the server.',
    why: 'It sets the floor on how conversational a call can feel. You cannot talk naturally over a long delay — people talk over each other, then over-correct and leave silences.',
    howToRead:
      'Under 100 ms is comfortable and most people never notice it. 150 ms is where turn-taking starts to feel slightly off. Above 300 ms conversation genuinely breaks down, and this is where the score penalty doubles.',
    watchOut:
      'A high RTT is often just geography — someone genuinely far from the server — and no amount of debugging will fix it. Check whether the connection was relayed through a TURN server first; that adds a detour and is fixable.',
  },
  {
    id: 'concept/jitter',
    title: 'Jitter',
    what: 'How irregularly packets arrive. Media is sent at an even pace; jitter is how much that pace has been scrambled by the time it arrives.',
    why: 'Sound and video have to be played back smoothly, so the receiver holds arriving packets in a buffer to even them out again. That buffer costs latency, and when jitter exceeds what it can absorb you get glitches instead.',
    howToRead:
      'Under 30 ms is unremarkable. Above 30 ms the receiver is working to hide it; above 100 ms it is largely failing and you should expect audible artifacts. Congested or wireless links are the usual cause.',
    watchOut:
      'Jitter and packet loss usually travel together and have the same underlying cause. Fixing “the jitter” separately is rarely a thing — the link is the problem.',
  },
  {
    id: 'concept/packet-loss',
    title: 'Packet loss',
    what: 'The share of packets that never arrived. Measured per interval, so it describes the network right now rather than averaged over the whole call.',
    why: 'It is the single most damaging thing that can happen to a call, and it carries the heaviest score penalty available — enough on its own to take a connection from perfect to zero.',
    howToRead:
      'Below 1% is normal and inaudible; audio codecs conceal it. 1–5% is noticeable. Above 5% is bad, and above 20% the call is effectively broken. Look at whether one stream or all of them are affected: one is a track problem, all of them is the network.',
    watchOut:
      'A percentile such as p95 is more informative than an average here. Loss that matters comes in bursts, and one terrible minute inside a good hour disappears into an average while a p95 still shows it.',
  },
  {
    id: 'concept/turn',
    title: 'TURN relay',
    what: 'A relay server used when two endpoints cannot reach each other directly. Instead of media flowing along the shortest path, it is bounced through a third machine.',
    why: 'It is a fallback, not a normal state. It means something — a firewall, a restrictive corporate network, carrier-grade NAT — blocked the direct route, and it costs extra latency and money for every relayed participant.',
    howToRead:
      'A relayed participant with a high round-trip time usually has one *because* of the relay. If most of a call is relayed, that points at network policy rather than at any individual.',
    watchOut:
      'Relaying is not itself a failure — it is the mechanism working as designed to rescue a connection that would otherwise not exist at all. Judge it by whether the call was good, not by its presence.',
  },
  {
    id: 'concept/sfu',
    title: 'SFU and routers',
    what: 'The server in the middle. Every participant sends their audio and video once to the SFU (Selective Forwarding Unit), which forwards copies to everyone else. A *router* is one SFU’s workspace for one call.',
    why: 'It is why a ten-person call does not require each person to upload nine copies of their video. It also means the server sits in the middle of every problem, so a fault there affects everybody while a fault in one participant’s network affects only them.',
    howToRead:
      'One problem across every participant at the same moment points at the server or the call. One participant bad while the rest are fine points at that participant’s network or device.',
    watchOut:
      'A large call can be spread across several SFUs linked together. When that happens some call-wide totals cannot be combined honestly, and the dashboard says which rather than adding up numbers that do not add up.',
  },
  {
    id: 'concept/producer-consumer',
    title: 'Producers and consumers',
    what: 'A producer is one stream a participant *sends* — their microphone, their camera, their screen share. A consumer is one stream a participant *receives*, forwarded by the server from somebody else’s producer.',
    why: 'It is the vocabulary the whole dashboard uses, and it tells you which side a problem is on. A broken producer means one person is sending badly and everybody sees it. A broken consumer means one person is receiving badly and only they see it.',
    howToRead:
      'If everyone’s consumer of Alice looks bad, look at Alice’s producer. If only Bob’s consumers look bad — all of them — look at Bob’s download path.',
  },
  {
    id: 'concept/transport',
    title: 'Transport / peer connection',
    what: 'The single encrypted pipe between one participant and the server that carries all of their audio, video and data.',
    why: 'Everything else rides on it. If the transport is disconnected or blocked, no track can possibly work, so it is the first thing to check when a participant has nothing at all.',
    howToRead:
      'It is assembled from several parts that connect in sequence — finding a network path (ICE), agreeing encryption (DTLS), and then media. The transport timeline shows each part as its own lane, so you can see which stage failed rather than only that the connection did.',
  },
  {
    id: 'concept/ice',
    title: 'ICE — finding a network path',
    what: 'The negotiation that works out how two endpoints can actually reach each other. Each side gathers *candidates* — possible addresses — pairs them up, tests every pair, and picks one that works.',
    why: 'It is where connections fail before they ever carry media, and the failures are informative: no candidates at all means the participant had no usable network; candidates that all fail means something is blocking them.',
    howToRead:
      'A healthy negotiation finds a pair, marks it succeeded, nominates it and selects it within a second or two. A path that is lost and re-selected mid-call shows up as repeated selections and usually means the network changed — Wi-Fi to cellular, or a VPN reconnecting.',
    watchOut:
      'Most candidates never being used is completely normal. A machine gathers every address it has, and all but one are expected to go nowhere.',
  },
];

/* ── the call page ─────────────────────────────────────── */

const CALL: HelpTopic[] = [
  {
    id: 'call/duration',
    title: 'Duration',
    what: 'How long the call ran, as the observer recorded it — falling back to the span between the first and last activity seen when the summary does not state one.',
    why: 'It is the denominator for everything else. Twelve issues in a four-minute call and twelve in a two-hour call are not the same finding.',
    watchOut:
      'The record can stay open after the last person leaves, so a duration much longer than people were actually talking usually means the call was held open rather than that anyone was in it.',
  },
  {
    id: 'call/clients',
    title: 'Clients',
    what: 'How many participants joined this call. A *client* is one browser or app in one call — the observertc term for a participant.',
    why: 'It frames everything below: whether a problem hit one person or all of them only means something once you know how many there were.',
    howToRead:
      'The number in brackets is the peak — the most people present at the same moment — which is lower than the total whenever people came and went.',
    watchOut:
      'For a call spread over several servers the peak is shown as “at least”, because two servers peaking at different moments cannot be added together into a real peak.',
  },
  {
    id: 'call/avg-quality',
    title: 'Average / median quality',
    what: 'The quality score for the call as a whole, on the same 0–5 scale as each participant’s. Averaged across participants where per-participant scores exist, otherwise taken from the call-wide figure the server recorded.',
    why: 'It answers “was this call actually bad, or is one person complaining about their own Wi-Fi?” in one number.',
    howToRead:
      'Above 4 is a good call. Below 3 means something was wrong for a meaningful part of it. Compare it against the per-participant table: a good average hiding one participant at 1.5 is a very different situation from everybody sitting at 3.',
    watchOut:
      'An average flattens exactly the thing you are usually looking for. Always look at the per-client chart before concluding a call was fine.',
  },
  {
    id: 'call/turn-users',
    title: 'TURN-connected clients',
    what: 'How many participants had their media relayed through a TURN server instead of taking a direct path.',
    why: 'Relaying costs latency and bandwidth, and it happens because something blocked the direct route — usually a corporate firewall or a restrictive network. A cluster of relayed participants is a network-policy finding, not bad luck.',
    watchOut:
      'Relaying rescues connections that would otherwise fail entirely. A relayed participant with a good score is the system working, not a problem to fix.',
  },
  {
    id: 'call/issues',
    title: 'Number of issues',
    what: 'How many problems the participants’ own software detected and reported during the call — frozen video, audio dropouts, ICE disconnects and so on.',
    why: 'Unlike the score, which is a judgement, these are specific named events with timestamps. They are the fastest route from “something was wrong” to “here is what and when”.',
    howToRead:
      'Open a participant to see which issues they raised and when. An issue has a start and an end, so a long-running one counts once rather than once per second.',
    watchOut:
      'Issue counts are not comparable between participants running different software versions — newer clients detect more kinds of problem, so they legitimately report more.',
  },
  {
    id: 'call/rejoins',
    title: 'Client rejoins',
    what: 'How many times a participant dropped out of the call and reconnected.',
    why: 'A rejoin is the most user-visible failure there is — the person disappeared from the call. It usually means their network dropped rather than anything about the call itself.',
  },
  {
    id: 'call/details',
    title: 'Call details',
    what: 'Everything the server recorded about the call as a whole: when it started and ended, how many joined and left, the range of quality scores, which servers carried it, and how the record was assembled.',
    why: 'It is the context for every other number on the page, and it is where the awkward facts live — a record left open long after the call, summaries that could not be read, figures that could not be combined across servers.',
    watchOut:
      'Anything the server did not record is left out rather than shown as a blank. A short panel means a thin recording, not a quiet call.',
  },
  {
    id: 'call/quality-chart',
    title: 'Quality per client',
    what: 'Every participant’s quality score over time, on one shared clock.',
    why: 'A shared time axis is what separates “the call had a bad minute” from “one person had a bad call”. If four lines dip together, look at the server or the call; if one line dips alone, look at that person.',
    howToRead:
      'Hover anywhere to read every line at that moment, worst first. Click a name in the legend to hide that line, or double-click it to show only that one — useful for comparing two people directly. The background bands are the good / fair / poor ranges.',
    watchOut:
      'A dashed line means the timing is approximate: the server recorded that participant’s scores without timestamps, so they have been spread evenly across the time the person was in the call. The shape is real, the horizontal position is not. Loading that client replaces it with their measured line.',
  },
  {
    id: 'call/clients-table',
    title: 'Clients table',
    what: 'One row per participant, with their quality score and trend, their typical round-trip time, their worst packet loss, and how many issues they reported.',
    why: 'It is the triage list. Scan it, find the worst row, open that person.',
    howToRead:
      '**Load** fetches that participant’s own recording and fills the row in without leaving this page; **View** opens their full report. Loading several at once is fine — they run in parallel — and anything loaded here is cached, so opening the full report afterwards is instant. A small dot beside a score means the number was measured from that participant’s own data rather than taken from the server’s summary.',
    watchOut:
      'Em dashes mean “not loaded yet”, not “zero”. The server’s summary often carries no per-participant numbers at all, which is exactly what the Load button is for.',
  },
  {
    id: 'call/topology',
    title: 'SFU topology',
    what: 'A map of the servers that carried this call: each router as a box, grouped by the SFU hosting it, with lines for the pipes linking them.',
    why: 'A call spread across several servers behaves differently from one on a single server — media crosses an extra hop between them, and some call-wide figures cannot be combined honestly. This is where you find out which situation you are in.',
    howToRead:
      'One box is the simple case. Several boxes joined by pipes means participants were split across servers and their media was forwarded between them.',
  },
  {
    id: 'call/routers',
    title: 'Routers',
    what: 'A table of each router that carried part of this call, with how many transports, producers and consumers it held.',
    why: 'It is the server’s own count of the work it was doing, and a quick way to see whether the load was spread evenly or piled onto one router.',
  },
  {
    id: 'call/diagnostics',
    title: 'Diagnostics',
    what: 'Automated consistency checks over the recorded data — whether the server’s view and the participants’ views agree about what existed.',
    why: 'Missing data looks exactly like a quiet call. These checks say which it is, so you do not spend an hour investigating an absence that is really a gap in the recording.',
  },
  {
    id: 'call/router-detail',
    title: 'Router detail',
    what: 'What one router held, from the server’s own snapshot: its transports, producers and consumers, and how each of them changed over time.',
    why: 'It is the server’s account of the call, before any of it is attributed to a participant. When a participant’s report and the server disagree, this is the other half of the story.',
  },
  {
    id: 'call/samples-browser',
    title: 'Samples browser',
    what: 'The raw recorded files behind this page — the call summaries and the router snapshots — exactly as they were stored.',
    why: 'For when you need to check the dashboard rather than trust it, or find out why something is missing. Everything shown elsewhere on this page was derived from these files.',
  },
];

/* ── one participant's report ──────────────────────────── */

const CLIENT: HelpTopic[] = [
  {
    id: 'client/context',
    title: 'Client context',
    what: 'Who and what this participant was: their browser and operating system, the devices they had, and whether their browser tab was actually in front of them.',
    why: 'Half of the surprising readings on this page are explained here rather than by the network — an old browser, a virtual camera, or a tab left in the background.',
  },
  {
    id: 'client/tab-focus',
    title: 'Tab focus',
    what: 'A strip showing when this participant’s browser tab was in front of them (green) and when it was hidden behind something else (grey).',
    why: 'Browsers deliberately throttle a hidden tab — timers slow down, the camera frame rate collapses, the encoder is starved. Readings taken while the tab was hidden describe power saving, not the call.',
    howToRead:
      'Line up a grey stretch against a drop in frame rate or bitrate elsewhere on the page. If they coincide, the drop is the browser saving power and there is nothing to fix.',
    watchOut:
      'Only shown for participants whose software reports it. Its absence means “not reported”, never “the tab was always visible”.',
  },
  {
    id: 'client/environment',
    title: 'Environment & devices',
    what: 'The browser, operating system and platform this participant was on, and the cameras, microphones and speakers their browser could see.',
    why: 'Device problems are invisible in network statistics and obvious here — a missing microphone, a virtual camera, a browser version with known WebRTC bugs.',
  },
  {
    id: 'client/score-explanation',
    title: 'Why this score',
    what: 'A written account of what cost this participant points over the whole session, ranked by how much each cause actually took off.',
    why: 'It is the summary you would otherwise have to assemble yourself by reading every chart. Start here, then use the sections below to check it.',
    watchOut:
      'Ranked by points where the recording carries them and by frequency where it does not — the panel says which it is doing. Frequency alone can promote a trivial recurring nuisance above a single catastrophic event.',
  },
  {
    id: 'client/score-reasons-browser',
    title: 'Score reasons by sample',
    what: 'Every measurement moment in the session, and for each one the specific connections and tracks that raised a problem.',
    why: 'It connects a dip in the score chart to the exact thing responsible at that instant. Clicking a point on the chart above jumps here.',
    howToRead:
      'Every sample is listed, including the quiet ones, so a click on the chart always lands on the moment you clicked rather than the nearest interesting one. A sample with no reasons is an answer too — it is how you confirm a dip had nothing underneath it. Where a reason names a track or connection, clicking that id jumps to its section.',
  },
  {
    id: 'client/issues',
    title: 'Client issues',
    what: 'Problems this participant’s own software detected while the call was happening — frozen video, audio dropouts, ICE disconnects, an overloaded decoder and so on. Each has a start, an end and its own evidence.',
    why: 'These are the most direct findings on the page. Rather than a metric you have to interpret, each one is a detector saying “this specific thing went wrong, here, for this long”.',
    howToRead:
      'Duration matters more than count: one twenty-second freeze is a worse experience than twenty one-second blips. Each issue links to the track or connection it happened on.',
    watchOut:
      'An issue and its resolution are two halves of one episode, not two events. The dashboard pairs them, so counts here are episodes rather than raw report lines.',
  },
  {
    id: 'client/transports',
    title: 'Transports',
    what: 'The encrypted connections between this participant and the server, and how each of their component parts behaved over time.',
    why: 'When a participant has nothing at all — no audio, no video, nobody can see them — the answer is nearly always here rather than in any individual track.',
    howToRead:
      'Opening a transport shows one lane per component: the overall connection, the network path negotiation (ICE), encryption (DTLS) and data channels (SCTP). Each lane shows the states it moved through, so you can see which stage stalled. The server’s view and the browser’s view are shown together — they are two accounts of the same negotiation.',
  },
  {
    id: 'client/transport-state-log',
    title: 'State changes',
    what: 'Every state change on this connection in order, with who reported it — the server or the browser — and what the change was.',
    why: 'The timeline shows you the shape; this is the evidence, with timestamps you can line up against anything else on the page.',
    howToRead:
      'Use the component checkboxes to hide the parts you are not investigating. The colour of the “from” state carries through the sequence, which makes a path easy to follow visually.',
  },
  {
    id: 'client/ice-candidates',
    title: 'ICE candidates',
    what: 'Every network address this participant offered or was offered, and what became of it. Click a row to see that candidate’s own story.',
    why: 'This is where connection failures are explained. A participant with no candidates at all had no usable network; candidates that all failed means something blocked them; the one that carried the call tells you whether the path was direct or relayed.',
    howToRead:
      'Expanding a row gives a verdict — carried the call, nominated but never used, never paired, every check failed — followed by the sequence behind it and a card per pair with its checks, traffic and round-trip time.',
    watchOut:
      'Most candidates going unused is normal, not a fault. A machine offers every address it has and expects all but one to go nowhere.',
  },
  {
    id: 'client/producers',
    title: 'Producers',
    what: 'The streams this participant was *sending* — their microphone, camera and any screen share — as the server saw them, alongside what the browser reported about encoding them.',
    why: 'A problem here affects everybody else in the call, because this is the single copy the server forwards to all of them. It is the highest-leverage place to look.',
    howToRead:
      'Watch for the encoder being unable to keep up (CPU-limited) or being held back by the uplink (bandwidth-limited) — they look similar in a frame-rate chart and have opposite fixes.',
  },
  {
    id: 'client/consumers',
    title: 'Consumers',
    what: 'The streams this participant was *receiving* — one per other person’s camera, microphone or screen share.',
    why: 'A problem here affects only this participant. If all of their consumers look bad, their download path is the problem; if one does, look at whoever was producing it.',
    howToRead:
      'Each consumer names the producer it came from, so you can cross to the sending side. Freezes, audio concealment and decode problems all surface here.',
  },
  {
    id: 'client/inbound-rtp',
    title: 'Inbound RTP',
    what: 'The raw per-stream receive statistics the browser reported: packets, bytes, frames, loss, jitter and the codec in use.',
    why: 'This is the underlying evidence for everything on the receiving side. When a chart elsewhere looks wrong, this is where you check it.',
    watchOut:
      'A stream carrying almost nothing can show alarming ratios — 50% loss of four packets is not a finding. The dashboard ignores such streams when scoring for exactly this reason.',
  },
  {
    id: 'client/outbound-rtp',
    title: 'Outbound RTP',
    what: 'The raw per-stream send statistics the browser reported: packets, bytes, frames encoded, target bitrate and what limited the encoder.',
    why: 'The sending-side counterpart, and the place to confirm whether a participant was actually sending what they thought they were.',
    howToRead:
      'A video track may be sent at several resolutions at once (simulcast), which appears as several streams for one camera. Judge the track by the highest active one.',
  },
  {
    id: 'client/media-overview',
    title: 'Media overview',
    what: 'Every track this participant sent and received in one place, grouped by who it came from, with its lifetime and basic health.',
    why: 'The orientation view. Before drilling into any one stream, this tells you what existed, for how long, and who it belonged to.',
  },
  {
    id: 'client/codecs',
    title: 'Codecs',
    what: 'The compression formats actually used — Opus for audio, VP8, VP9, H.264 or AV1 for video — and their settings.',
    why: 'Codec choice affects quality, CPU cost and which quality measurements are even available. Some measurements are absent for some codecs, and this says which you are dealing with.',
    watchOut:
      'A codec changing mid-call is worth noticing: it means something was renegotiated, and quality readings either side of that point are not directly comparable.',
  },
  {
    id: 'client/data-channels',
    title: 'Data channels',
    what: 'Non-media channels on the same connection, used by the application for things like chat, signalling or state.',
    why: 'They share a connection with the audio and video, so a data channel failing at the same moment as media is one connection failing rather than two problems.',
  },
  {
    id: 'client/media-sources',
    title: 'Media sources',
    what: 'What the camera and microphone actually produced, before any encoding — resolution, frame rate and audio level.',
    why: 'It separates “the camera did not deliver” from “the encoder could not keep up”, which look identical downstream and have completely different fixes.',
    howToRead:
      'If the source frame rate is already low, nothing further down the chain can help. An audio level near zero for a long stretch on a live, unmuted microphone means silence at the source.',
  },
  {
    id: 'client/device-details',
    title: 'Device details',
    what: 'The cameras, microphones and speakers this participant’s browser could see, and which were selected.',
    why: 'Being on the wrong device explains a surprising share of complaints — the laptop microphone instead of the headset, a virtual camera instead of the real one.',
  },
  {
    id: 'client/attachments',
    title: 'Attachments',
    what: 'Extra fields the application attached to this participant’s recording — its own identifiers, room and user labels, and anything else it chose to send.',
    why: 'It is the bridge back to your own systems: the ids here are how you match this participant to a user, a session or a support ticket.',
  },
  {
    id: 'client/sample-browser',
    title: 'Sample browser',
    what: 'The raw recorded measurements for this participant, one entry per moment, exactly as they were stored.',
    why: 'The ground truth behind every chart on the page, for when you need to verify something rather than trust the presentation of it.',
  },
  {
    id: 'client/audio-glitches',
    title: 'Audio glitch metrics',
    what: 'Detailed measurements of audio being repaired during playback — gaps concealed, samples stretched or compressed to keep time.',
    why: 'This is what audio problems sound like to the listener. Packet loss is the cause; concealment and stretching are the audible symptom, and they are what someone means when they say “it sounded robotic”.',
  },
  {
    id: 'client/unmatched-rtp',
    title: 'Unmatched RTP streams',
    what: 'Streams the browser reported that could not be matched to anything the server recorded, or the reverse.',
    why: 'It is a data-quality warning. A stream nobody can account for usually means a gap in the recording rather than a real fault — and knowing that stops you investigating a ghost.',
  },
  {
    id: 'client/unassociated-tracks',
    title: 'Unassociated tracks',
    what: 'Media tracks that could not be tied to a producer or consumer.',
    why: 'Usually tracks that existed only briefly, or were created before the connection was fully set up. Listed rather than hidden so nothing silently disappears from the report.',
  },
  {
    id: 'client/media-constraints',
    title: 'Media constraints',
    what: 'What the application *asked* the browser for — resolution, frame rate, echo cancellation and so on — and what it actually got.',
    why: 'The gap between the two is a real finding. Asking for 720p and being given 360p by the device explains a soft picture that no amount of network debugging will.',
  },
  {
    id: 'client/media-tracks',
    title: 'Media track events',
    what: 'The lifecycle of each track: created, muted, unmuted, ended.',
    why: 'It explains gaps that look like failures. A track that ended because the person turned their camera off is not a fault, and this is where you tell the two apart.',
  },
];

/* ── the registry ──────────────────────────────────────── */

export const HELP_TOPICS: Record<string, HelpTopic> = topics([
  ...CONCEPTS,
  ...CALL,
  ...CLIENT,
]);

/**
 * The topic for an id, or `undefined` when there is none.
 *
 * Undefined rather than a placeholder on purpose: `InfoIcon` renders nothing
 * for an unknown id, so a missing entry shows up as an absent icon rather than
 * shipping an affordance that opens onto an apology.
 */
export function getHelpTopic(id: string): HelpTopic | undefined {
  return HELP_TOPICS[id];
}

export function hasHelpTopic(id: string): boolean {
  return id in HELP_TOPICS;
}
