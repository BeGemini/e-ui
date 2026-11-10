import SiteHeader from "@/app/components/layout/SiteHeader";
import { PracticeProgressProvider } from "@/app/components/layout/PracticeProgress";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <PracticeProgressProvider>
      <SiteHeader />
      {children}
    </PracticeProgressProvider>
  );
}
