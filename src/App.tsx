import { cn } from "@/lib/utils";

function App() {
  return (
    <main
      className={cn("flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center")}
    >
      <h1 className="text-3xl font-bold tracking-tight">portfolio</h1>
      <p className="text-sm text-neutral-500">
        Vite+ &middot; React &middot; Tailwind CSS v4 &middot; shadcn/ui
      </p>
    </main>
  );
}

export default App;
