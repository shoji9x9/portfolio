import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { navigateToRepository } from "@/lib/repository";

function App() {
  return (
    <section className="flex flex-1 flex-col justify-center gap-6">
      <p className="text-sm font-medium text-muted-foreground">portfolio</p>
      <div className="max-w-2xl space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">移行の準備中です</h1>
        <p className="text-muted-foreground">
          このサイトは Cloudflare 上の新しいポートフォリオへ移行しています。
          各セクションは後続の機能 Issue で順次追加します。
        </p>
      </div>
      <div>
        <Button onClick={navigateToRepository} variant="outline">
          <ExternalLink aria-hidden="true" />
          GitHub で確認する
        </Button>
      </div>
    </section>
  );
}

export default App;
