import SiteHeader from "@/app/components/layout/SiteHeader";
import { PracticeProgressProvider } from "@/app/components/layout/PracticeProgress";
import { SubtitleEditorActionsProvider } from "@/app/components/layout/SubtitleEditorActions";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <PracticeProgressProvider>
      <SubtitleEditorActionsProvider>
        <SiteHeader />
        {children}
      </SubtitleEditorActionsProvider>
    </PracticeProgressProvider>
  );
}
