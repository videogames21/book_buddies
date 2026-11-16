// Run with Node 24 and --conditions=react-server. Resolve the same @/ alias that
// Next.js uses, so schema setup calls the component-owned functions directly.
import { registerHooks } from "node:module";
import { extname } from "node:path";
const sourceRoot = new URL("../src/", import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(
        new URL(specifier.slice(2) + ".ts", sourceRoot).href,
        context,
      );
    }
    if (
      specifier.startsWith(".") &&
      context.parentURL?.startsWith(sourceRoot) &&
      !extname(specifier)
    ) {
      return nextResolve(
        new URL(specifier + ".ts", context.parentURL).href,
        context,
      );
    }
    return nextResolve(specifier, context);
  },
});
const { ensureIndexes } = await import("../src/server/setup/ensure-indexes.ts");
const { getDb, getMongoClient } = await import("../src/server/lib/db.ts");
try {
  await ensureIndexes(getDb());
  console.log("BookBuddies collections and indexes are ready.");
} finally {
  await getMongoClient().close();
}
