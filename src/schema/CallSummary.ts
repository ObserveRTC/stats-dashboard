/**
 * Call summary — the wire format written by the observer, and the normalized
 * shape the dashboard consumes.
 *
 * The two are not the same. The observer writes `call-summary.json` next to the
 * client `.jsonl` files:
 *
 * ```
 * <bucket>/<roomId>/<callId>/call-summary.json
 * ```
 *
 * and puts most of what the dashboard needs — the room id, the per-client
 * display names, and the router ids — inside `attachments`, while `clients` at
 * the top level holds *counts*, not a per-client map:
 *
 * ```json
 * {
 *   "callId": "08d5…",
 *   "attachments": {
 *     "roomId": "chess",
 *     "clients": { "bbf4…": { "displayName": "Guest" } },
 *     "routerIds": ["16b4…"],
 *     "numberOfClientIssues": 10,
 *     "clientsUsedTurn": []
 *   },
 *   "clients": { "clientIds": ["bbf4…"], "peak": 2, "joined": 2, "left": 2 },
 *   "issues": [],
 *   "scores": { "samples": 44, "min": 0, "max": 4.35, "median": 3.75 },
 *   "startedAt": 1787297239302, "endedAt": 1787297353772,
 *   "durationInMs": 114470, "closedAt": 1787297713811
 * }
 * ```
 *
 * `normalizeCallSummary` flattens that into `CallSummary`, which is what every
 * component reads. It also accepts a summary whose fields already sit at the
 * top level, so summaries written before the `attachments` envelope existed
 * keep working.
 *
 * ## One call, many summaries
 *
 * A call can be spread across several SFUs, and the observer sits on each one.
 * Each observer therefore writes its own summary of the part of the call it
 * saw, named after itself:
 *
 * ```
 * <bucket>/<roomId>/<callId>/call-summary-<sfuId>.json
 * ```
 *
 * No single file is the call. `mergeCallSummaries` folds them into one, and the
 * result records where each piece came from in `sources` so a reader can tell a
 * merged summary from a single-SFU one. Files still named `call-summary.json`
 * are read exactly as before — one file is simply a merge of one part — so a
 * deployment can migrate at its own pace.
 *
 * Merging is not summing. Some fields union cleanly (client ids, router ids,
 * TURN users), some take the outer bound (the call span), and some **cannot be
 * merged at all**: a median of medians is not a median, so `scores.median`
 * survives only when exactly one part supplied it, and is otherwise dropped
 * rather than approximated. `mergedFields` names what had to be given up, so
 * the UI can say "not available across SFUs" instead of showing a wrong number.
 */

/* ── wire format ───────────────────────────────────────── */

/** Aggregate quality scores over the whole call, on the 1–5 MOS-like scale. */
export type CallSummaryScores = {
	/** How many score samples went into the aggregate. */
	samples?: number;
	min?: number;
	max?: number;
	median?: number;
	mean?: number;
};

/** Per-client counts over the call. Note: *counts*, not a per-client map. */
export type CallSummaryClientCounts = {
	clientIds?: string[];
	/** Highest number of clients present at once. */
	peak?: number;
	joined?: number;
	left?: number;
};

/** What the observer puts in the summary's `attachments` envelope. */
export type CallSummaryAttachments = {
	roomId?: string;
	/** Display names keyed by client id. */
	clients?: Record<string, { displayName?: string }>;
	routerIds?: string[];
	numberOfClientIssues?: number;
	/** Client ids whose media was relayed through a TURN server. */
	clientsUsedTurn?: string[];
	sfus?: CallSummarySfu[];
	pipeLinks?: CallSummaryPipeLink[];
	/**
	 * The SFU whose observer wrote this summary. Present once a call can span
	 * SFUs; the filename suffix says the same thing, and this wins over it.
	 */
	sfuId?: string;
} & Record<string, unknown>;

