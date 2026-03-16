import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import GradientBackdrop from "@/components/GradientBackdrop";
import StudioLite from "@/components/StudioLite";

export default function StudioPage() {
  return (
    <div className="relative min-h-screen bg-black text-white">
      <GradientBackdrop />
      <AppShell>
        <Suspense fallback={<div className="flex min-h-[400px] items-center justify-center text-white/40">Loading...</div>}>
          <StudioLite />
        </Suspense>
      </AppShell>
    </div>
  );
}
