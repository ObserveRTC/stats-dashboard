'use client';
import { useCallback, useMemo } from 'react';

export function useEventBus() {
  const bus = useMemo(() => new EventTarget(), []);

  const dispatchHoverTime = useCallback((time: number) => {
    bus.dispatchEvent(new CustomEvent('hoverTime', { detail: time }));
  }, [bus]);

  const dispatchMouseOut = useCallback(() => {
    bus.dispatchEvent(new Event('mouseout'));
  }, [bus]);

  return { bus, dispatchHoverTime, dispatchMouseOut };
}