/** `call-summary.json` exactly as written. Every field is optional on purpose. */
export type RawCallSummary = {
	callId?: string;
	roomId?: string;
	attachments?: CallSummaryAttachments;
	clients?: CallSummaryClientCounts | Record<string, { displayName?: string } & CallSummaryClientMetrics>;
	routerIds?: string[];
	issues?: unknown[];
	scores?: CallSummaryScores;
	startedAt?: number;
	endedAt?: number;
	durationInMs?: number;
	closedAt?: number;
	sfus?: CallSummarySfu[];
	pipeLinks?: CallSummaryPipeLink[];
	sfuId?: string;
} & Record<string, unknown>;

/* ── normalized shape ──────────────────────────────────── */

/** Per-client quality metrics, when the summary carries them. */
export type CallSummaryClientMetrics = {
	/** Latest quality score on the 1–5 MOS-like scale (5 excellent, 1 poor). */
	score?: number;
	/** Quality score samples across the call, oldest → newest, same 1–5 scale. */
	scoreSeries?: number[];
	/** Median round-trip time over the call, in milliseconds. */
	rttMedianMs?: number;
	/** 95th-percentile packet loss over the call, as a percentage (0–100). */
	lossP95?: number;
	/** True when the client's media was relayed through a TURN server. */
	turnConnected?: boolean;
	/** How many times the client left and reconnected. */
	rejoins?: number;
};

/** An SFU and the routers it hosted during this call. */
export type CallSummarySfu = {
	sfuId: string;
	/** Deployment region label, e.g. `eu-central`. */
	region?: string;
	routerIds: string[];
};

/** A pipe transport pair linking two routers. */
export type CallSummaryPipeLink = {
	fromRouterId: string;
	toRouterId: string;
	/** Number of pipe transports between the pair. Defaults to 1. */
	count?: number;
	/** `address:port` of the local end, shown in the hover tooltip. */
	localAddress?: string;
	/** `address:port` of the remote end, shown in the hover tooltip. */
	remoteAddress?: string;
};

/** One summary object that went into a merged `CallSummary`. */
export type CallSummarySource = {
	/** The SFU that wrote it — from the filename, or the summary's attachments. */
	sfuId?: string;
	/** The object it was read from, e.g. `call-summary-sfu-a.json`. */
	key?: string;
	routerIds: string[];
	clientIds: string[];
	startedAt?: number;
	endedAt?: number;
	/** Score samples this part contributed, when it reported a count. */
	scoreSamples?: number;
};

/**
 * The flattened summary every component reads.
 *
 * Everything past `clients` / `routerIds` is optional: the dashboard uses these
 * fields when the summary supplies them and falls back to what it can derive
 * client-side (or renders an em dash) when it does not.
 */
export type CallSummary = {
	roomId: string | undefined;
	callId?: string;
	/** Per-client metrics, keyed by client id. Display names always present when known. */
	clients: Record<string, { displayName?: string } & CallSummaryClientMetrics>;
	routerIds: string[];

	/** SFU → router topology. Derived from router attachments when absent. */
	sfus?: CallSummarySfu[];
	/** Router-to-router pipe links. Derived from pipe transport tuples when absent. */
	pipeLinks?: CallSummaryPipeLink[];
	/** Call start / end, epoch ms. Falls back to the client session bounds. */
	startedAt?: number;
	endedAt?: number;
	/** Wall-clock duration reported by the observer. */
	durationInMs?: number;
	/** When the call record itself was closed — usually later than `endedAt`. */
	closedAt?: number;

	/** Aggregate quality over the call. */
	scores?: CallSummaryScores;
	/** Client counts (peak / joined / left). */
	clientCounts?: CallSummaryClientCounts;
	/** Total client-reported issues over the call. */
	numberOfClientIssues?: number;
	/** Client ids that connected through TURN. */
	clientsUsedTurn?: string[];
	/** Call-level issue records, passed through untouched. */
	issues?: unknown[];

	/**
	 * The summary objects this one was merged from, in read order. Always
	 * present, with a single entry for a call that lived on one SFU — so a
	 * reader never has to guess whether merging happened.
	 */
	sources?: CallSummarySource[];
	/** SFU ids that contributed, deduped and sorted. */
	sfuIds?: string[];
	/**
	 * Per-SFU summaries that were present in the call folder but could not be
	 * read — a partial write, or invalid JSON. Present only when some were lost,
	 * so this summary is real but short of an SFU's contribution.
	 */
	missingSources?: number;
	/**
	 * Fields dropped because they cannot be merged across SFUs, by dotted path
	 * (e.g. `scores.median`). The UI shows "not available across SFUs" for
	 * these rather than a number that would be wrong.
	 */
	unmergeable?: string[];
};

