import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

mkdirSync("dist", { recursive: true });
execFileSync("tar", ["-czf", "dist/discourse-reply-titles.tar.gz",
  "about.json", "common", "javascripts", "locales", "README.md"]);
console.log("dist/discourse-reply-titles.tar.gz");
