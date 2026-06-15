import { createFileRoute } from "@tanstack/react-router";
import { mockOnlyBeforeLoad } from "@/lib/experience";
import { CatalogStandalone } from "@/components/fireup/CatalogStandalone";

export const Route = createFileRoute("/catalog")({
  beforeLoad: mockOnlyBeforeLoad,
  head: () => ({ meta: [{ title: "Catalog · AI PodOps" }] }),
  component: CatalogStandalone,
});
