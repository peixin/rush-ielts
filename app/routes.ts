import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("study", "routes/study.tsx"),
  route("settings", "routes/settings.tsx"),
  route("import", "routes/import.tsx"),
  route("vocabulary", "routes/vocabulary.tsx"),
  route("collections", "routes/collections.tsx"),
  route("api/dict", "routes/api.dict.ts"),
] satisfies RouteConfig;