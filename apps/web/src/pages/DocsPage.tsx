import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { DocsContent } from "@/components/docs/docs-content";
import { SoftGradientBackground } from "@/components/ui/soft-gradient-background";

export function DocsPage() {
  return (
    <div className="docs-public-page">
      <SoftGradientBackground variant="top" intensity="subtle" />
      <SiteHeader />
      <DocsContent />
      <SiteFooter />
    </div>
  );
}