/* ── normalization ─────────────────────────────────────── */

function isRecord(v: unknown): v is Record<string, unknown> {
	return !!v && typeof v === 'object' && !Array.isArray(v);
}

function stringArray(v: unknown): string[] | undefined {
	if (!Array.isArray(v)) return undefined;
	const out = v.filter((x): x is string => typeof x === 'string');
	return out.length === v.length ? out : out;
}

/**
 * A `clients` value shaped like counts (`{clientIds, peak, joined, left}`)
 * rather than a per-client map. Distinguished by its own keys, since a client
 * id would never collide with them.
 */
function isClientCounts(v: unknown): v is CallSummaryClientCounts {
	if (!isRecord(v)) return false;
	return 'clientIds' in v || 'peak' in v || 'joined' in v || 'left' in v;
}

/**
 * Flatten `call-summary.json` into the shape the dashboard reads.
 *
 * Returns null for anything that is not an object, so a 404 body or a partial
 * write cannot masquerade as a summary.
 */
export function normalizeCallSummary(raw: unknown): CallSummary | null {
	if (!isRecord(raw)) return null;
	const src = raw as RawCallSummary;
	const att: CallSummaryAttachments = isRecord(src.attachments) ? src.attachments : {};

	// Client ids and display names can arrive three ways: the attachments map,
	// the top-level counts' `clientIds`, or an older per-client map.
	const clients: CallSummary['clients'] = {};

	if (isRecord(att.clients)) {
		for (const [id, entry] of Object.entries(att.clients)) {
			clients[id] = isRecord(entry) ? { displayName: typeof entry.displayName === 'string' ? entry.displayName : undefined } : {};
		}
	}

	const counts = isClientCounts(src.clients) ? src.clients : undefined;

	if (!counts && isRecord(src.clients)) {
		// Older format: `clients` is already the per-client map, possibly with metrics.
		for (const [id, entry] of Object.entries(src.clients)) {
			if (!isRecord(entry)) continue;
			clients[id] = { ...(clients[id] ?? {}), ...(entry as CallSummaryClientMetrics & { displayName?: string }) };
		}
	}

	for (const id of counts?.clientIds ?? []) {
		if (!clients[id]) clients[id] = {};
	}

	// TURN is reported as a list of client ids; fold it into the per-client metrics.
	const clientsUsedTurn = stringArray(att.clientsUsedTurn) ?? stringArray((src as Record<string, unknown>).clientsUsedTurn);
	for (const id of clientsUsedTurn ?? []) {
		clients[id] = { ...(clients[id] ?? {}), turnConnected: true };
	}

	const routerIds = stringArray(att.routerIds) ?? stringArray(src.routerIds) ?? [];

	// The observer that wrote this names itself, so a single part already knows
	// its SFU before any merging happens.
	const sfuId = typeof att.sfuId === 'string' ? att.sfuId : typeof src.sfuId === 'string' ? src.sfuId : undefined;

	return {
		roomId: typeof att.roomId === 'string' ? att.roomId : typeof src.roomId === 'string' ? src.roomId : undefined,
		callId: typeof src.callId === 'string' ? src.callId : undefined,
		clients,
		routerIds,
		sfus: att.sfus ?? src.sfus,
		pipeLinks: att.pipeLinks ?? src.pipeLinks,
		startedAt: typeof src.startedAt === 'number' ? src.startedAt : undefined,
		endedAt: typeof src.endedAt === 'number' ? src.endedAt : undefined,
		durationInMs: typeof src.durationInMs === 'number' ? src.durationInMs : undefined,
		closedAt: typeof src.closedAt === 'number' ? src.closedAt : undefined,
		scores: isRecord(src.scores) ? (src.scores as CallSummaryScores) : undefined,
		clientCounts: counts,
		numberOfClientIssues:
			typeof att.numberOfClientIssues === 'number'
				? att.numberOfClientIssues
				: Array.isArray(src.issues)
					? src.issues.length
					: undefined,
		clientsUsedTurn,
		issues: Array.isArray(src.issues) ? src.issues : undefined,
		sfuIds: sfuId ? [sfuId] : undefined,
	};
}

