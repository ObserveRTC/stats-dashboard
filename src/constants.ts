/**
 * Shared constants used across multiple files or serving as configuration values.
 *
 * Constants that are truly component-local (e.g. chart dimensions, CSS colors
 * for a single chart) remain in their respective files.
 */

// ---------------------------------------------------------------------------
// Paging / batching
// ---------------------------------------------------------------------------

/** Number of call entries to load per batch in CallListPage. */
export const CALL_BATCH_SIZE = 10;

// ---------------------------------------------------------------------------
// Local storage
// ---------------------------------------------------------------------------

export const ROOM_ID_HISTORY_KEY = 'obs-roomid-history';
export const ROOM_ID_STORAGE_KEY = 'obs-roomid';
export const CALL_ID_STORAGE_KEY = 'obs-callid';

/** Maximum number of room ID history entries to keep. */
export const MAX_ROOM_ID_HISTORY = 20;

// ---------------------------------------------------------------------------
// Session health analysis
// ---------------------------------------------------------------------------

/** Seconds to exclude from the start of a session to avoid warm-up noise (ICE, DTLS, codec ramp). */
export const WARMUP_SECONDS = 10;

// ---------------------------------------------------------------------------
// Color palettes (shared across multiple files)
// ---------------------------------------------------------------------------

/** Colors assigned to panes in the compare/multi-client view. */
export const PANE_COLORS = [
  '#0d9488', '#7c3aed', '#d97706', '#dc2626',
  '#0891b2', '#16a34a', '#db2777', '#ea580c',
];

/**
 * Per-client identity colours, assigned by join order.
 *
 * Ten distinct hues, ordered so neighbours in the list sit far apart on the
 * wheel — a two-client call gets teal and violet rather than two blues. Used
 * wherever clients have to be told apart at a glance across a shared axis.
 */
export const CLIENT_LANE_COLORS = [
  '#0d9488', '#7c3aed', '#0891b2', '#d97706',
  '#db2777', '#16a34a', '#dc2626', '#6366f1',
  '#14b8a6', '#ea580c',
];
