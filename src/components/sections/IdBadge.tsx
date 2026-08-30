'use client';
import { useCallback, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';

interface IdBadgeProps {
  /** The full ID to display (and to copy). Required. */
  value: string | null | undefined;
  /** Optional click handler. When provided, click invokes this instead of
   * copying the ID — used for IDs that are also navigation links (e.g. the
   * producer ID inside a consumer card). */
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  /** Override the hover/aria title. Defaults to "Click to copy <value>" or
   * just the value when `onClick` is set. */
  title?: string;
  /** Visual treatment. `link` colors the badge as accent and shows an
   * underline-on-hover affordance. */
  variant?: 'default' | 'link';
  /** Optional content override (e.g. show a shortened version). The full
   * `value` is still what gets copied. */
  children?: ReactNode;
  /** Inline style override (rare — prefer not to use). */
  style?: CSSProperties;
  /** Additional className appended to the global `id-badge` class. */
  className?: string;
}

/** Single rendering for every ID across the app: monospace, small, copy-on-
 * click. Pass `onClick` to opt out of the copy behaviour and turn it into a
 * navigable link instead. */
export function IdBadge({
  value,
  onClick,
  title,
  variant = 'default',
  children,
  style,
  className,
}: IdBadgeProps) {
  const [copied, setCopied] = useState(false);
  const display = value ?? '—';

  const handleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      if (onClick) {
        onClick(event);
        return;
      }
      if (!value) return;
      navigator.clipboard
        .writeText(value)
        .then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        })
        .catch(() => {
          /* clipboard may fail in non-secure contexts; silently ignore. */
        });
    },
    [onClick, value],
  );

  const computedTitle = copied
    ? 'Copied!'
    : title
      ? title
      : onClick
        ? display
        : `Click to copy: ${display}`;

  const cls = ['id-badge', className].filter(Boolean).join(' ');

  return (
    <code
      className={cls}
      onClick={handleClick}
      title={computedTitle}
      data-variant={variant}
      data-copied={copied || undefined}
      style={style}
    >
      {children ?? display}
    </code>
  );
}
