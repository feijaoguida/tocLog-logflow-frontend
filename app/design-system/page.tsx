import { DesignSystemView } from "@/components/design-system/design-system-view"
import { ContentContainer } from "@/components/layout/content-container"

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ContentContainer>
        <DesignSystemView />
      </ContentContainer>
    </div>
  )
}
