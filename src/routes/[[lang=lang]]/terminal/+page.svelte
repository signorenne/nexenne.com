<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { get } from 'svelte/store';
	import { SITE } from '$lib/data';
	import { t } from '$lib/i18n';
	import { lgoto } from '$lib/paths';
	import { cycleTheme } from '$lib/tweaks';
	import { switchLanguage } from '$lib/stores/pageFlash';
	import { showToast } from '$lib/stores/toast';

	type LineKind = 'system' | 'input' | 'output' | 'error' | 'art';

	interface Line {
		id: number;
		kind: LineKind;
		text: string;
	}

	interface GuessGame {
		target: number;
		attempts: number;
	}

	interface SnakeGame {
		snake: [number, number][];
		apple: [number, number];
		score: number;
	}

	const prompt = 'guest@nexenne:~$';
	const snakeW = 8;
	const snakeH = 6;
	const fortunes = [
		'Premature optimization is the root of all keyboard firmware.',
		'If it works on the bench, test it twice on the target.',
		'There are two hard things: cache invalidation, naming things, and remembering where the adapter is.',
		'Good logs are love letters to your future self.',
		'Never trust a demo until the cable has been touched.'
	];

	let input = '';
	let inputEl: HTMLInputElement;
	let logEl: HTMLDivElement;
	let lineId = 0;
	let history: string[] = [];
	let historyIndex = 0;
	let matrixMode = false;
	let guess: GuessGame | null = null;
	let snake: SnakeGame | null = null;
	let timers: ReturnType<typeof setTimeout>[] = [];
	let lines: Line[] = [];

	function tt(key: string): string {
		return get(t)(key);
	}

	function bootLines(): Line[] {
		return [
			line('system', 'nexenne tty0 - fake shell, real buttons'),
			line('system', `operator: ${SITE.owner.toLowerCase()} · zone: bergamo · mode: playful`),
			line('output', tt('terminal.boot')),
			line('output', 'try: help, scan, fortune, snake, guess, matrix')
		];
	}

	function line(kind: LineKind, text: string): Line {
		lineId += 1;
		return { id: lineId, kind, text };
	}

	function push(kind: LineKind, text: string) {
		lines = [...lines, line(kind, text)];
		void scrollDown();
	}

	async function scrollDown() {
		await tick();
		if (logEl) logEl.scrollTop = logEl.scrollHeight;
	}

	function focusInput() {
		inputEl?.focus();
	}

	function resetTerminal() {
		guess = null;
		snake = null;
		matrixMode = false;
		lines = bootLines();
		void scrollDown();
	}

	function helpText(): string {
		return [
			'available commands:',
			'  help        show this list',
			'  whoami      profile packet',
			'  stack       tools and tech',
			'  projects    jump to projects',
			'  contact     jump to contact',
			'  scan        fake hardware scan',
			'  fortune     print questionable wisdom',
			'  matrix      toggle green nonsense',
			'  theme       cycle site theme',
			'  lang        switch language',
			'  guess       tiny number game',
			'  snake       tiny snake, move with w/a/s/d',
			'  clear       reboot this fake shell',
			'easter eggs: sudo, coffee, rm -rf /, xyzzy, opengl'
		].join('\n');
	}

	function startGuess() {
		guess = { target: Math.floor(Math.random() * 9) + 1, attempts: 0 };
		push('output', 'guess mode armed: pick a number from 1 to 9. type a number, or guess 5.');
	}

	function playGuess(raw: string): boolean {
		if (!guess) return false;
		const numberText = raw.replace(/^guess\s*/i, '').trim();
		const n = Number(numberText);
		if (!Number.isInteger(n)) return false;
		guess.attempts += 1;
		if (n === guess.target) {
			push(
				'output',
				`hit after ${guess.attempts} attempt${guess.attempts === 1 ? '' : 's'}. extremely scientific.`
			);
			guess = null;
		} else {
			push(
				'output',
				n < guess.target ? 'too low. the firmware laughs politely.' : 'too high. reduce voltage.'
			);
		}
		return true;
	}

	function startSnake() {
		snake = {
			snake: [
				[3, 2],
				[2, 2],
				[1, 2]
			],
			apple: [6, 3],
			score: 0
		};
		push('output', 'snake mode: use w/a/s/d, or stop. walls are not firmware friendly.');
		push('art', renderSnake());
	}

	function renderSnake(): string {
		if (!snake) return '';
		const cells: string[] = [];
		for (let y = 0; y < snakeH; y += 1) {
			let row = '';
			for (let x = 0; x < snakeW; x += 1) {
				const isHead = snake.snake[0][0] === x && snake.snake[0][1] === y;
				const isBody = snake.snake.some(([sx, sy], i) => i > 0 && sx === x && sy === y);
				const isApple = snake.apple[0] === x && snake.apple[1] === y;
				row += isHead ? '@' : isBody ? 'o' : isApple ? '*' : '.';
			}
			cells.push(row);
		}
		return `score: ${snake.score}\n+${'-'.repeat(snakeW)}+\n${cells.map((r) => `|${r}|`).join('\n')}\n+${'-'.repeat(snakeW)}+`;
	}

	function nextApple(body: [number, number][], score: number): [number, number] {
		for (let i = 0; i < snakeW * snakeH; i += 1) {
			const x = (score * 3 + i * 5 + 2) % snakeW;
			const y = (score * 2 + i * 7 + 1) % snakeH;
			if (!body.some(([sx, sy]) => sx === x && sy === y)) return [x, y];
		}
		return [0, 0];
	}

	function playSnake(raw: string): boolean {
		if (!snake) return false;
		const cmd = raw.trim().toLowerCase();
		if (cmd === 'stop' || cmd === 'quit') {
			push('output', `snake parked safely. final score: ${snake.score}`);
			snake = null;
			return true;
		}
		const dirs: Record<string, [number, number]> = {
			w: [0, -1],
			a: [-1, 0],
			s: [0, 1],
			d: [1, 0]
		};
		const delta = dirs[cmd];
		if (!delta) return false;
		const [hx, hy] = snake.snake[0];
		const head: [number, number] = [hx + delta[0], hy + delta[1]];
		const hitWall = head[0] < 0 || head[0] >= snakeW || head[1] < 0 || head[1] >= snakeH;
		const hitSelf = snake.snake.some(([sx, sy]) => sx === head[0] && sy === head[1]);
		if (hitWall || hitSelf) {
			push('art', renderSnake());
			push('error', `game over: ${hitWall ? 'wall' : 'self'} fault at (${head[0]}, ${head[1]}).`);
			snake = null;
			return true;
		}
		const ate = head[0] === snake.apple[0] && head[1] === snake.apple[1];
		const body = [head, ...snake.snake];
		if (!ate) body.pop();
		snake = {
			snake: body,
			apple: ate ? nextApple(body, snake.score + 1) : snake.apple,
			score: snake.score + (ate ? 1 : 0)
		};
		push('art', renderSnake());
		return true;
	}

	function scan() {
		const steps = [
			'[00] scanning desk bus... ok',
			'[01] detecting coffee level... low but survivable',
			'[02] checking CAN frames... suspiciously polite',
			'[03] querying LVGL widgets... one button wants attention',
			'[04] conclusion: no production hardware was harmed'
		];
		steps.forEach((step, i) => {
			const timer = setTimeout(() => push('output', step), i * 180);
			timers = [...timers, timer];
		});
	}

	function copyEmail() {
		try {
			navigator.clipboard?.writeText(SITE.email);
			showToast(tt('toast.email'), { tone: 'success' });
			push('output', `${SITE.email} copied to clipboard.`);
		} catch {
			push('error', `clipboard not available. old school path: ${SITE.email}`);
		}
	}

	function runRaw(raw: string) {
		const cmd = raw.trim();
		if (!cmd) return;
		push('input', `${prompt} ${cmd}`);
		if (playSnake(cmd)) return;
		if (playGuess(cmd)) return;

		const low = cmd.toLowerCase();
		if (/^guess(\s+\d+)?$/.test(low)) {
			if (!guess) startGuess();
			else playGuess(cmd);
			return;
		}

		switch (low) {
			case 'help':
			case '?':
				push('output', helpText());
				break;
			case 'whoami':
				push('output', `${SITE.owner} · ${SITE.role}\n${SITE.focus}\n${SITE.location}`);
				break;
			case 'stack':
				push('output', SITE.stack.slice(0, 18).join(' · '));
				break;
			case 'projects':
				push('output', 'opening project index...');
				lgoto('/work/');
				break;
			case 'contact':
				push('output', 'opening contact channel...');
				lgoto('/contact/');
				break;
			case 'email':
				copyEmail();
				break;
			case 'scan':
				scan();
				break;
			case 'fortune':
				push('output', fortunes[Math.floor(Math.random() * fortunes.length)]);
				break;
			case 'coffee':
				push(
					'output',
					'coffee subsystem: unavailable. operator probably drank it while debugging.'
				);
				break;
			case 'sudo':
			case 'sudo make me a sandwich':
				push('error', 'permission denied: this incident will be reported to the rubber duck.');
				break;
			case 'rm -rf /':
				push('output', 'nice try. mounted read-only because this is a static site.');
				break;
			case 'xyzzy':
				push('art', 'A hollow voice says: "wrong cave, correct portfolio."');
				break;
			case 'opengl':
				push('output', 'OpenGL detected: remember, it is an API, not the GPU.');
				break;
			case 'matrix':
				matrixMode = !matrixMode;
				push(
					'output',
					matrixMode
						? 'matrix rain enabled. totally hacker.'
						: 'matrix rain disabled. sunlight restored.'
				);
				break;
			case 'theme':
				cycleTheme();
				push('output', 'theme cycled. photons rearranged.');
				break;
			case 'lang':
				switchLanguage();
				push('output', 'language switch requested.');
				break;
			case 'snake':
				startSnake();
				break;
			case 'clear':
			case 'reset':
				resetTerminal();
				break;
			default:
				push('error', `command not found: ${cmd}. type help before blaming DNS.`);
		}
	}

	function submit() {
		const cmd = input;
		input = '';
		history = [cmd, ...history.filter((h) => h !== cmd)].slice(0, 30);
		historyIndex = -1;
		runRaw(cmd);
	}

	function onInputKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (!history.length) return;
			historyIndex = Math.min(historyIndex + 1, history.length - 1);
			input = history[historyIndex] ?? input;
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (!history.length) return;
			historyIndex = Math.max(historyIndex - 1, -1);
			input = historyIndex >= 0 ? history[historyIndex] : '';
		} else if (e.key === 'Tab') {
			e.preventDefault();
			const options = [
				'help',
				'whoami',
				'stack',
				'projects',
				'contact',
				'scan',
				'fortune',
				'guess',
				'snake'
			];
			const match = options.find((o) => o.startsWith(input.toLowerCase()));
			if (match) input = match;
		}
	}

	onMount(() => {
		resetTerminal();
		void tick().then(focusInput);
	});

	onDestroy(() => {
		for (const timer of timers) clearTimeout(timer);
	});
