/**
 * Recording / recorder-service client events (not in base WebRTC ClientEventTypes).
 * Payloads remain loosely typed until parsed via parseClientEventPayload.
 */

export const RecordingClientEventTypes = {
  RECORDER_SERVICE_STATE_CHANGE: 'RECORDER_SERVICE_STATE_CHANGE',
  RECORDING_SESSION_CREATED: 'RECORDING_SESSION_CREATED',
  RECORDING_SESSION_CLOSED: 'RECORDING_SESSION_CLOSED',
  RECORDING_SESSION_START_RECORDING: 'RECORDING_SESSION_START_RECORDING',
  RECORDING_SESSION_STOP_RECORDING: 'RECORDING_SESSION_STOP_RECORDING',
  RECORDING_SESSION_COUNTDOWN_ENDS: 'RECORDING_SESSION_COUNTDOWN_ENDS',
  RECORDING_SESSION_UPDATE_PRODUCERS: 'RECORDING_SESSION_UPDATE_PRODUCERS',
  RECORDING_SESSION_ADD_RECORDING_TRACK: 'RECORDING_SESSION_ADD_RECORDING_TRACK',
  RECORDING_SESSION_START_RECORDING_TRACK: 'RECORDING_SESSION_START_RECORDING_TRACK',
  RECORDING_SESSION_REMOVE_RECORDING_TRACK: 'RECORDING_SESSION_REMOVE_RECORDING_TRACK',
  RECORDING_SESSION_STOP_RECORDING_TRACK: 'RECORDING_SESSION_STOP_RECORDING_TRACK',
  RECORDING_SESSION_RECORDING_TRACK_PREROLLED: 'RECORDING_SESSION_RECORDING_TRACK_PREROLLED',
  RECORDING_TRACK_STATE_CHANGED: 'RECORDING_TRACK_STATE_CHANGED',
  RECORDING_TRACK_AUDIO_RECORDING_STARTED: 'RECORDING_TRACK_AUDIO_RECORDING_STARTED',
  RECORDING_TRACK_AUDIO_RECORDING_STOPPED: 'RECORDING_TRACK_AUDIO_RECORDING_STOPPED',
  RECORDING_TRACK_VIDEO_RECORDING_STARTED: 'RECORDING_TRACK_VIDEO_RECORDING_STARTED',
  RECORDING_TRACK_VIDEO_RECORDING_STOPPED: 'RECORDING_TRACK_VIDEO_RECORDING_STOPPED',
  STREAM_RECORDING_ID_CHANGED: 'STREAM_RECORDING_ID_CHANGED',
} as const;

export type RecordingClientEventType =
  (typeof RecordingClientEventTypes)[keyof typeof RecordingClientEventTypes];

const RECORDING_PREFIXES = ['RECORDING_', 'RECORDER_'] as const;

export function isRecordingClientEventType(type: string): boolean {
  return RECORDING_PREFIXES.some((p) => type.startsWith(p));
}

export function isKnownRecordingClientEventType(
  type: string,
): type is RecordingClientEventType {
  return (Object.values(RecordingClientEventTypes) as string[]).includes(type);
}

/** Timeline / chart color for STREAM_RECORDING_ID_CHANGED markers. */
export const STREAM_RECORDING_ID_COLOR = '#ec4899';

/** A point in time where the recording id backing a producer's stream changed. */
export interface StreamRecordingIdEvent {
  timestamp: number;
  newId?: string;
  source?: string;
}

export function extractStreamRecordingIdEvents(
  events: Array<{ timestamp: Date; type: string; payload: Record<string, unknown> }>,
): StreamRecordingIdEvent[] {
  return events
    .filter((e) => e.type === RecordingClientEventTypes.STREAM_RECORDING_ID_CHANGED)
    .map((e) => ({
      timestamp: e.timestamp.getTime(),
      newId: e.payload.newId != null ? String(e.payload.newId) : undefined,
      source: e.payload.source != null ? String(e.payload.source) : undefined,
    }));
}
