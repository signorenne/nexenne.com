import { copyFileSync, existsSync } from 'node:fs';

// GitHub Pages serves /404.html for unknown URLs.
// adapter-static makes it an empty shell that stays blank until JS loads.
// Copy the prerendered /404 page over it so 404s show content right away.
const src = 'build/404/index.html';
const dst = 'build/404.html';

if (existsSync(src)) {
	copyFileSync(src, dst);
	console.log('postbuild: replaced empty 404.html fallback with the rendered /404 page');
} else {
	console.warn(`postbuild: ${src} not found; leaving the fallback 404.html as-is`);
}
