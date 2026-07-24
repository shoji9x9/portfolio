// dependency-cruiser 設定（https://github.com/sverweij/dependency-cruiser）
// 本ファイルは ESM（`export default`）。package.json が `type: module` のため
// `.js` は ESM として読まれる。dependency-cruiser 18 は TypeScript v7 用の
// トランスパイラをまだ持たないため設定の `.ts` 化は不可（本 .js に留める）。
// TypeScript の path/alias 解決のため tsConfig を参照する（読み取りのみ）。
/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: "no-circular",
      comment: "循環依存を禁止する。",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      comment: "どこからも参照されない孤立モジュールを検出する（型定義・設定は除外）。",
      severity: "warn",
      from: {
        orphan: true,
        pathNot: [
          "(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|cts|mts|json)$",
          "\\.d\\.ts$",
          "(^|/)tsconfig\\.[^/]+\\.json$",
          "(^|/)(vite|vitest|tailwind)\\.config\\.[^/]+$",
        ],
      },
      to: {},
    },
    {
      name: "not-to-unresolvable",
      comment: "解決できない import を禁止する（typo・欠落モジュール検出）。",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "no-duplicate-dep-types",
      comment: "同一モジュールへ複数種別（dep/devDep 等）で依存していないか。",
      severity: "warn",
      from: {},
      to: { moreThanOneDependencyType: true, dependencyTypesNot: ["type-only"] },
    },
    {
      name: "not-to-dev-dep",
      comment: "src からは devDependencies に依存しない（本番バンドル汚染防止）。",
      severity: "error",
      from: { path: "^src", pathNot: "\\.(test|spec)\\.(ts|tsx)$" },
      to: { dependencyTypes: ["npm-dev"], dependencyTypesNot: ["type-only"] },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      mainFields: ["module", "main", "types"],
    },
    reporterOptions: {
      dot: { collapsePattern: "node_modules/(@[^/]+/[^/]+|[^/]+)" },
    },
  },
};
