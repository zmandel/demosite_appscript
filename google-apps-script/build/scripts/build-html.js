import { readFileSync, writeFileSync, mkdirSync, unlinkSync, readdirSync } from "fs";
import { dirname } from "path";
import { execSync } from "child_process";
import posthtml from "posthtml";
import include from "posthtml-include";

const parserOptions = {
  // Preserve Apps Script-style templating blocks
  directives: [
    { name: '?!=', start: '<', end: '>' }, // preserves <?!=str.labelSliderRight ?>
    { name: '?=',  start: '<', end: '>' }, // preserves <?=foo?>
    { name: '?',   start: '<', end: '>' }  // preserves generic <? ... ?>
  ]
};

mkdirSync("dist/html", { recursive: true });
mkdirSync("src/.inline-cache", { recursive: true });

const files = readdirSync("src/html", { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
  .map((entry) => entry.name)
  .sort();

for (const fileName of files) {
  const nameWithoutExt = fileName.slice(0, -".html".length);
  const srcPath = `src/html/${fileName}`;
  const tmpPath = `src/.inline-cache/${nameWithoutExt}.pre.html`;
  const outPath = `dist/html/${nameWithoutExt}.html`;

  const html = readFileSync(srcPath, "utf8");
  const result = await posthtml([include({ encoding: "utf8" })]).process(html,
    { from: srcPath, ...parserOptions }
  );
  mkdirSync(dirname(tmpPath), { recursive: true });
  writeFileSync(tmpPath, result.html, "utf8");

  try {
    execSync(`inline-source ${tmpPath} > ${outPath}`, { stdio: "inherit", shell: true });
    console.log(`Built: ${srcPath} -> ${outPath}`);
  } catch (err) {
    console.error(`❌ Failed to build ${srcPath}:`, err.message);
    throw err;
  } finally {
    try {
      unlinkSync(tmpPath);
    } catch {
      //ignore
    }
  }
}