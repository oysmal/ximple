import fs from "fs";
import url from "url";
import path from "path";
import PackageJSON from "../package.json" assert { type: "json" };

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

PackageJSON.scripts = {};
PackageJSON.devDependencies = {};

if (PackageJSON.main.startsWith("dist/")) {
  PackageJSON.main = PackageJSON.main.slice(5);
}

PackageJSON.files = fs.readdirSync(__dirname + "../dist");

fs.writeFileSync(
  path.join(__dirname + "..", "/dist/package.json"),
  Buffer.from(JSON.stringify(PackageJSON, null, 2), "utf-8")
);

fs.copyFileSync(
  path.join(__dirname, "../.npmignore"),
  path.join(__dirname, "..", "/dist/.npmignore")
);
fs.copyFileSync(
  path.join(__dirname, "../LICENSE"),
  path.join(__dirname, "..", "/dist/LICENSE")
);
fs.copyFileSync(
  path.join(__dirname, "../README.md"),
  path.join(__dirname, "..", "/dist/README.md")
);
