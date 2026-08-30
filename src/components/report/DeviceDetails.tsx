'use client';
import { CollapsibleSection } from '../sections/CollapsibleSection.tsx';
import { InfoGrid } from '../sections/InfoGrid.tsx';
import { InfoCard } from '../sections/InfoCard.tsx';
import styles from './DeviceDetails.module.css';

interface DeviceDetailsProps {
  clientMeta: {
    userAgent: string | null;
    constraints: unknown;
    devices: unknown[];
  };
  /** Render the cards only — the caller supplies the section wrapper. */
  embedded?: boolean;
}

function parseUserAgent(ua: string): { browser: string; os: string; raw: string } {
  let browser = '';
  let os = '';

  // OS detection
  if (/Windows NT 10/.test(ua)) os = 'Windows 10+';
  else if (/Windows NT/.test(ua)) os = 'Windows';
  else if (/Mac OS X ([\d_.]+)/.test(ua)) {
    const ver = ua.match(/Mac OS X ([\d_.]+)/)?.[1]?.replace(/_/g, '.') ?? '';
    os = `macOS ${ver}`;
  } else if (/CrOS/.test(ua)) os = 'ChromeOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  else if (/Android ([\d.]+)/.test(ua)) os = `Android ${ua.match(/Android ([\d.]+)/)?.[1] ?? ''}`;
  else if (/iPhone|iPad/.test(ua)) {
    const ver = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.') ?? '';
    os = `iOS ${ver}`;
  }

  // Browser detection (order matters — check specific first)
  if (/Edg\/([\d.]+)/.test(ua)) browser = `Edge ${ua.match(/Edg\/([\d.]+)/)?.[1] ?? ''}`;
  else if (/OPR\/([\d.]+)/.test(ua)) browser = `Opera ${ua.match(/OPR\/([\d.]+)/)?.[1] ?? ''}`;
  else if (/Firefox\/([\d.]+)/.test(ua)) browser = `Firefox ${ua.match(/Firefox\/([\d.]+)/)?.[1] ?? ''}`;
  else if (/Chrome\/([\d.]+)/.test(ua)) browser = `Chrome ${ua.match(/Chrome\/([\d.]+)/)?.[1] ?? ''}`;
  else if (/Safari\/([\d.]+)/.test(ua) && /Version\/([\d.]+)/.test(ua)) browser = `Safari ${ua.match(/Version\/([\d.]+)/)?.[1] ?? ''}`;

  return { browser: browser || 'Unknown Browser', os: os || 'Unknown OS', raw: ua };
}

const DEVICE_KIND_META: Record<string, { label: string; icon: string }> = {
  audioinput: { label: 'Microphones', icon: '🎤' },
  videoinput: { label: 'Cameras', icon: '📷' },
  audiooutput: { label: 'Speakers', icon: '🔊' },
};

export function DeviceDetails({ clientMeta, embedded }: DeviceDetailsProps) {
  const { userAgent, constraints, devices } = clientMeta;
  const hasConstraints = constraints != null && Object.keys(constraints as object).length > 0;
  const hasDevices = Array.isArray(devices) && devices.length > 0;

  if (!userAgent && !hasConstraints && !hasDevices) {
    return null;
  }

  const parsed = userAgent ? parseUserAgent(userAgent) : null;

  // Group constraints into just the key names (all values are true)
  const constraintKeys = hasConstraints ? Object.keys(constraints as object).sort() : [];

  // Group devices by kind
  const devicesByKind = new Map<string, Array<{ label: string; deviceId: string }>>();
  if (hasDevices) {
    for (const d of devices) {
      const dev = d as { deviceId?: string; kind?: string; label?: string };
      const kind = dev.kind ?? 'unknown';
      if (!devicesByKind.has(kind)) devicesByKind.set(kind, []);
      devicesByKind.get(kind)!.push({
        label: dev.label ?? dev.deviceId ?? 'Unnamed',
        deviceId: dev.deviceId ?? '',
      });
      // Sort defaults first
      devicesByKind.get(kind)!.sort((a, b) => {
        const aDefault = a.label.toLowerCase().startsWith('default') ? 0 : 1;
        const bDefault = b.label.toLowerCase().startsWith('default') ? 0 : 1;
        return aDefault - bDefault;
      });
    }
  }
  const kindOrder = ['audioinput', 'videoinput', 'audiooutput'];

  const body = (
    <InfoGrid>
        {parsed && (
          <InfoCard title="Browser">
            <div className={styles.browserInfo}>
              <div className={styles.browserMain}>
                <span className={styles.browserName}>{parsed.browser}</span>
                <span className={styles.browserOs}>{parsed.os}</span>
              </div>
              <details className={styles.uaDetails}>
                <summary className={styles.uaSummary}>User agent string</summary>
                <code className={styles.userAgent}>{parsed.raw}</code>
              </details>
            </div>
          </InfoCard>
        )}
        {hasDevices && (
          <InfoCard title="Media Devices">
            <div className={styles.deviceGroups}>
              {kindOrder
                .filter((kind) => devicesByKind.has(kind))
                .map((kind) => {
                  const meta = DEVICE_KIND_META[kind] ?? { label: kind, icon: '🔌' };
                  const devs = devicesByKind.get(kind)!;
                  return (
                    <div key={kind} className={styles.deviceGroup}>
                      <div className={styles.deviceGroupHeader}>
                        <span>{meta.icon}</span>
                        <span className={styles.deviceGroupLabel}>{meta.label}</span>
                        <span className={styles.deviceGroupCount}>{devs.length}</span>
                      </div>
                      <ul className={styles.deviceList}>
                        {devs.map((d, i) => (
                          <li key={`${d.deviceId}-${i}`} className={styles.deviceItem}>
                            {d.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              {/* Render any unknown kinds */}
              {[...devicesByKind.entries()]
                .filter(([kind]) => !kindOrder.includes(kind))
                .map(([kind, devs]) => (
                  <div key={kind} className={styles.deviceGroup}>
                    <div className={styles.deviceGroupHeader}>
                      <span>🔌</span>
                      <span className={styles.deviceGroupLabel}>{kind}</span>
                      <span className={styles.deviceGroupCount}>{devs.length}</span>
                    </div>
                    <ul className={styles.deviceList}>
                      {devs.map((d, i) => (
                        <li key={`${d.deviceId}-${i}`} className={styles.deviceItem}>
                          {d.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </InfoCard>
        )}
        {constraintKeys.length > 0 && (
          <InfoCard title="Supported Constraints">
            <div className={styles.constraintTags}>
              {constraintKeys.map((key) => (
                <span key={key} className={styles.constraintTag}>{key}</span>
              ))}
            </div>
          </InfoCard>
        )}
    </InfoGrid>
  );

  if (embedded) return body;

  return (
    <CollapsibleSection title="Device Details" id="device-details"
      help="client/device-details" defaultOpen={false}>
      {body}
    </CollapsibleSection>
  );
}
