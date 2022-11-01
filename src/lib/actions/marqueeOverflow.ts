/**
 * Svelte action that marquees a child only when it actually overflows.
 *
 * Used on the home bento cards, where a long title or summary should scroll on
 * hover but a short one should stay still. It measures the overflow of the first
 * child (the "track") and, when there is any, sets the CSS variables
 * --marquee-distance and --marquee-duration plus a data-marquee flag. The
 * matching keyframes live in app.css and only animate while the parent
 * .bento-item has data-marquee-hover, which this action toggles on pointer
 * enter and leave. A ResizeObserver re-measures on layout changes.
 */
import type { Action } from 'svelte/action';

interface MarqueeOpts {
	axis?: 'x' | 'y';
}

// Scroll speed per axis, used to derive the animation duration from the distance.
const SPEED_PX_PER_SEC = { x: 40, y: 25 };

export const marqueeOverflow: Action<HTMLElement, MarqueeOpts | undefined> = (node, opts = {}) => {
	let axis: 'x' | 'y' = opts?.axis ?? 'x';
	const track = node.firstElementChild as HTMLElement | null;
	if (!track) return;

	const trigger = node.closest('.bento-item') as HTMLElement | null;

	const update = () => {
		const overflow =
			axis === 'y' ? track.scrollHeight - node.clientHeight : track.scrollWidth - node.clientWidth;
		if (overflow > 2) {
			const distance = overflow + 12;
			const duration = distance / SPEED_PX_PER_SEC[axis];
			node.style.setProperty('--marquee-distance', `-${distance}px`);
			node.style.setProperty('--marquee-duration', `${duration.toFixed(2)}s`);
			node.dataset.marquee = 'true';
			node.dataset.marqueeAxis = axis;
		} else {
			delete node.dataset.marquee;
			delete node.dataset.marqueeAxis;
			node.style.removeProperty('--marquee-distance');
			node.style.removeProperty('--marquee-duration');
		}
	};

	update();

	const ro = new ResizeObserver(update);
	ro.observe(node);
	ro.observe(track);

	const onEnter = () => {
		if (trigger) trigger.dataset.marqueeHover = 'true';
	};
	const onLeave = () => {
		if (trigger) delete trigger.dataset.marqueeHover;
	};
	if (trigger) {
		trigger.addEventListener('pointerenter', onEnter);
		trigger.addEventListener('pointerleave', onLeave);
		trigger.addEventListener('pointercancel', onLeave);
	}

	return {
		update(next: MarqueeOpts | undefined) {
			axis = next?.axis ?? 'x';
			update();
		},
		destroy() {
			ro.disconnect();
			if (trigger) {
				trigger.removeEventListener('pointerenter', onEnter);
				trigger.removeEventListener('pointerleave', onLeave);
				trigger.removeEventListener('pointercancel', onLeave);
				delete trigger.dataset.marqueeHover;
			}
		}
	};
};