/* ── merging many summaries into one ───────────────────── */

/** Object-name prefix every call summary shares, whichever vintage wrote it. */
export const CALL_SUMMARY_PREFIX = 'call-summary';

/**
 * True for any object name that is a call summary.
 *
 * Matches the original `call-summary.json` and the per-SFU
 * `call-summary-<sfuId>.json`. The call-folder listing needs this too: without
 * it a per-SFU summary is indistinguishable from a client file and shows up as
 * a phantom client.
 */
export function isCallSummaryName(name: string): boolean {
	if (!name.endsWith('.json')) return false;
	const stem = name.slice(0, -'.json'.length);
	return stem === CALL_SUMMARY_PREFIX || stem.startsWith(`${CALL_SUMMARY_PREFIX}-`);
}

/**
 * The SFU id a summary object names, or `undefined` for the un-suffixed
 * `call-summary.json`.
 *
 * The filename is only one of two places the id can come from; the summary's
 * own `attachments.sfuId` is the other, and wins when both exist since the
 * observer wrote it deliberately rather than as a naming convention.
 */
export function sfuIdFromSummaryName(name: string): string | undefined {
	if (!isCallSummaryName(name)) return undefined;
	const stem = name.slice(0, -'.json'.length);
	if (stem === CALL_SUMMARY_PREFIX) return undefined;
	const id = stem.slice(CALL_SUMMARY_PREFIX.length + 1);
	return id.length > 0 ? id : undefined;
}

/** A normalized summary together with where it came from. */
export type CallSummaryPart = {
	summary: CallSummary;
	/** Object key or bare name, kept for provenance. */
	key?: string;
	/** SFU id from the filename; the summary's own attachments win over it. */
	sfuId?: string;
};

function defined<T>(values: (T | undefined | null)[]): T[] {
	return values.filter((v): v is T => v !== undefined && v !== null);
}

function minOf(values: (number | undefined)[]): number | undefined {
	const nums = defined(values);
	return nums.length ? Math.min(...nums) : undefined;
}

function maxOf(values: (number | undefined)[]): number | undefined {
	const nums = defined(values);
	return nums.length ? Math.max(...nums) : undefined;
}

function sumOf(values: (number | undefined)[]): number | undefined {
	const nums = defined(values);
	return nums.length ? nums.reduce((a, b) => a + b, 0) : undefined;
}

/** The SFU a part belongs to: what the summary says, else what the file is named. */
function partSfuId(part: CallSummaryPart): string | undefined {
	return part.summary.sfuIds?.[0] ?? part.sfuId;
}

/**
 * Fold one client's metrics from two summaries into one.
 *
 * Quality readings take the **worse** of the two, because a client that was
 * fine on one SFU and bad on another was not fine — averaging would hide
 * exactly the leg worth looking at. `rejoins` takes the max rather than the
 * sum, since two observers watching the same reconnect would otherwise report
 * it twice. `scoreSeries` keeps the longer of the two: the series carry no
 * shared time base to interleave on, so the SFU that saw more of the client is
 * the better single answer.
 */
function mergeClientEntry(
	a: { displayName?: string } & CallSummaryClientMetrics,
	b: { displayName?: string } & CallSummaryClientMetrics,
): { displayName?: string } & CallSummaryClientMetrics {
	const seriesA = a.scoreSeries ?? [];
	const seriesB = b.scoreSeries ?? [];
	const turn = a.turnConnected ?? b.turnConnected;
	return {
		displayName: a.displayName || b.displayName,
		score: minOf([a.score, b.score]),
		scoreSeries: seriesA.length >= seriesB.length ? a.scoreSeries : b.scoreSeries,
		rttMedianMs: maxOf([a.rttMedianMs, b.rttMedianMs]),
		lossP95: maxOf([a.lossP95, b.lossP95]),
		turnConnected: a.turnConnected || b.turnConnected ? true : turn,
		rejoins: maxOf([a.rejoins, b.rejoins]),
	};
}

