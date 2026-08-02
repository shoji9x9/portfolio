import { readFile } from "node:fs/promises";

import { __unstable__loadDesignSystem } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";

type TailwindDesignSystem = {
  canonicalizeCandidates(candidates: string[]): string[];
  candidatesToCss(candidates: string[]): (string | null)[];
};

/**
 * Tailwind の Design System を読み込む。
 *
 * Tailwind v4 の安定 API `compile()` は canonical な候補名を公開していないため、
 * Tailwind / VS Code Tailwind IntelliSense と同じ判定源を使うには、この unstable API が必要になる。
 * 依存箇所をここへ集約し、安定 API の追加または oxlint-tailwindcss の動的数値クラス対応後に
 * 置き換え・削除できるようにする。Tailwind 更新時はこのモジュールのテストで互換性を検証する。
 */
export async function loadTailwindDesignSystem(
  stylesheetUrl: URL,
  base: string,
): Promise<TailwindDesignSystem> {
  return __unstable__loadDesignSystem(await readFile(stylesheetUrl, "utf8"), { base });
}

export type CanonicalClassViolation = {
  candidate: string;
  canonical: string;
  column: number;
  line: number;
};

function sourceLocation(source: string, position: number): { column: number; line: number } {
  const preceding = source.slice(0, position);
  const lines = preceding.split("\n");

  return {
    column: (lines.at(-1)?.length ?? 0) + 1,
    line: lines.length,
  };
}

/**
 * Tailwind 自身の抽出器と正規化 API を使い、非 canonical な有効クラスを返す。
 *
 * oxlint-tailwindcss は通常クラスを getClassList() の事前計算結果で判定するため、
 * theme の別名を持つ動的数値クラスを取りこぼす。この検査は候補ごとに
 * canonicalizeCandidates() を呼び、VS Code の Tailwind IntelliSense と判定源を揃える。
 */
export function findCanonicalClassViolations(
  source: string,
  extension: string,
  designSystem: TailwindDesignSystem,
): CanonicalClassViolation[] {
  const scanner = new Scanner({});
  const candidates = scanner.getCandidatesWithPositions({ content: source, extension });

  return candidates.flatMap(({ candidate, position }) => {
    if (designSystem.candidatesToCss([candidate])[0] === null) return [];

    const canonicalCandidates = designSystem.canonicalizeCandidates([candidate]);
    const canonical = canonicalCandidates[0];
    if (canonicalCandidates.length !== 1 || canonical === undefined || canonical === candidate) {
      return [];
    }

    return [
      {
        candidate,
        canonical,
        ...sourceLocation(source, position),
      },
    ];
  });
}
