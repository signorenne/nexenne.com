<script lang="ts">
	import { MASCOT_PATH, MASCOT_VIEWBOX } from '$lib/brand/mascot';

	export let embedded = false;
	export let x: number | undefined = undefined;
	export let y: number | undefined = undefined;
	export let width: number | undefined = undefined;
	export let height: number | undefined = undefined;
	export let paint = 'currentColor';
</script>

<!-- "Marco" (pipotto) logo, using currentColor by default or an SVG paint supplied by its parent. -->
<svg
	class:logo-mark={!embedded}
	class:logo-mark-embedded={embedded}
	{x}
	{y}
	{width}
	{height}
	viewBox={MASCOT_VIEWBOX}
	xmlns="http://www.w3.org/2000/svg"
	aria-hidden="true"
	focusable="false"
>
	<path fill={paint} d={MASCOT_PATH} />
</svg>
