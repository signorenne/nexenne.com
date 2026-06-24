import { get } from 'svelte/store';
import { t } from '$lib/i18n';
import { showToast } from '$lib/stores/toast';

const COPY_ICON =
	'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
const CHECK_ICON =
	'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>';

/**
 * Progressive enhancement for rendered article HTML (the `{@html}` prose):
 * - adds a copy button to every code block
 * - adds a hover "#" anchor that copies a deep link to each heading
 * Search highlighting is handled globally in the layout (see $lib/highlight).
 * Everything here is created at runtime and torn down cleanly, leaving no trace
 * in the SSR/feed output. The `_key` (article html) re-runs it on navigation.
 */
export function proseEnhance(node: HTMLElement, _key?: unknown) {
	let cleanups: Array<() => void> = [];

	function teardown() {
		for (const fn of cleanups) fn();
		cleanups = [];
	}

	function apply() {
		// --- Code blocks -------------------------------------------------------
		for (const pre of Array.from(node.querySelectorAll('pre'))) {
			const code = pre.querySelector('code');
			if (!code) continue;
			// Guard against re-wrapping if apply() runs twice on the same nodes.
			if (pre.parentElement?.classList.contains('code-block')) continue;

			// The <pre> scrolls (overflow-x: auto). To keep the control pinned to the
			// visible corner instead of scrolling away with the code, wrap the <pre>
			// in a non-scrolling .code-block and attach the control to the wrapper.
			const wrap = document.createElement('div');
			wrap.className = 'code-block';
			pre.parentNode?.insertBefore(wrap, pre);
			wrap.appendChild(pre);

			// Prefer the build-time data-lang; fall back to the code's language-* class.
			let lang = pre.getAttribute('data-lang') || '';
			if (!lang) {
				const m = code.className.match(/(?:^|\s)language-([\w+#-]+)/);
				if (m) lang = m[1];
			}

			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = lang ? 'copy-code cc-has-lang' : 'copy-code';
			btn.setAttribute('aria-label', get(t)('code.copy'));
			btn.setAttribute('data-hover', '');
			if (lang) {
				const langSpan = document.createElement('span');
				langSpan.className = 'cc-lang';
				langSpan.textContent = lang;
				btn.appendChild(langSpan);
			}
			const iconSpan = document.createElement('span');
			iconSpan.className = 'cc-icon';
			iconSpan.innerHTML = COPY_ICON;
			btn.appendChild(iconSpan);

			let resetTimer: ReturnType<typeof setTimeout> | null = null;
			const onClick = async () => {
				try {
					await navigator.clipboard?.writeText(code.innerText);
					showToast(get(t)('toast.code'), { tone: 'success' });
					iconSpan.innerHTML = CHECK_ICON;
					btn.classList.add('is-done');
					if (resetTimer) clearTimeout(resetTimer);
					resetTimer = setTimeout(() => {
						iconSpan.innerHTML = COPY_ICON;
						btn.classList.remove('is-done');
					}, 1600);
				} catch {
					showToast(get(t)('toast.copyfail'), { tone: 'error' });
				}
			};
			btn.addEventListener('click', onClick);

			pre.classList.add('has-copy');
			wrap.appendChild(btn);

			cleanups.push(() => {
				btn.removeEventListener('click', onClick);
				if (resetTimer) clearTimeout(resetTimer);
				btn.remove();
				pre.classList.remove('has-copy');
				// Unwrap: put the <pre> back where the wrapper was, then drop it.
				if (wrap.parentNode) {
					wrap.parentNode.insertBefore(pre, wrap);
					wrap.remove();
				}
			});
		}

		// --- Heading anchors ---------------------------------------------------
		for (const heading of Array.from(node.querySelectorAll<HTMLElement>('h2[id], h3[id]'))) {
			const id = heading.id;
			if (!id) continue;

			const anchor = document.createElement('a');
			anchor.className = 'heading-anchor';
			anchor.href = `#${id}`;
			anchor.setAttribute('aria-label', get(t)('heading.copylink'));
			anchor.setAttribute('data-hover', '');
			anchor.textContent = '#';

			const onClick = (e: MouseEvent) => {
				e.preventDefault();
				const url = `${location.origin}${location.pathname}#${id}`;
				try {
					navigator.clipboard?.writeText(url);
					showToast(get(t)('toast.link'), { tone: 'success' });
				} catch {
					showToast(get(t)('toast.copyfail'), { tone: 'error' });
				}
				history.replaceState(history.state, '', `#${id}`);
			};
			anchor.addEventListener('click', onClick);
			heading.appendChild(anchor);

			cleanups.push(() => {
				anchor.removeEventListener('click', onClick);
				anchor.remove();
			});
		}
	}

	apply();

	return {
		update() {
			teardown();
			apply();
		},
		destroy: teardown
	};
}
