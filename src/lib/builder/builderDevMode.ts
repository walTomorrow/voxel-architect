export function isBuilderDevMode(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_BUILDER_DEV_TOOLS === "true"
  );
}
