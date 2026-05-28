import ImpersonationBanner from "@/components/ImpersonationBanner";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ImpersonationBanner />
      {children}
    </>
  );
}
