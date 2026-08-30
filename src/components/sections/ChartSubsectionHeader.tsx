'use client';
import { CopyCsvButton } from './CopyCsvButton.tsx';
import styles from './ChartSubsectionHeader.module.css';

export interface ChartSubsectionHeaderProps {
  title: string;
  titleClassName?: string;
  getCsv?: () => string | null;
}

export function ChartSubsectionHeader({
  title,
  titleClassName,
  getCsv,
}: ChartSubsectionHeaderProps) {
  return (
    <div className={styles.header}>
      <h5 className={titleClassName ?? styles.title}>{title}</h5>
      {getCsv && <CopyCsvButton getText={getCsv} />}
    </div>
  );
}
