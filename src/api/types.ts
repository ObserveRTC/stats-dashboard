import type { ClientSample } from '../schema/ClientSample.ts';
import type { CallSummary } from '../schema/CallSummary.ts';
import type { MediasoupRouterSample } from '../schema/MediasoupRouter.ts';

export interface RoomEntry {
  id: string;
  lastModified?: number; // epoch ms of the most recently changed object in this room
}

export interface RoomListResponse {
  success: boolean;
  rooms: RoomEntry[];
}

export interface CallEntry {
  id: string;
  lastModified?: number; // epoch ms of the most recently changed object in this call
}

export interface CallListResponse {
  success: boolean;
  calls: CallEntry[];
}

export interface ClientInfo {
  clientId: string;
  lastModified?: number; // epoch ms from S3 object metadata
  joined?: number;
  left?: number;
  displayName?: string;
  attachments?: Record<string, unknown>;
}

export interface ClientsResponse {
  success: boolean;
  clients: ClientInfo[];
  /**
   * Router ids discovered from the `mediasoup-router-<id>.json` objects in the
   * call folder. Independent of the call summaries, so the SFU view works even
   * when they are missing or do not list them.
   */
  routerIds?: string[];
  /**
   * SFU ids discovered from the `call-summary-<sfuId>.json` objects in the call
   * folder — how many SFUs the call was spread across, known before any summary
   * is parsed.
   */
  sfuIds?: string[];
  /**
   * Exact basenames of the call-scoped objects in the folder — every
   * `call-summary*.json` and `mediasoup-router-*.json` — in the order the
   * samples browser lists them.
   */
  objectNames?: string[];
}

export interface ClientStatsRef {
  id: string;
  signedUrl: string;
}

export interface ClientStatsResponse {
  stats: ClientStatsRef[];
}

export interface CallData {
  startTime: number;
  endTime: number | null;
  durationSec: number;
  totalClients: number;
}

export interface CallSession {
  clientSessions: Map<string, ClientSession>;
  callStart: number;
  callEnd: number;
  _clientLabelMap?: Map<string, string>;
}

export interface ClientSession {
  displayName?: string;
  joined: number | null;
  left: number | null;
  statsUrl?: string;
}

export type ClockOffsetMode = 'auto' | 'manual' | 'off';

export interface PaneEntry {
  color: string;
  statsData: ClientSample[] | null;
  /** Display name extracted from statsData attachments and cached here so it
   *  survives re-renders and back-navigation without re-scanning all samples. */
  displayName?: string | null;
  /** Presigned URL used to originally fetch the JSONL — kept for direct download. */
  statsUrl?: string | null;
  clockOffsetMs?: number;
  clockOffsetMode?: ClockOffsetMode;
}

export type QualityState = 'good' | 'degraded' | 'high-jitter' | 'packet-loss' | 'freezing';

export interface CallSummaryResponse {
  success: boolean;
  summary: CallSummary | null;
  /**
   * How many per-SFU summaries could not be read. Present only when some were
   * lost: the merge succeeded on the rest, so the summary is real but short of
   * one SFU's contribution.
   */
  partial?: number;
}

/** One raw call-folder object, as written. */
export interface CallObjectResponse {
  success: boolean;
  name?: string;
  /** Byte length of the stored text, for the file list. */
  size?: number;
  data?: unknown;
  error?: string;
}

export interface RouterSampleResponse {
  success: boolean;
  router: MediasoupRouterSample | null;
}

export type { CallSummary, MediasoupRouterSample };

export interface QualitySample {
  timestamp: number;
  state: QualityState;
}
