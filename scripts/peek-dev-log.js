const fs = require('fs');
const s = fs.readFileSync('e:/02_Workspace/dev-log.txt', 'utf8');
const needle = "Unexpected token '}'";
const i = s.indexOf(needle);
console.log('index', i, 'len', s.length);
console.log(s.slice(Math.max(0, i - 300), i + needle.length + 1200));
