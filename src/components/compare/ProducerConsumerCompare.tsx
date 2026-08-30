'use client';
import { useMemo } from 'react';
import type {
  ServerProducer as Producer,
  ServerConsumer as Consumer,
} from '../../utils/routerServerData.ts';
import { ConsumerSection } from '../consumer/ConsumerSection.tsx';
import { ProducerSection } from '../producer/ProducerSection.tsx';
import type { ClientSample } from '../../schema/ClientSample.ts';
import { processWebRTCStats } from '../../utils/statsProcessor.ts';
import styles from './ProducerConsumerCompare.module.css';

interface ProducerConsumerCompareProps {
  consumer: Consumer;
  consumerStats: ClientSample[] | null;
  producer: Producer | null;
  producerStats: ClientSample[] | null;
  producerLoading?: boolean;
  producerError?: string | null;
  eventBus?: EventTarget;
}

export function ProducerConsumerCompare({
  consumer,
  consumerStats,
  producer,
  producerStats,
  producerLoading,
  producerError,
  eventBus,
}: ProducerConsumerCompareProps) {
  const consumerProcessed = useMemo(
    () => (consumerStats ? processWebRTCStats(consumerStats) : null),
    [consumerStats],
  );
  const producerProcessed = useMemo(
    () => (producerStats ? processWebRTCStats(producerStats) : null),
    [producerStats],
  );

  return (
    <>
      <div className={styles.column}>
        <h4 className={styles.columnTitle}>Consumer (this client)</h4>
        <ConsumerSection
          consumer={consumer}
          processedClientStats={consumerProcessed}
          paneKey="compare-consumer"
          clientStats={consumerStats ?? undefined}
          eventBus={eventBus}
          embedded
        />
      </div>

      <div className={styles.column}>
        <h4 className={styles.columnTitle}>Producer (remote client)</h4>
        {producerLoading ? (
          <div className={styles.loadingState}>
            <span className="spinner" />
            <p>Loading producer client report...</p>
          </div>
        ) : producerError ? (
          <p className={styles.noData}>{producerError}</p>
        ) : producer ? (
          <ProducerSection
            producer={producer}
            processedClientStats={producerProcessed}
            paneKey="compare-producer"
            clientStats={producerStats ?? undefined}
            eventBus={eventBus}
            embedded
          />
        ) : (
          <p className={styles.noData}>Producer data not available</p>
        )}
      </div>
    </>
  );
}
