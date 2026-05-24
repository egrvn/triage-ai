import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { DocsContent } from "@/components/docs/docs-content";

export function DocsPage() {
  return (
    <div className="docs-public-page">
      <SiteHeader />
      <DocsContent />
      <SiteFooter />
    </div>
  );
}
