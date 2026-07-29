#!/usr/bin/env node
/**
 * Reformat the C and C++ snippets inside authored articles.
 *
 * Article code should read like the nexenne library it describes, but the
 * snippets live inside Markdown fences and Org src blocks where no formatter
 * reaches them, so they drift. This extracts each block, runs clang-format with
 * the library's own style, and writes it back.
 *
 * Usage:
 *   node scripts/format-snippets.mjs           check only, exits 1 if any drift
 *   node scripts/format-snippets.mjs --write    reformat in place
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const STYLE = `--style=file:${join(process.cwd(), 'scripts/nexenne.clang-format')}`;
const WRITE = process.argv.includes('--write');

function walk(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return walk(path);
		return ['.md', '.org'].includes(extname(path)) ? [path] : [];
	});
}

function format(code, lang) {
	const result = spawnSync(
		'clang-format',
		[STYLE, `--assume-filename=main.${lang === 'cpp' ? 'cpp' : 'c'}`],
		{ input: code, encoding: 'utf8' }
	);
	if (result.error) {
		console.error('clang-format is not available on PATH');
		process.exit(2);
	}
	return result.status === 0 ? result.stdout : null;
}

// Markdown fences and Org src blocks, capturing the opener, body and closer.
const PATTERNS = {
	'.md': /(^```(?:cpp|c)\n)([\s\S]*?)(^```)/gm,
	'.org': /(^#\+begin_src\s+(?:cpp|c)\b[^\n]*\n)([\s\S]*?)(^#\+end_src)/gim
};

let drifted = 0;
const files = walk('content');
for (const file of files) {
	const original = readFileSync(file, 'utf8');
	const updated = original.replace(PATTERNS[extname(file)], (whole, head, code, tail) => {
		const lang = head.toLowerCase().includes('cpp') ? 'cpp' : 'c';
		const out = format(code, lang);
		if (out === null || out === code) return whole;
		drifted += 1;
		return head + (out.endsWith('\n') ? out : `${out}\n`) + tail;
	});
	if (updated !== original && WRITE) writeFileSync(file, updated);
}

if (!drifted) {
	console.log(`snippets already formatted (${files.length} articles checked)`);
	process.exit(0);
}
console.log(`${drifted} snippet(s) ${WRITE ? 'reformatted' : 'need formatting'}`);
process.exit(WRITE ? 0 : 1);
