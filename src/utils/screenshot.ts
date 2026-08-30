import { toPng } from 'html-to-image';

interface SavedOverflow {
  el: HTMLElement;
  overflow: string;
  maxHeight: string;
  height: string;
}

function expandScrollables(root: HTMLElement): SavedOverflow[] {
  const saved: SavedOverflow[] = [];
  const walk = (el: HTMLElement) => {
    const style = getComputedStyle(el);
    const isClipped =
      style.overflow !== 'visible' ||
      style.overflowX !== 'visible' ||
      style.overflowY !== 'visible';
    const hasScroll = el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;

    if (isClipped && hasScroll) {
      saved.push({
        el,
        overflow: el.style.overflow,
        maxHeight: el.style.maxHeight,
        height: el.style.height,
      });
      el.style.overflow = 'visible';
      el.style.maxHeight = 'none';
      el.style.height = 'auto';
    }
    for (const child of el.children) {
      if (child instanceof HTMLElement) walk(child);
    }
  };
  walk(root);
  return saved;
}

function restoreScrollables(saved: SavedOverflow[]) {
  for (const { el, overflow, maxHeight, height } of saved) {
    el.style.overflow = overflow;
    el.style.maxHeight = maxHeight;
    el.style.height = height;
  }
}

export async function captureToClipboard(element: HTMLElement): Promise<void> {
  const saved = expandScrollables(element);
  try {
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      skipFonts: true,
      width: element.scrollWidth,
      height: element.scrollHeight,
    });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob }),
    ]);
  } finally {
    restoreScrollables(saved);
  }
}
