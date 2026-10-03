"use client";

import { useState } from "react";
import Image from "next/image";
import { selectProjectPictogram } from "@/src/lib/project-pictograms.mjs";

export function ProjectPictogram({ project, className = "size-12" }: {
  project: { title: string; purpose?: string; situation?: string; pictogram_id?: string }; className?: string;
}) {
  const image = selectProjectPictogram(project);
  const [failedPath, setFailedPath] = useState<string | null>(null);
  return <span className={`inline-flex shrink-0 items-center justify-center ${className}`}>
    {/* SVG is decorative: the parent already names the project. Never substitute an unrelated illustration. */}
    {failedPath !== image.path && <Image src={image.path} alt="" aria-hidden="true" width={128} height={128} unoptimized
      className="size-full object-contain" title={image.title} onError={() => setFailedPath(image.path)} />}
  </span>;
}
