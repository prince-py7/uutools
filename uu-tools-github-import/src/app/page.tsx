import { ArrowRight, Sparkles } from "lucide-react";

import { UuidImageTool } from "@/components/uuid-image-tool";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[22rem] w-[22rem] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
      </div>

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 md:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/10 text-lg font-bold shadow-lg shadow-black/20">
            UU
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">UU-TOOLS</p>
            <p className="text-xs text-muted-foreground">Image API utility</p>
          </div>
        </div>
        <Badge variant="outline" className="hidden rounded-full px-4 py-2 md:flex">
          Professional API Workspace
        </Badge>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-5 pb-10 pt-6 md:px-8 md:pb-16">
        <section className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
          <div className="space-y-7">
            <Badge className="gap-2 rounded-full bg-white/10 px-4 py-2 text-foreground hover:bg-white/10">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              Credentials separated, requests simplified
            </Badge>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl md:text-6xl">
                Get images from your API with a clean UUID workflow.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                UU-TOOLS gives you a polished form for API endpoint details,
                separate credentials, and one dedicated space for an exact
                11-digit UUID before sending the image request.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {["11-digit validation", "API key field", "Secret field", "Token field"].map(
                (item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2"
                  >
                    <ArrowRight className="h-3.5 w-3.5 text-emerald-300" />
                    {item}
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/20">
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-muted-foreground sm:grid-cols-3">
              <div>
                <p className="text-2xl font-semibold text-foreground">01</p>
                <p>Enter credentials separately</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">02</p>
                <p>Submit UUID with ENTER</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">03</p>
                <p>Preview the returned image</p>
              </div>
            </div>
          </div>
        </section>

        <UuidImageTool />
      </main>

      <footer className="border-t border-white/10 px-5 py-6 text-center text-sm text-muted-foreground md:px-8">
        MADE WITH ❤️ BY PRINCE
      </footer>
    </div>
  );
}
