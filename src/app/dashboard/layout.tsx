import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { MobileHeader } from "@/components/dashboard/mobile-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <SidebarNav />
      <MobileHeader />
      <BottomNav />
      <main className="md:pl-72 pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 pt-[4.5rem] md:pt-8 pb-6 md:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
