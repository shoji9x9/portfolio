import type { Lapras } from "@/data";

import { useEffect, useState } from "react";

import { PortfolioSection } from "@/components/portfolio/PortfolioSection";
import { TextLink } from "@/components/portfolio/TextLink";
import { fetchLaprasPreview, type LaprasPreview } from "@/lib/lapras-preview";

const FALLBACK_LABEL = "LAPRAS 公開プロフィール";

type LaprasPreviewContentProps = {
  lapras: Lapras;
  preview: LaprasPreview | null;
  onImageError?: () => void;
};

export function LaprasPreviewContent({ lapras, preview, onImageError }: LaprasPreviewContentProps) {
  if (preview === null) {
    return <TextLink href={lapras.publicUrl}>{FALLBACK_LABEL}</TextLink>;
  }
  return (
    <div className="w-192">
      <a href={lapras.publicUrl} rel="noreferrer" target="_blank">
        <img alt={preview.title} onError={onImageError} src={preview.image} />
      </a>
    </div>
  );
}

export function LaprasSection({ lapras }: { lapras: Lapras }) {
  const [preview, setPreview] = useState<LaprasPreview | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async (): Promise<void> => {
      const result = await fetchLaprasPreview(lapras.publicUrl, controller.signal);
      if (!controller.signal.aborted) setPreview(result);
    };
    void load();
    return () => {
      controller.abort();
    };
  }, [lapras.publicUrl]);

  return (
    <PortfolioSection heading="LAPRAS" id="lapras">
      <LaprasPreviewContent
        lapras={lapras}
        onImageError={() => {
          setPreview(null);
        }}
        preview={preview}
      />
    </PortfolioSection>
  );
}
