// 意図的差異層。
//
// 意図的差異レジストリ（`.config/skills/shoji9x9/skills.yml` の
// `skills.replace-strategy.intentional_diffs`）に**宣言済み**の差異について、side ごとの期待値を
// 解決する。宣言の無い差異をここへ書かない——書いた時点で「黙って正規化した」ことになる。
//
// なぜデータセットではなくここに置くか:
// ゴールデンデータセットは現行の論理データを忠実に再現する契約（フェーズ A）なので、現行の実値
// （`Github` / `GithubActions` / `logo=Github`）を保持する。一方でパリティスイートは
// **現・新どちらに当てても green** でなければならない。両立させるには「データセット = 現行の真」
// 「意図的差異層 = 宣言済みの側差」と役割を分けるしかない。
//
// side は Playwright の project 名（`current` / `new`）から解決する。スイート本体の関数シグネチャに
// side を通さずに済ませるため、実行中のテスト情報から引く。
import type { Badge } from "./dataset";

import { test } from "@playwright/test";

export type Side = "current" | "new";

/** 実行中の side。project 名は playwright.config.ts の `projects` が正本。 */
function currentSide(): Side {
  const name = test.info().project.name;
  if (name === "current" || name === "new") return name;
  throw new Error(`未知の project 名です: ${name}（current / new のいずれかを指定する）`);
}

/**
 * 新側だけ変わるバッジ表示名（= img の alt = アクセシブルネーム）。
 * レジストリの `may_change`「GitHub の綴りの是正（新側のみ）」に対応する。
 */
const NEW_SIDE_BADGE_LABEL: Readonly<Record<string, string>> = {
  github: "GitHub",
  "github-actions": "GitHub Actions",
};

/** 新側だけ変わるバッジ画像 URL。同じくレジストリの「GitHub の綴りの是正」に対応する。 */
const NEW_SIDE_BADGE_IMAGE_SRC: Readonly<Record<string, string>> = {
  github:
    "https://img.shields.io/badge/shoji9x9-%2312100E.svg?&style=flat-square&logo=GitHub&logoColor=white",
};

/** 当該 side で期待するバッジ表示名。宣言の無いバッジはデータセットの値をそのまま使う。 */
export function expectedBadgeLabel(badge: Badge, side: Side = currentSide()): string {
  if (side === "current") return badge.label;
  return NEW_SIDE_BADGE_LABEL[badge.id] ?? badge.label;
}

/** 当該 side で期待するバッジ画像 URL。宣言の無いバッジはデータセットの値をそのまま使う。 */
export function expectedBadgeImageSrc(badge: Badge, side: Side = currentSide()): string {
  if (side === "current") return badge.imageSrc;
  return NEW_SIDE_BADGE_IMAGE_SRC[badge.id] ?? badge.imageSrc;
}
