'use client';
import { useCallback, useRef } from 'react';

export function useLazyRender(onVisible: () => void): React.RefCallback<HTMLElement> {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const hasTriggeredRef = useRef(false);

  return useCallback(
    (element: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!element || hasTriggeredRef.current) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry?.isIntersecting || hasTriggeredRef.current) return;
          hasTriggeredRef.current = true;
          onVisible();
          observerRef.current?.disconnect();
          observerRef.current = null;
        },
        { threshold: 0, rootMargin: '0px' },
      );

      observerRef.current.observe(element);
    },
    [onVisible],
  );
}