/** Union `sfus` blocks by SFU id, unioning each one's routers. */
function mergeSfus(parts: CallSummaryPart[]): CallSummarySfu[] | undefined {
	const byId = new Map<string, { region?: string; routerIds: Set<string> }>();

	const add = (sfuId: string, region: string | undefined, routerIds: string[]) => {
		const entry = byId.get(sfuId) ?? { region: undefined, routerIds: new Set<string>() };
		entry.region = entry.region ?? region;
		for (const r of routerIds) entry.routerIds.add(r);
		byId.set(sfuId, entry);
	};

	for (const part of parts) {
		for (const sfu of part.summary.sfus ?? []) {
			if (sfu?.sfuId) add(sfu.sfuId, sfu.region, sfu.routerIds ?? []);
		}
		// A part that knows its own SFU also proves that SFU hosted its routers,
		// which is the whole topology for a deployment shipping no `sfus` block.
		const own = partSfuId(part);
		if (own) add(own, undefined, part.summary.routerIds ?? []);
	}

	// An entry with no routers describes no topology, and would render as an
	// empty SFU box. The SFU is still recorded in `sfuIds`, which is where
	// "this SFU took part" belongs.
	const out = [...byId.entries()]
		.filter(([, e]) => e.routerIds.size > 0)
		.map(([sfuId, e]) => ({ sfuId, region: e.region, routerIds: [...e.routerIds].sort() }))
		.sort((a, b) => a.sfuId.localeCompare(b.sfuId));

	return out.length > 0 ? out : undefined;
}

/**
 * Union pipe links, treating a link as undirected.
 *
 * Both ends of a cross-SFU pipe are reported by both observers, once in each
 * direction. Summing the counts would double every link, so the pair is keyed
 * unordered and the larger count wins.
 */
function mergePipeLinks(parts: CallSummaryPart[]): CallSummaryPipeLink[] | undefined {
	const byPair = new Map<string, CallSummaryPipeLink>();

	for (const part of parts) {
		for (const link of part.summary.pipeLinks ?? []) {
			if (!link?.fromRouterId || !link?.toRouterId) continue;
			const pair = [link.fromRouterId, link.toRouterId].sort().join(' ');
			const seen = byPair.get(pair);
			if (!seen) {
				byPair.set(pair, { ...link });
				continue;
			}
			byPair.set(pair, {
				...seen,
				count: Math.max(seen.count ?? 1, link.count ?? 1),
				localAddress: seen.localAddress ?? link.localAddress,
				remoteAddress: seen.remoteAddress ?? link.remoteAddress,
			});
		}
	}

	return byPair.size > 0 ? [...byPair.values()] : undefined;
}

/**
 * Fold every per-SFU summary of a call into one.
 *
 * A call spread across SFUs has one summary per SFU and no single file that is
 * the call; this is what makes them one. Passing a single part is the ordinary
 * case and returns that summary enriched with its provenance, so callers never
 * need a separate path for "there was only one file".
 *
 * Returns null for an empty list. No summary at all is a real state — a call
 * still running has none yet — and must not be confused with an empty one.
 */
