/**
 * In-page search highlighter built on the CSS Custom Highlight API.
 *
 * It highlights text ranges without touching the DOM, so it never breaks
 * animated or Svelte-managed components, and clearing is instant because there
 * is nothing to unwrap. The style lives in app.css under the search-hit
 * highlight pseudo-element. Where the API is unavailable it still scrolls to the
 * first match, just without the visual highlight.
 */

const NAME = 'search-hit';
// Decorative, animated, or injected regions we don't want to highlight inside.
const SKIP = '.copy-code, .heading-anchor, .pagestamp, [aria-hidden="true"], script, style';

type HighlightCtor = new (...ranges: Range[]) => unknown;
interface HighlightRegistry {
	set(name: string, h: unknown): void;
	delete(name: string): void;
}

function registry(): HighlightRegistry | null {
	const css = (globalThis as { CSS?: { highlights?: HighlightRegistry } }).CSS;
	return css?.highlights ?? null;
}
function highlightCtor(): HighlightCtor | null {
	return (globalThis as { Highlight?: HighlightCtor }).Highlight ?? null;
}

export function clearHighlights(): void {
	registry()?.delete(NAME);
}

/**
 * Highlight every occurrence of a query inside a root element and scroll to the
 * first match.
 *
 * @param root  The element to search within, usually the page main element.
 * @param query The term to highlight; ignored when shorter than two characters.
 * @return True when at least one match was found and highlighted.
 */
export function highlightIn(root: HTMLElement | null | undefined, query: string): boolean {
	clearHighlights();
	const term = query.trim().toLowerCase();
	if (!root || term.length < 2) return false;

	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
		acceptNode(n) {
			const p = n.parentElement;
			if (!p || p.closest(SKIP)) return NodeFilter.FILTER_REJECT;
			return n.nodeValue && n.nodeValue.toLowerCase().includes(term)
				? NodeFilter.FILTER_ACCEPT
				: NodeFilter.FILTER_REJECT;
		}
	});

	const ranges: Range[] = [];
	let first: Range | null = null;
	let node: Node | null;
	while ((node = walker.nextNode())) {
		const text = node.nodeValue ?? '';
		const low = text.toLowerCase();
		let idx = low.indexOf(term);
		while (idx !== -1) {
			const r = document.createRange();
			r.setStart(node, idx);
			r.setEnd(node, idx + term.length);
			ranges.push(r);
			if (!first) first = r;
			idx = low.indexOf(term, idx + term.length);
		}
	}

	if (!ranges.length || !first) return false;

	const reg = registry();
	const Ctor = highlightCtor();
	if (reg && Ctor) reg.set(NAME, new Ctor(...ranges));

	const target = first;
	requestAnimationFrame(() => {
		const rect = target.getBoundingClientRect();
		const top = rect.top + window.scrollY - window.innerHeight / 2;
		window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
	});
	return true;
}
