// Monta a pasta de deploy combinada para o Vercel:
//   dist-deploy/            → app novo (Fluxo) na raiz
//   dist-deploy/financeiro/ → app antigo (Finanças), buildado com base=/financeiro/
//   + cópia dos assets absolutos do app antigo (logo/favicon/sons) na raiz,
//     para os caminhos "/logo-icon.png" etc. resolverem mesmo sob /financeiro/.
//
// Uso: node scripts/build-combined.mjs  (chamado por `npm run build:deploy`,
// que roda os dois builds antes).
import { rm, mkdir, cp, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'dist-deploy');
const FLUXO = path.join(root, 'dist-fluxo');
const ANTIGO = path.join(root, 'dist');

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  // valida que os dois builds existem
  for (const [name, p] of [['Fluxo (dist-fluxo)', FLUXO], ['antigo (dist)', ANTIGO]]) {
    if (!(await exists(p))) {
      console.error(`✗ build ${name} não encontrado em ${p}. Rode os builds antes.`);
      process.exit(1);
    }
  }

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  // 1) Fluxo na raiz
  await cp(FLUXO, OUT, { recursive: true });

  // 2) app antigo em /financeiro/
  await cp(ANTIGO, path.join(OUT, 'financeiro'), { recursive: true });

  // 3) assets absolutos do antigo copiados p/ a raiz (não sobrescrevem os do Fluxo:
  //    o Fluxo não usa esses nomes). Assim "/logo-icon.png" funciona sob /financeiro/.
  const publicDir = path.join(root, 'public');
  for (const asset of ['logo-icon.png', 'logo-full.png', 'favicon.png', 'sounds']) {
    const src = path.join(publicDir, asset);
    if (await exists(src)) {
      await cp(src, path.join(OUT, asset), { recursive: true });
    }
  }

  console.log('✓ dist-deploy pronto:');
  console.log('   /            → Fluxo');
  console.log('   /financeiro/ → Finanças');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
