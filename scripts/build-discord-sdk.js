import { build } from "esbuild";
import { access } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const rootDir = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const outfile = join(rootDir, "public", "discord-sdk.js");

try {
  await build({
    entryPoints: [join(rootDir, "src", "discord-sdk-entry.js")],
    bundle: true,
    format: "iife",
    logLevel: "silent",
    outfile
  });
} catch (error) {
  await access(outfile);
  console.warn(`Discord SDK bundle rebuild skipped: ${error.message}`);
  console.warn("Using existing public/discord-sdk.js bundle.");
}
