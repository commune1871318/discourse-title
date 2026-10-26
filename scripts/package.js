import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

mkdirSync("dist", { recursive: true });
execFileSync("tar", ["-czf", "dist/discourse-reply-titles-plugin.tar.gz",
  "--transform=s,^,discourse-reply-titles/,",
  "plugin.rb", "assets", "config", "README.md", "package.json", "package-lock.json",
  "scripts", "tests", "test", "docs"]);
console.log("dist/discourse-reply-titles-plugin.tar.gz");