</script>

<div class="page-anim">
	<header class="page-title terminal-title">
		<div><span class="meta">{$t('terminal.meta')}</span></div>
		<div>
			<h1 class="display">{$t('terminal.title')}</h1>
			<p class="lede" style="margin-top: 16px;">{$t('terminal.lede')}</p>
		</div>
	</header>

	<section class="section terminal-section">
		<div class="terminal-grid">
			<div class="terminal-panel">
				<div class="terminal-panel-head">
					<span class="eyebrow"><span class="dot"></span>{$t('terminal.panel')}</span>
					<div class="terminal-chip-row" aria-hidden="true">
						<span>tty0</span>
						<span>local</span>
						<span>{matrixMode ? 'matrix' : 'idle'}</span>
					</div>
				</div>
				<div class="terminal-shell" class:term-matrix={matrixMode}>
					<div class="terminal-bar" aria-hidden="true">
						<span></span><span></span><span></span>
						<strong>nexenne://terminal</strong>
					</div>
					<div bind:this={logEl} class="terminal-log" aria-live="polite">
						{#each lines as item (item.id)}
							<pre
								class:terminal-in={item.kind === 'input'}
								class:terminal-err={item.kind === 'error'}
								class:terminal-art={item.kind === 'art'}>{item.text}</pre>
						{/each}
					</div>
					<form class="terminal-form" on:submit|preventDefault={submit}>
						<label class="sr-only" for="terminal-input">{$t('terminal.input')}</label>
						<span aria-hidden="true">{prompt}</span>
						<input
							id="terminal-input"
							bind:this={inputEl}
							bind:value={input}
							on:keydown={onInputKeydown}
							autocomplete="off"
							spellcheck="false"
							placeholder="help"
						/>
					</form>
				</div>
			</div>

			<aside class="terminal-side">
				<div class="uses-box">
					<h3>{$t('terminal.commands')}</h3>
					<ul style="list-style: none; padding: 0;">
						<li><span class="k">help</span> · {$t('terminal.cmd.help')}</li>
						<li><span class="k">scan</span> · {$t('terminal.cmd.scan')}</li>
						<li><span class="k">snake</span> · {$t('terminal.cmd.snake')}</li>
						<li><span class="k">guess</span> · {$t('terminal.cmd.guess')}</li>
						<li><span class="k">xyzzy</span> · {$t('terminal.cmd.secret')}</li>
					</ul>
				</div>
				<div class="uses-box">
					<h3>{$t('terminal.notes')}</h3>
					<p style="font-size: 13px; color: var(--ink-2);">{$t('terminal.notes.body')}</p>
				</div>
			</aside>
		</div>
	</section>
</div>
