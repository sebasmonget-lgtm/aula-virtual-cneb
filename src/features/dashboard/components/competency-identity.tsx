import Image from "next/image";
import type { CSSProperties } from "react";
import { competencyImage, competencyLabel, competencyVisual } from "@/src/lib/competency-presentation";
import styles from "./period-review.module.css";

export function competencyTheme(id: string): CSSProperties {
  const visual = competencyVisual(id);
  return {
    "--competency-ink": visual?.foreground ?? "#345372",
    "--competency-surface": visual?.background ?? "#edf5fa",
  } as CSSProperties;
}

/** Presentation aliases never replace the official name in data or documents. */
export function CompetencyIdentity({ id, name, compact = false }: { id: string; name: string; compact?: boolean }) {
  const image = competencyVisual(id)?.image ?? competencyImage(id);
  return <span className={`${styles.competencyIdentity} ${compact ? styles.competencyCompact : ""}`} style={competencyTheme(id)}>
    {image && <Image src={image} width={compact ? 32 : 52} height={compact ? 32 : 52} unoptimized alt="" aria-hidden="true" />}
    <span><strong>{competencyLabel(id, name)}</strong>{!compact && <span className={styles.officialName}>{name}</span>}</span>
  </span>;
}
