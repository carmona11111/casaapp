import {readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {createHash} from 'node:crypto';

const root = new URL('../public/', import.meta.url);
const forbiddenName = /(?:github|credenciales?|credentials?|secrets?|tokens?|passwords?)/i;
const token = /(?:github_pat_|gh[pousr]_|ghs_)[A-Za-z0-9_]{12,}/;
const textFile = /\.(?:txt|md|html?|json|js|mjs|cjs|svg|webmanifest|ya?ml)$/i;
const artFile = /\.(?:png|jpe?g|webp|svg)$/i;
const artHashes = new Map();

function inspect(directory) {
  for (const entry of readdirSync(directory, {withFileTypes: true})) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      inspect(path);
      continue;
    }
    if (!entry.isFile()) continue;
    if (/\.(?:zip|7z|rar|tar|gz)$/i.test(entry.name)) {
      throw new Error(`Archivo comprimido en public: ${relative(root.pathname, path)}. Guarda solo los recursos que usa la app.`);
    }
    if (forbiddenName.test(entry.name) || (textFile.test(entry.name) && token.test(readFileSync(path, 'utf8')))) {
      throw new Error(`Archivo de credenciales en public: ${relative(root.pathname, path)}. Muévelo fuera de public antes de compilar.`);
    }
    if (artFile.test(entry.name)) {
      const hash=createHash('sha256').update(readFileSync(path)).digest('hex');
      const previous=artHashes.get(hash);
      if(previous)throw new Error(`Arte duplicado en public: ${relative(root.pathname, path)} y ${relative(root.pathname, previous)}.`);
      artHashes.set(hash,path);
    }
  }
}

inspect(root.pathname);
