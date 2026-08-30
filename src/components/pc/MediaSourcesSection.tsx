'use client';
import type { ClientSample } from '../../schema/ClientSample.ts';
import type { ProcessWebRTCStatsResult } from '../../utils/statsTypes.ts';
import { extractMediaSources, buildFieldSeries } from '../../utils/pcSampleExtractor.ts';
import { hasEnoughData } from '../../utils/miniChartHelpers.ts';
import { shortId } from '../../utils/formatting.ts';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { InfoCard } from '../sections/InfoCard.tsx';
import { InfoGrid } from '../sections/InfoGrid.tsx';
import { AttachmentsCard } from '../sections/AttachmentsCard.tsx';
import { IdBadge } from '../sections/IdBadge.tsx';
import { MiniChart } from '../charts/MiniChart.tsx';
import styles from './pc.module.css';

interface MediaSourcesSectionProps {
  samples: ClientSample[];
  processedStats: ProcessWebRTCStatsResult;
  eventBus?: EventTarget;
}

export function MediaSourcesSection({ samples, eventBus }: MediaSourcesSectionProps) {
  const items = extractMediaSources(samples);
  if (items.size === 0) return null;

  const entries = Array.from(items.entries());

  return (
    <CollapsibleSection
      title="Media Sources"
      id="media-sources"
      help="client/media-sources"
      hashPrefix="media-source/"
      count={entries.length}
      defaultOpen={false}
    >
      {entries.map(([key, item]) => {
        const { pcId, meta } = item;

        const sel = (pc: import('../../schema/ClientSample.ts').PeerConnectionSample) =>
          pc.mediaSources as Array<{ id: string; timestamp: number } & Record<string, unknown>> | undefined;

        const audioLevelData    = buildFieldSeries(samples, pcId, meta.id, sel, 'audioLevel');
        const totalEnergyData   = buildFieldSeries(samples, pcId, meta.id, sel, 'totalAudioEnergy');
        const echoLossData      = buildFieldSeries(samples, pcId, meta.id, sel, 'echoReturnLoss');
        const widthData         = buildFieldSeries(samples, pcId, meta.id, sel, 'width');
        const heightData        = buildFieldSeries(samples, pcId, meta.id, sel, 'height');
        const fpsData           = buildFieldSeries(samples, pcId, meta.id, sel, 'framesPerSecond');

        return (
          <CollapsibleSection
            key={key}
            title={`${meta.kind} source — ${shortId(meta.id)}`}
            id={`media-source/${key}`}
            defaultOpen={false}
          >
            <InfoGrid>
              <InfoCard title="Source">
                <div className={styles.infoRow}><span className={styles.label}>ID:</span> <IdBadge value={meta.id}>{shortId(meta.id)}</IdBadge></div>
                <div className={styles.infoRow}><span className={styles.label}>Kind:</span> {meta.kind}</div>
                {meta.trackIdentifier && <div className={styles.infoRow}><span className={styles.label}>Track ID:</span> <IdBadge value={meta.trackIdentifier}>{shortId(meta.trackIdentifier)}</IdBadge></div>}
              </InfoCard>
              <AttachmentsCard attachments={meta.attachments} />
            </InfoGrid>
            <div className={styles.chartsGrid}>
              {hasEnoughData(audioLevelData) && (
                <MiniChart title="Audio Level"
              description="How loud the microphone was, moment to moment, before any encoding. A long flat stretch near zero on a live, unmuted microphone means silence at the source — a muted-in-the-app or wrong-device problem, not a network one." data={audioLevelData} formatter={(v) => v.toFixed(3)} color="var(--accent)" yDomain={[0, 1]} eventBus={eventBus} />
              )}
              {hasEnoughData(totalEnergyData) && (
                <MiniChart title="Total Audio Energy"
              description="Sound energy accumulated over the session. It only ever rises; a flat line means nothing was picked up at all during that stretch, which distinguishes a dead microphone from a quiet room." data={totalEnergyData} formatter={(v) => v.toFixed(4)} color="var(--accent)" eventBus={eventBus} />
              )}
              {hasEnoughData(echoLossData) && (
                <MiniChart title="Echo Return Loss"
              description="How well echo cancellation separated the speaker output from the microphone input, in decibels. Higher is better. Low values mean the far end is likely hearing themselves back." data={echoLossData} formatter={(v) => v.toFixed(2)} color="var(--warning)" eventBus={eventBus} />
              )}
              {hasEnoughData(widthData) && (
                <MiniChart title="Width"
              description="Pixel width the camera actually delivered, before encoding. A drop here is the source changing, not the network — check it before blaming the encoder for a soft picture." data={widthData} formatter={(v) => `${v}px`} color="var(--text-muted)" eventBus={eventBus} />
              )}
              {hasEnoughData(heightData) && (
                <MiniChart title="Height"
              description="Pixel height the camera actually delivered, before encoding. Read it next to Width: both dropping together is the device switching resolution." data={heightData} formatter={(v) => `${v}px`} color="var(--text-muted)" eventBus={eventBus} />
              )}
              {hasEnoughData(fpsData) && (
                <MiniChart title="Frames Per Second"
              description="Frames the camera actually produced, before encoding. If this is already low, nothing downstream can recover it — the encoder and the network can only ever send what the camera gave them." data={fpsData} formatter={(v) => `${v.toFixed(1)}fps`} color="var(--success)" eventBus={eventBus} />
              )}
            </div>
          </CollapsibleSection>
        );
      })}
    </CollapsibleSection>
  );
}
