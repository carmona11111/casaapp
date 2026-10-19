import {readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';

const root = new URL('../public/', import.meta.url);
const forbiddenName = /(?:github|credenciales?|credentials?|secrets?|tokens?|passwords?)/i;
const token = /(?:github_pat_|gh[pousr]_|ghs_)[A-Za-z0-9_]{12,}/;
const textFile = /\.(?:txt|md|html?|json|js|mjs|cjs|svg|webmanifest|ya?ml)$/i;

function inspect(directory) {
  for (const entry of readdirSync(directory, {withFileTypes: true})) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      inspect(path);
      continue;
    }
    if (!entry.isFile()) continue;
    if (forbiddenName.test(entry.name) || (textFile.test(entry.name) && token.test(readFileSync(path, 'utf8')))) {
      throw new Error(`Archivo de credenciales en public: ${relative(root.pathname, path)}. Muévelo fuera de public antes de compilar.`);
    }
  }
}

inspect(root.pathname);
