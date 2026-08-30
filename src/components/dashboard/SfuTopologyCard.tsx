'use client';
import type { SfuTopology } from '../../utils/dashboardModel.ts';
import { shortId } from '../../utils/formatting.ts';
import styles from './CallDashboard.module.css';
import { InfoIcon } from '../help/InfoIcon.tsx';

/**
 * SFUs as rows, their routers as boxes, and pipe transports as dashed links
 * between routers. Positions are computed in the view model; this component
 * only paints them.
 */
export function SfuTopologyCard({ topology }: { topology: SfuTopology }) {
  const empty = topology.boxes.length === 0;

  return (
    <div className="card elev-sm" style={{ gap: 'var(--space-3)' }}>
      <div className="card-title">
        Selective Forwarding Units <InfoIcon topic="call/topology" />
      </div>

      {empty ? (
        <p className={styles.emptyNote}>No router samples were found for this call.</p>
      ) : (
        <>
          <div className={styles.topologyScroll}>
            <div
              className={styles.topologyCanvas}
              style={{ width: topology.width, height: topology.height }}
            >
              <svg
                width={topology.width}
                height={topology.height}
                className={styles.topologySvg}
                aria-hidden="true"
              >
                {topology.pipes.map((pipe, i) => (
                  <g key={i}>
                    <line
                      x1={pipe.x1}
                      y1={pipe.y1}
                      x2={pipe.x2}
                      y2={pipe.y2}
                      stroke="var(--color-accent-400)"
                      strokeWidth="1.5"
                      strokeDasharray="4,3"
                    />
                    <text
                      x={pipe.midX}
                      y={pipe.midY}
                      fontSize="9"
                      fill="var(--color-accent-300)"
                      textAnchor="middle"
                    >
                      {pipe.countLabel}
                    </text>
                  </g>
                ))}
              </svg>

              {topology.pipes.map((pipe, i) => (
                <div
                  key={i}
                  className={styles.pipeDot}
                  title={pipe.tooltip}
                  style={{ left: pipe.entryX, top: pipe.entryY }}
                />
              ))}

              {topology.labels.map((label) => (
                <div
                  key={label.sfuId}
                  className={styles.sfuLabel}
                  style={{ left: label.x, top: label.y }}
                >
                  <span className={styles.sfuLabelId} title={label.sfuId}>
                    {label.sfuId}
                  </span>
                  {label.region && <span className="tag tag-neutral">{label.region}</span>}
                </div>
              ))}

              {topology.boxes.map((box) => (
                <div
                  key={box.routerId}
                  className={styles.routerBox}
                  style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
                >
                  <div className={styles.routerBoxId} title={box.routerId}>
                    {shortId(box.routerId, 18)}
                  </div>
                  <div className={styles.routerBoxRow}>
                    <span>Transports</span>
                    <span>{box.transportsTotal}</span>
                  </div>
                  <div className={styles.routerBoxRow}>
                    <span>Producers</span>
                    <span>{box.producersTotal}</span>
                  </div>
                  <div className={styles.routerBoxRow}>
                    <span>Consumers</span>
                    <span>{box.consumersTotal}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {topology.pipes.length > 0 && (
            <div className={styles.topologyKey}>
              <span className={styles.topologyKeyLine} />
              pipe transport between routers
            </div>
          )}
        </>
      )}
    </div>
  );
}
