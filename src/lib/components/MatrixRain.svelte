<script lang="ts">
	/**
	 * Digital rain for the terminal's `matrix` mode: columns of glyphs falling
	 * behind the log, brightest at the head and fading out behind.
	 *
	 * This replaced a CSS pseudo-element that painted a fixed string of ones and
	 * zeroes and slid it down the panel. That was a texture, not the effect, and
	 * generated content is text a screen reader can try to announce. A canvas has
	 * neither problem: it is drawn, not written, and it is invisible to assistive
	 * technology by default.
	 */
	import { onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { readThemeColor } from '$lib/colors';
	import { theme, tweaks } from '$lib/tweaks';

	export let active = false;

	/**
	 * The rain is drawn in the terminal's own face, so only glyphs JetBrains Mono
	 * actually has. Katakana is the film's alphabet but the font has none of it,
	 * and every column would render as a missing-glyph box.
	 */
	const GLYPHS = '01<>[]{}()/\\|=+*-#$%&@?!:;.ABCDEFGHJKLMNPQRSTUVWXYZ';

	/** Cell size in CSS pixels, matching the log's own text size. */
	const CELL = 14;
	/** How often a column advances one cell. Per-frame would fall far too fast. */
	const STEP_MS = 58;
	/** Alpha erased each step, which is what turns the trail into a fade. */
	const FADE = 0.09;
	/** Chance per step that a finished column restarts from the top. */
	const RESPAWN = 0.028;
	/** Cap the backing store on high-DPI screens; this is a background texture. */
	const MAX_DPR = 2;

	let canvas: HTMLCanvasElement;
	let frame = 0;
	let last = 0;
	/** Head position of each column, in cells. Negative means it has not entered. */
	let heads: number[] = [];
	let width = 0;
	let height = 0;

	$: motion = $tweaks.motion;
	// Re-read whenever the palette changes: the rain colour follows --term-matrix.
	$: paint = (void [$theme, $tweaks.accent], readThemeColor('--term-matrix', 'rgb(120, 230, 130)'));
	$: if (browser && canvas) sync(active, motion);

	function context(): CanvasRenderingContext2D | null {
		return canvas?.getContext('2d') ?? null;
	}

	function measure() {
		const parent = canvas?.parentElement;
		const ctx = context();
		if (!parent || !ctx) return;

		const rect = parent.getBoundingClientRect();
		const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
		width = rect.width;
		height = rect.height;
		canvas.width = Math.max(1, Math.round(width * dpr));
		canvas.height = Math.max(1, Math.round(height * dpr));
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.font = `${CELL}px var(--font-mono), monospace`;
		ctx.textBaseline = 'top';

		const columns = Math.max(1, Math.ceil(width / CELL));
		heads = Array.from({ length: columns }, () => -Math.random() * (height / CELL));
	}

	function glyph(): string {
		return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
	}

	/** Erase a little of what is already drawn, so trails fade to transparent. */
	function fade(ctx: CanvasRenderingContext2D) {
		ctx.globalCompositeOperation = 'destination-out';
		ctx.fillStyle = `rgba(0, 0, 0, ${FADE})`;
		ctx.fillRect(0, 0, width, height);
		ctx.globalCompositeOperation = 'source-over';
	}

	function step() {
		const ctx = context();
		if (!ctx) return;

		fade(ctx);
		heads = heads.map((head, column) => {
			const y = head * CELL;
			if (y >= 0 && y < height) {
				// The leading glyph is bright; the fade behind it does the rest.
				ctx.fillStyle = paint;
				ctx.fillText(glyph(), column * CELL, y);
			}
			if (y > height) return Math.random() < RESPAWN ? -1 : head;
			return head + 1;
		});
	}

	function loop(now: number) {
		if (now - last >= STEP_MS) {
			last = now;
			step();
		}
		frame = requestAnimationFrame(loop);
	}

	/** One still frame, for visitors who have asked for reduced motion. */
	function paintStill() {
		const ctx = context();
		if (!ctx) return;
		ctx.clearRect(0, 0, width, height);
		ctx.fillStyle = paint;
		ctx.globalAlpha = 0.5;
		for (let column = 0; column * CELL < width; column += 1) {
			const rows = Math.floor(Math.random() * (height / CELL));
			for (let row = 0; row < rows; row += 1) {
				ctx.globalAlpha = 0.12 + (row / Math.max(1, rows)) * 0.5;
				ctx.fillText(glyph(), column * CELL, row * CELL);
			}
		}
		ctx.globalAlpha = 1;
	}

	function stop() {
		if (frame) cancelAnimationFrame(frame);
		frame = 0;
		const ctx = context();
		if (ctx) ctx.clearRect(0, 0, width, height);
	}

	function sync(on: boolean, allowMotion: boolean) {
		stop();
		if (!on) return;
		measure();
		if (!allowMotion) {
			paintStill();
			return;
		}
		last = 0;
		frame = requestAnimationFrame(loop);
	}

	onDestroy(stop);
</script>

<svelte:window on:resize={() => sync(active, motion)} />

<canvas bind:this={canvas} class="terminal-rain" aria-hidden="true"></canvas>
