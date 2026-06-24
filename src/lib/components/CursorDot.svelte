<script lang="ts">
	import { onMount } from 'svelte';

	const NATIVE_WIDGET =
		'select, input[type="date"], input[type="time"], input[type="month"], input[type="week"], input[type="datetime-local"], input[type="color"], input[type="file"]';

	onMount(() => {
		const dot = document.getElementById('cursor-dot');
		if (!dot) return;

		// The dot tracks a real mouse pointer. On touch / no-hover devices (phones,
		// tablets) `pointermove` fires from taps, leaving a dot under the finger, so
		// skip the whole thing and keep it hidden there.
		if (window.matchMedia('(hover: none), (pointer: coarse)').matches) {
			dot.classList.add('is-hidden');
			return;
		}

		const setPos = (x: number, y: number) => {
			dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
		};
		const hide = () => dot.classList.add('is-hidden');
		const revealAt = (x: number, y: number) => {
			setPos(x, y);
			// Force layout while hidden so reveal starts at the current pointer position.
			void dot.offsetWidth;
			requestAnimationFrame(() => dot.classList.remove('is-hidden'));
		};

		const onMove = (e: MouseEvent | PointerEvent) => {
			if (dot.classList.contains('is-hidden')) {
				revealAt(e.clientX, e.clientY);
			} else {
				setPos(e.clientX, e.clientY);
			}
		};
		const onOver = (e: MouseEvent | PointerEvent) => {
			const target = e.target as Element | null;
			const hov = target?.closest(
				'[data-hover], a, button, .card, .bento-item, .work-row, .post-row, .svc, .cmd-item'
			);
			dot.classList.toggle('is-hover', !!hov);
		};
		const onEnter = (e: MouseEvent) => {
			if (dot.classList.contains('is-hidden')) revealAt(e.clientX, e.clientY);
			else setPos(e.clientX, e.clientY);
		};
		const onPointerDown = (e: PointerEvent) => {
			const target = e.target as Element | null;
			if (target?.closest(NATIVE_WIDGET)) hide();
		};

		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerover', onOver);
		window.addEventListener('pointerdown', onPointerDown, true);
		document.addEventListener('mouseenter', onEnter);
		document.addEventListener('mouseleave', hide);
		window.addEventListener('blur', hide);
		return () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerover', onOver);
			window.removeEventListener('pointerdown', onPointerDown, true);
			document.removeEventListener('mouseenter', onEnter);
			document.removeEventListener('mouseleave', hide);
			window.removeEventListener('blur', hide);
		};
	});
</script>
