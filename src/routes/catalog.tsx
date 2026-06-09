import { createFileRoute } from "@tanstack/react-router";
import { CatalogStandalone } from "@/components/fireup/CatalogStandalone";

export const Route = createFileRoute("/catalog")({
  head: () => ({ meta: [{ title: "Catalog · Agency OS" }] }),
  component: CatalogStandalone,
});
