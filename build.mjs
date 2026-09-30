/**
 * Writes one state of the demo site into `docs/`, which GitHub Pages publishes from `main`.
 * Refuses to write a pair of states that breaks a rule in `src/lib/site-rules.mjs`.
 *
 * Usage: node build.mjs a|b
 *
 * Moving from one state to the other is a new commit of `docs/`, never a rollback.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLISHED_HOST, STATES, siteFiles } from './src/lib/site.mjs';
import { ruleViolations } from './src/lib/site-rules.mjs';
import { writeSiteDir } from './src/adapters/site-dir.mjs';

const state = process.argv[2];
if (!STATES.includes(state)) {
    console.error(`Usage: node build.mjs ${STATES.join('|')}`);
    process.exit(2);
}

const broken = ruleViolations(siteFiles('a'), siteFiles('b'));
if (broken.length > 0) {
    console.error(`Not built. The site breaks its own rules:\n  ${broken.join('\n  ')}`);
    process.exit(1);
}

const files = siteFiles(state);
writeSiteDir(join(dirname(fileURLToPath(import.meta.url)), 'docs'), files);
console.log(`docs/ now holds state ${state} for ${PUBLISHED_HOST}: ${files.size} files.`);
