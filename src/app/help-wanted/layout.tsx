import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";

export default async function HelpWantedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    return (
      <div className="h-dvh md:min-h-dvh md:h-auto overflow-hidden md:overflow-visible bg-background flex flex-col md:block">
        <SidebarNav />
        <MobileHeader />
        <BottomNav />
        <main className="flex-1 min-h-0 md:pl-72 md:pb-0 flex flex-col md:block overflow-hidden md:overflow-visible">
          <div className="flex-1 min-h-0 flex flex-col md:block w-full pt-[3.75rem] md:pt-0 pb-[4.5rem] md:pb-0">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
