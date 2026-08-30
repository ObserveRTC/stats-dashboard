'use client';
export interface TimelineLegendProps {
  items: { color: string; label: string }[];
}

export function TimelineLegend({ items }: TimelineLegendProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', alignItems: 'center' }}>
      {items.map((item, i) => (
        <span
          key={i}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              borderRadius: 3,
              backgroundColor: item.color,
              flexShrink: 0,
            }}
          />
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  );
}
