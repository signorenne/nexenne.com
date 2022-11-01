<script lang="ts">
	export let text: string;
	$: lines = text.split('\n');

	function parseLine(l: string) {
		if (l.startsWith('#')) return { kind: 'comment' as const, text: l };
		const m = l.match(/^\[(.+?)\]/);
		if (m) return { kind: 'bracket' as const, key: m[1], rest: l.slice(m[0].length) };
		if (l.includes('=')) return { kind: 'kv' as const, parts: l.split(/(=)/) };
		return { kind: 'plain' as const, text: l };
	}
</script>

<pre>{#each lines as l, i (i)}{@const parsed =
			parseLine(l)}<div>{#if parsed.kind === 'comment'}<span class="c-com">{parsed.text}</span
				>{:else if parsed.kind === 'bracket'}<span class="c-key">[{parsed.key}]</span
				>{parsed.rest}{:else if parsed.kind === 'kv'}{#each parsed.parts as part, j (j)}{#if part === '='}<span
							class="c-key">=</span
						>{:else}{part}{/if}{/each}{:else}{parsed.text}{/if}</div>{/each}</pre>
