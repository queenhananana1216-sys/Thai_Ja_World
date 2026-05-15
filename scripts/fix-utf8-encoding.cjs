const { readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/fix-utf8-encoding.cjs <file>");
  process.exit(1);
}

const path = resolve(process.cwd(), target);
let buf = readFileSync(path);
if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
  buf = Buffer.from(buf.slice(2).toString("utf16le"), "utf8");
  writeFileSync(path, buf);
  console.log("[fix-utf8] stripped UTF-16 BOM from", target);
} else if (buf.length >= 4 && buf[1] === 0 && buf[3] === 0) {
  buf = Buffer.from(buf.toString("utf16le"), "utf8");
  writeFileSync(path, buf);
  console.log("[fix-utf8] converted UTF-16 LE to UTF-8:", target);
} else {
  console.log("[fix-utf8] already UTF-8:", target, "head", buf.slice(0, 8).toString("hex"));
}
