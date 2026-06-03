export const project = {
  id: "automarket",
  name: "AutoMarket — Car Selling Platform",
  codebases: [
    {
      id: "backend" as const,
      name: "Backend",
      stack: "Python · FastAPI",
      constitution:
        "snake_case · type-hinted endpoints · pytest > 80% · async SQLAlchemy · pydantic v2",
    },
    {
      id: "web" as const,
      name: "Web",
      stack: "Next.js · TS",
      constitution:
        "PascalCase components · App Router · server actions for mutations · zod validation · tailwind tokens",
    },
    {
      id: "mobile" as const,
      name: "Mobile",
      stack: "Flutter · Dart",
      constitution:
        "BLoC state · go_router · feature-first folders · golden tests for screens",
    },
  ],
};

export const projects = [project.name, "Listr — Property Marketplace", "Kasa — POS Suite"];