export function mergeCallSummaries(parts: CallSummaryPart[]): CallSummary | null {
	if (parts.length === 0) return null;

	const summaries = parts.map((p) => p.summary);
	const unmergeable: string[] = [];

	/* ── clients: a union, with the worse reading winning a collision ── */
	const clients: CallSummary['clients'] = {};
	for (const summary of summaries) {
		for (const [id, entry] of Object.entries(summary.clients ?? {})) {
			clients[id] = clients[id] ? mergeClientEntry(clients[id], entry) : { ...entry };
		}
	}

	const routerIds = [...new Set(summaries.flatMap((s) => s.routerIds ?? []))].sort();
	const clientsUsedTurn = [...new Set(summaries.flatMap((s) => s.clientsUsedTurn ?? []))];

	/* ── span: the outer bound of every part ── */
	const startedAt = minOf(summaries.map((s) => s.startedAt));
	const endedAt = maxOf(summaries.map((s) => s.endedAt));
	const durationInMs =
		startedAt != null && endedAt != null
			? endedAt - startedAt
			: maxOf(summaries.map((s) => s.durationInMs));

	/* ── scores ──
	 *
	 * Counts and bounds merge; the median does not. A median of medians is not
	 * a median, and there is no way back to one without the samples themselves,
	 * so it survives only when a single part contributed scores at all. `mean`
	 * is recoverable — it weights by sample count — and is computed when every
	 * scoring part supplied both a mean and a sample count. */
	const scoringParts = summaries.filter((s) => s.scores && (s.scores.samples ?? 0) > 0);
	const anyScores = summaries.some((s) => s.scores);
	let scores: CallSummaryScores | undefined;

	if (anyScores) {
		const weighted =
			scoringParts.length > 0 && scoringParts.every((s) => typeof s.scores?.mean === 'number');
		const denominator = scoringParts.reduce((a, s) => a + (s.scores?.samples ?? 0), 0);
		const numerator = weighted
			? scoringParts.reduce((a, s) => a + (s.scores?.mean ?? 0) * (s.scores?.samples ?? 0), 0)
			: null;

		let median: number | undefined;
		if (scoringParts.length <= 1) {
			median = (scoringParts[0] ?? summaries.find((s) => s.scores))?.scores?.median;
		} else if (summaries.some((s) => typeof s.scores?.median === 'number')) {
			unmergeable.push('scores.median');
		}

		scores = {
			samples: sumOf(summaries.map((s) => s.scores?.samples)),
			min: minOf(summaries.map((s) => s.scores?.min)),
			max: maxOf(summaries.map((s) => s.scores?.max)),
			mean: numerator != null && denominator > 0 ? numerator / denominator : undefined,
			median,
		};
	}

	/* ── client counts ──
	 *
	 * `clientIds` is a union, so it stays exact. `peak` cannot be: two SFUs
	 * peaking at different moments do not add up to a call peak, so the largest
	 * single peak is reported as the lower bound it is. `joined`/`left` count
	 * events and do sum, but a client that used two SFUs is counted on each —
	 * which is why the client count everywhere reads `clients`, not these. */
	const countParts = defined(summaries.map((s) => s.clientCounts));
	const clientCounts: CallSummaryClientCounts | undefined = countParts.length
		? {
				clientIds: [...new Set(countParts.flatMap((c) => c.clientIds ?? []))],
				peak: maxOf(countParts.map((c) => c.peak)),
				joined: sumOf(countParts.map((c) => c.joined)),
				left: sumOf(countParts.map((c) => c.left)),
			}
		: undefined;
	if (countParts.length > 1 && countParts.some((c) => c.peak != null)) {
		unmergeable.push('clientCounts.peak');
	}

	const sources: CallSummarySource[] = parts.map((part) => ({
		sfuId: partSfuId(part),
		key: part.key,
		routerIds: part.summary.routerIds ?? [],
		clientIds: Object.keys(part.summary.clients ?? {}),
		startedAt: part.summary.startedAt,
		endedAt: part.summary.endedAt,
		scoreSamples: part.summary.scores?.samples,
	}));
	const sfuIds = [...new Set(defined(sources.map((s) => s.sfuId)))].sort();
	const issues = summaries.flatMap((s) => s.issues ?? []);

	return {
		roomId: summaries.find((s) => s.roomId)?.roomId,
		callId: summaries.find((s) => s.callId)?.callId,
		clients,
		routerIds,
		sfus: mergeSfus(parts),
		pipeLinks: mergePipeLinks(parts),
		startedAt,
		endedAt,
		durationInMs,
		closedAt: maxOf(summaries.map((s) => s.closedAt)),
		scores,
		clientCounts,
		numberOfClientIssues: sumOf(summaries.map((s) => s.numberOfClientIssues)),
		clientsUsedTurn: clientsUsedTurn.length ? clientsUsedTurn : undefined,
		issues: issues.length ? issues : undefined,
		sources,
		sfuIds: sfuIds.length ? sfuIds : undefined,
		unmergeable: unmergeable.length ? unmergeable : undefined,
	};
}
