import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { MobileHeader } from "@/components/dashboard/mobile-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh md:min-h-dvh md:h-auto overflow-hidden md:overflow-visible bg-background flex flex-col md:block">
      <SidebarNav />
      <MobileHeader />
      <BottomNav />
      <main className="flex-1 min-h-0 md:pl-72 md:pb-0 flex flex-col md:block overflow-hidden md:overflow-visible">
        <div className="flex-1 min-h-0 flex flex-col md:block overflow-y-auto overscroll-y-contain md:overflow-visible max-w-7xl mx-auto w-full px-3 md:px-8 pt-16 md:pt-8 pb-[4.5rem] md:pb-6 [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
      </main>
    </div>
  );
}
