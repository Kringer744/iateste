"use client";

export const dynamic = "force-dynamic";

import { useSegmentGuard } from "@/hooks/useSegmentGuard";

export default function HotelLayout({ children }: { children: React.ReactNode }) {
  const { ready } = useSegmentGuard("hotel");

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-white/60 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
