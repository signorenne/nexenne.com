<script lang="ts">
	import { t } from '$lib/i18n';

	const sections: { box: string; items: { k: string; v: string }[] }[] = [
		{
			box: 'uses.box.computer',
			items: [
				{ k: 'uses.k.editors', v: 'uses.v.editors' },
				{ k: 'uses.k.terminal', v: 'uses.v.terminal' },
				{ k: 'uses.k.notes', v: 'uses.v.notes' },
				{ k: 'uses.k.debug', v: 'uses.v.debug' }
			]
		},
		{
			box: 'uses.box.desk',
			items: [
				{ k: 'uses.k.boards', v: 'uses.v.boards' },
				{ k: 'uses.k.display', v: 'uses.v.display' },
				{ k: 'uses.k.bus_tools', v: 'uses.v.bus_tools' },
				{ k: 'uses.k.audio', v: 'uses.v.audio' }
			]
		},
		{
			box: 'uses.box.build',
			items: [
				{ k: 'uses.k.toolchain', v: 'uses.v.toolchain' },
				{ k: 'uses.k.test', v: 'uses.v.test' },
				{ k: 'uses.k.vcs', v: 'uses.v.vcs' },
				{ k: 'uses.k.rtos', v: 'uses.v.rtos' }
			]
		},
		{
			box: 'uses.box.shipping',
			items: [
				{ k: 'uses.k.site', v: 'uses.v.site' },
				{ k: 'uses.k.content', v: 'uses.v.content' },
				{ k: 'uses.k.hosting', v: 'uses.v.hosting' }
			]
		}
	];

	const literalValues: Record<string, string> = {
		'uses.v.editors': 'Doom Emacs · Zed · QtCreator',
		'uses.v.terminal': 'Bash · Zsh · Ghostty',
		'uses.v.toolchain': 'GCC · Conan · ESP-IDF · Android SDK'
	};

	function resolveV(key: string, dict: (k: string) => string): string {
		const fromDict = dict(key);
		if (fromDict && fromDict !== key) return fromDict;
		return literalValues[key] ?? key;
	}
</script>

<div class="page-anim">
	<header class="page-title">
		<div><span class="meta">{$t('uses.meta')}</span></div>
		<div>
			<h1 class="display">{$t('uses.title')}</h1>
			<p class="lede" style="margin-top: 16px;">{$t('uses.lede')}</p>
		</div>
	</header>

	<section class="section">
		<div class="uses-grid">
			{#each sections as section (section.box)}
				<div class="uses-box">
					<h3>{$t(section.box)}</h3>
					<ul style="list-style: none; padding: 0;">
						{#each section.items as it (it.k)}
							<li><span class="k">{$t(it.k)}</span> · {resolveV(it.v, $t)}</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	</section>
</div>
