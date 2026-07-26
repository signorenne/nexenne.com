<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { get } from 'svelte/store';
	import { SITE, SITE_URL } from '$lib/data';
	import { fill, lang, t } from '$lib/i18n';
	import { lgoto } from '$lib/paths';
	import { copyText } from '$lib/share';
	import { switchLanguage } from '$lib/stores/pageFlash';
	import { showToast } from '$lib/stores/toast';
	import {
		SNAKE_HEIGHT,
		SNAKE_TICK_MS,
		SNAKE_WIDTH,
		VISIBLE_COMMANDS,
		WORKING_DIRECTORY,
		buildHelp,
		buildManual,
		completeTerminalInput,
		directionFrom,
		entryPath,
		findCommand,
		findEntry,
		listPath,
		moveSnake,
		newSnake,
		nextApple,
		parseCommand,
		promptPath,
		renderSnakeBoard,
		resolveDirectory,
		resolveTarget,
		searchEntries,
		steerSnake,
		usageFor,
		type Point,
		type SnakeDirection,
		type SnakeState
	} from '$lib/terminal';
	import { cycleTheme } from '$lib/tweaks';
	import type { ContentLang } from '$lib/content/types';
	import type { PageData } from './$types';

	export let data: PageData;
	import MatrixRain from '$lib/components/MatrixRain.svelte';

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

	const USER = 'guest@nexenne';
	const SHORT_PROMPT = '~ $';
	/** How many stack entries `stack` and `cat stack.txt` print before stopping. */
	const STACK_LIMIT = 18;
	const HISTORY_LIMIT = 50;
	/** Delay between scan lines, slow enough to read but not to wait through. */
	const SCAN_STEP_MS = 260;
	const QUICK_COMMANDS = ['help', 'ls', 'whoami', 'open', 'scan', 'snake'];
	const ARROW_KEYS: Record<string, SnakeDirection> = {
		ArrowUp: 'up',
		ArrowDown: 'down',
		ArrowLeft: 'left',
		ArrowRight: 'right'
	};

	const quickCommands = VISIBLE_COMMANDS.filter((command) => QUICK_COMMANDS.includes(command.name));

	let input = '';
	let inputEl: HTMLInputElement;
	let logEl: HTMLDivElement;
	let lineId = 0;
	let history: string[] = [];
	let historyIndex = -1;
	let matrixMode = false;
	let guess: GuessGame | null = null;
	let snake: SnakeState | null = null;
	/** The id of the log line the live board redraws into. */
	let boardLineId: number | null = null;
	let snakeTimer: ReturnType<typeof setInterval> | null = null;
	/** The turn the player asked for, applied on the next tick. */
	let steered: SnakeDirection | null = null;
	let scanRunning = false;
	let timers: ReturnType<typeof setTimeout>[] = [];
	let asyncRun = 0;
	let lines: Line[] = [];
	/** Current directory in the virtual tree: '' is the root. */
	let cwd = '';

	// The index the filesystem commands read, in the language being browsed.
	$: content = {
		work: data.work.map((b) => b.byLang[$lang as ContentLang] ?? Object.values(b.byLang)[0]),
		blog: data.blog.map((b) => b.byLang[$lang as ContentLang] ?? Object.values(b.byLang)[0])
	};
	$: prompt = `${USER}:${promptPath(cwd)}$`;

	$: busy = scanRunning || Boolean(snake) || Boolean(guess);
	$: statusText = snake
		? fill($t('terminal.status.snake'), { score: snake.score })
		: guess
			? fill($t('terminal.status.guess'), { attempts: guess.attempts })
			: scanRunning
				? $t('terminal.status.scan')
				: matrixMode
					? $t('terminal.status.matrix')
					: $t('terminal.status.ready');

	function tt(key: string): string {
		return get(t)(key);
	}

	function line(kind: LineKind, text: string): Line {
		lineId += 1;
		return { id: lineId, kind, text };
	}

	function bootLines(): Line[] {
		return [
			line('system', tt('terminal.boot.tty')),
			line('system', fill(tt('terminal.boot.operator'), { owner: SITE.owner.toLowerCase() })),
			line('output', tt('terminal.boot')),
			line('output', tt('terminal.boot.try'))
		];
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
		inputEl?.focus({ preventScroll: true });
	}

	function focusInputForFinePointer() {
		if (window.matchMedia('(pointer: fine)').matches) focusInput();
	}

	/** Cancel a running scan only. A snake game is separate and survives this. */
	function stopScan() {
		asyncRun += 1;
		for (const timer of timers) clearTimeout(timer);
		timers = [];
		scanRunning = false;
	}

	/** Stop everything the page has running: used by reset, cancel and unmount. */
	function stopTimers() {
		stopScan();
		stopSnakeTimer();
	}

	function resetTerminal() {
		stopTimers();
		cwd = '';
		guess = null;
		snake = null;
		matrixMode = false;
		historyIndex = -1;
		lines = bootLines();
		void scrollDown();
	}

	function clearScreen() {
		lines = [];
		void scrollDown();
	}

	function cancelActivity() {
		// Read the sources directly rather than the reactive `busy`, so this does
		// not depend on when Svelte last flushed.
		const hadActivity = scanRunning || Boolean(guess) || Boolean(snake);
		stopTimers();
		guess = null;
		snake = null;
		if (hadActivity) {
			push('input', '^C');
			push('system', tt('terminal.cancelled'));
		}
	}

	function startGuess() {
		guess = { target: Math.floor(Math.random() * 9) + 1, attempts: 0 };
		push('output', tt('terminal.guess.start'));
	}

	function playGuess(raw: string): boolean {
		if (!guess) return false;
		const numberText = raw.replace(/^guess\s*/i, '').trim();
		if (numberText === 'stop' || numberText === 'quit') {
			push('output', tt('terminal.guess.stop'));
			guess = null;
			return true;
		}
		if (!/^[1-9]$/.test(numberText)) return false;
		const number = Number(numberText);
		guess.attempts += 1;
		if (number === guess.target) {
			push('output', fill(tt('terminal.guess.hit'), { attempts: guess.attempts }));
			guess = null;
		} else {
			push('output', number < guess.target ? tt('terminal.guess.low') : tt('terminal.guess.high'));
		}
		return true;
	}

	/**
	 * Start a real game: the snake moves on its own from here, and steering only
	 * changes where it is heading. It used to advance one cell per typed command,
	 * which is not a game of snake.
	 */
	function startSnake() {
		stopSnakeTimer();
		snake = newSnake();
		steered = null;
		push('output', tt('terminal.snake.start'));
		boardLineId = pushBoard(snake);
		snakeTimer = setInterval(tickSnake, SNAKE_TICK_MS);
	}

	function stopSnakeTimer() {
		if (snakeTimer) clearInterval(snakeTimer);
		snakeTimer = null;
		boardLineId = null;
	}

	function boardText(state: SnakeState): string {
		const score = fill(tt('terminal.snake.score'), { score: state.score });
		return `${score}\n${renderSnakeBoard(state, SNAKE_WIDTH, SNAKE_HEIGHT)}`;
	}

	/** Append the board and return the line id, so later frames can redraw it. */
	function pushBoard(state: SnakeState): number {
		push('art', boardText(state));
		return lineId;
	}

	/**
	 * Redraw the board in place. Appending a frame per tick would bury the session
	 * under hundreds of boards, so the game owns one line and rewrites it.
	 */
	function drawBoard(state: SnakeState) {
		const text = boardText(state);
		// `clear` can wipe the board out from under a running game; put it back
		// rather than ticking on invisibly.
		if (boardLineId === null || !lines.some((item) => item.id === boardLineId)) {
			boardLineId = pushBoard(state);
			return;
		}
		lines = lines.map((item) => (item.id === boardLineId ? { ...item, text } : item));
	}

	function pickApple(body: Point[], score: number): Point {
		return nextApple(body, score, SNAKE_WIDTH, SNAKE_HEIGHT);
	}

	function endSnake(message: string, kind: LineKind) {
		stopSnakeTimer();
		snake = null;
		steered = null;
		push(kind, message);
	}

	/** One frame of the game. */
	function tickSnake() {
		if (!snake) return;
		const direction = steerSnake(snake.direction, steered);
		steered = null;
		const move = moveSnake(
			{ ...snake, direction },
			direction,
			SNAKE_WIDTH,
			SNAKE_HEIGHT,
			pickApple
		);

		if (move.result === 'wall' || move.result === 'self') {
			endSnake(
				fill(tt('terminal.snake.over'), {
					reason: move.result === 'wall' ? tt('terminal.snake.wall') : tt('terminal.snake.self'),
					x: move.head[0],
					y: move.head[1]
				}),
				'error'
			);
			return;
		}

		snake = move.state;
		drawBoard(move.state);
		if (move.result === 'won') endSnake(tt('terminal.snake.won'), 'output');
	}

	function playSnake(raw: string): boolean {
		if (!snake) return false;
		const command = raw.trim().toLowerCase();
		if (command === 'stop' || command === 'quit') {
			endSnake(fill(tt('terminal.snake.stop'), { score: snake.score }), 'output');
			return true;
		}

		const direction = directionFrom(command);
		if (!direction) return false;
		steered = direction;
		return true;
	}

	/** Steer from the d-pad or the arrow keys: no history entry, no echoed line. */
	function steer(direction: SnakeDirection) {
		if (!snake) return;
		steered = direction;
	}

	function scan() {
		stopScan();
		scanRunning = true;
		const run = asyncRun;
		const steps = tt('terminal.scan.steps').split('|');
		steps.forEach((step, index) => {
			const timer = setTimeout(() => {
				if (run !== asyncRun) return;
				push('output', step);
				if (index === steps.length - 1) {
					scanRunning = false;
					timers = [];
				}
			}, index * SCAN_STEP_MS);
			timers = [...timers, timer];
		});
	}

	async function copyEmail() {
		if (await copyText(SITE.email)) {
			showToast(tt('toast.email'), { tone: 'success' });
			push('output', fill(tt('terminal.email.copied'), { email: SITE.email }));
			return;
		}
		showToast(tt('toast.copyfail'), { tone: 'error' });
		push('error', fill(tt('terminal.email.fallback'), { email: SITE.email }));
	}

	/**
	 * A neofetch-style system card: the mascot in ASCII beside real build facts.
	 * The revision, commit and date come from the build, so the card reports the
	 * site actually being served rather than a hardcoded blurb.
	 */
	function neofetch(): string {
		const art = ['    /\\_/\\  ', '   ( o.o ) ', '    > ^ <  ', '   /|   |\\ ', '  (_|   |_)'];
		const facts: [string, string][] = [
			[`${SITE.owner.toLowerCase()}@nexenne`, ''],
			['os', 'nexenne-web 1.0'],
			['host', 'static site · github pages'],
			['shell', 'browser tty0'],
			['role', SITE.role],
			['where', SITE.location],
			['rev', `${SITE.revision} · ${SITE.commit || 'local'}`],
			['built', SITE.updated || 'dev'],
			['stack', SITE.stack.slice(0, 6).join(' ')],
			['content', `${content.work.length} projects · ${content.blog.length} posts`]
		];
		const rows = facts.map(([key, value]) => (value ? `${key.padEnd(9)}${value}` : key));
		const height = Math.max(art.length, rows.length);
		return Array.from({ length: height }, (_, i) => {
			const left = (art[i] ?? '').padEnd(13);
			return `${left}${rows[i] ?? ''}`.trimEnd();
		}).join('\n');
	}

	/** Rebuild the visible session as plain text, prompts included. */
	function transcript(): string {
		return lines
			.map((item) => (item.kind === 'input' ? `${prompt} ${item.text}` : item.text))
			.join('\n');
	}

	async function copyTranscript() {
		const copied = await copyText(transcript());
		showToast(copied ? tt('terminal.transcript.copied') : tt('toast.copyfail'), {
			tone: copied ? 'success' : 'error'
		});
		focusInputForFinePointer();
	}

	function openPage(target: string): boolean {
		const path = resolveTarget(target);
		if (!path) return false;
		push('output', fill(tt('terminal.opening'), { target }));
		lgoto(path);
		return true;
	}

	function runRaw(raw: string) {
		const commandText = raw.trim();
		if (!commandText) return;
		// A steer is not a command: echoing it would fight the live board for space.
		if (snake && directionFrom(commandText)) {
			playSnake(commandText);
			return;
		}
		push('input', commandText);
		if (playSnake(commandText)) return;
		if (playGuess(commandText)) return;

		const parsed = parseCommand(commandText);
		if (parsed.error) {
			push('error', tt('terminal.error.quote'));
			return;
		}

		const [rawName = '', ...args] = parsed.args;
		const command = findCommand(rawName);
		if (!command) {
			push('error', fill(tt('terminal.error.command'), { command: commandText }));
			return;
		}

		switch (command.name) {
			case 'help':
				push('output', buildHelp(tt));
				break;
			case 'pwd':
				push('output', cwd ? `${WORKING_DIRECTORY}/${cwd}` : WORKING_DIRECTORY);
				break;
			case 'ls': {
				const listing = listPath(cwd, content, args[0]);
				if (listing === null) {
					push('error', fill(tt('terminal.cd.missing'), { dir: args[0] }));
				} else {
					push('output', listing || tt('terminal.ls.empty'));
				}
				break;
			}
			case 'cd': {
				const next = resolveDirectory(cwd, args[0]);
				if (next === null) {
					push('error', fill(tt('terminal.cd.missing'), { dir: args[0] }));
				} else {
					cwd = next;
				}
				break;
			}
			case 'find': {
				const term = args.join(' ').trim();
				if (!term) {
					push('error', tt('terminal.find.usage'));
					break;
				}
				const matches = searchEntries(term, content);
				if (!matches.length) {
					push('output', fill(tt('terminal.find.none'), { term }));
					break;
				}
				const width = Math.max(...matches.map((m) => m.entry.slug.length)) + 2;
				push(
					'output',
					matches.map((m) => `${m.dir}/${m.entry.slug.padEnd(width)}${m.entry.title}`).join('\n')
				);
				push('system', fill(tt('terminal.find.count'), { count: matches.length }));
				break;
			}
			case 'man': {
				const manual = args[0] ? buildManual(args[0], tt) : null;
				if (manual) push('output', manual);
				else push('error', fill(tt('terminal.man.missing'), { command: args[0] ?? '' }));
				break;
			}
			case 'neofetch':
				push('art', neofetch());
				break;
			case 'whoami':
				push('output', `${SITE.owner}\n${SITE.role}\n${SITE.focus}\n${SITE.location}`);
				break;
			case 'stack':
				push('output', SITE.stack.slice(0, STACK_LIMIT).join(' · '));
				break;
			case 'cat': {
				const file = args[0]?.toLowerCase();
				if (!file) {
					push('error', usageFor('cat', tt));
				} else if (file === 'about.txt') {
					push('output', `${SITE.owner}\n${SITE.role}\n${SITE.focus}`);
				} else if (file === 'contact.txt') {
					push('output', `${SITE.email}\n${SITE.location}\n${SITE_URL}`);
				} else if (file === 'stack.txt') {
					push('output', SITE.stack.slice(0, STACK_LIMIT).join('\n'));
				} else {
					const match = findEntry(file, content, cwd);
					if (match) {
						push(
							'output',
							`${match.entry.title}\n${match.entry.meta}\n\n${match.entry.summary}\n\n${entryPath(match)}`
						);
					} else {
						push('error', fill(tt('terminal.cat.missing'), { file }));
					}
				}
				break;
			}
			case 'open':
				if (!args[0]) {
					push('error', usageFor('open', tt));
				} else if (!openPage(args[0])) {
					const match = findEntry(args[0], content, cwd);
					if (match) {
						push('output', fill(tt('terminal.opening'), { target: match.entry.slug }));
						lgoto(entryPath(match));
					} else {
						push('error', fill(tt('terminal.open.missing'), { target: args[0] }));
					}
				}
				break;
			case 'email':
				void copyEmail();
				break;
			case 'date':
				push(
					'output',
					new Intl.DateTimeFormat(get(lang) === 'it' ? 'it-IT' : 'en-GB', {
						dateStyle: 'full',
						timeStyle: 'medium'
					}).format(new Date())
				);
				break;
			case 'uname':
				push('output', 'nexenne-web 1.0 static-site sveltekit');
				break;
			case 'echo':
				push('output', args.join(' '));
				break;
			case 'history':
				push(
					'output',
					history
						.slice()
						.reverse()
						.map((entry, index) => `${String(index + 1).padStart(3, ' ')}  ${entry}`)
						.join('\n') || tt('terminal.history.empty')
				);
				break;
			case 'scan':
				scan();
				break;
			case 'fortune': {
				const fortunes = tt('terminal.fortunes').split('|');
				push('output', fortunes[Math.floor(Math.random() * fortunes.length)]);
				break;
			}
			case 'matrix':
				matrixMode = !matrixMode;
				push('output', matrixMode ? tt('terminal.matrix.on') : tt('terminal.matrix.off'));
				break;
			case 'theme':
				cycleTheme();
				push('output', tt('terminal.theme.changed'));
				break;
			case 'lang':
				push('output', tt('terminal.lang.changed'));
				switchLanguage();
				break;
			case 'guess':
				startGuess();
				if (args[0]) playGuess(args[0]);
				break;
			case 'snake':
				startSnake();
				break;
			case 'clear':
				clearScreen();
				break;
			case 'reset':
				resetTerminal();
				break;
			case 'coffee':
				push('output', tt('terminal.easter.coffee'));
				break;
			case 'sudo':
				push('error', tt('terminal.easter.sudo'));
				break;
			case 'rm':
				if (args.join(' ') === '-rf /') {
					push('output', tt('terminal.easter.rm'));
				} else {
					push('error', fill(tt('terminal.error.command'), { command: commandText }));
				}
				break;
			case 'xyzzy':
				push('art', tt('terminal.easter.xyzzy'));
				break;
			case 'opengl':
				push('output', tt('terminal.easter.opengl'));
				break;
		}
	}

	function submit() {
		const command = input.trim();
		input = '';
		if (!command) return;
		if (!(snake && directionFrom(command))) {
			history = [command, ...history.filter((entry) => entry !== command)].slice(0, HISTORY_LIMIT);
			historyIndex = -1;
		}
		runRaw(command);
	}

	function runShortcut(command: string) {
		input = command;
		submit();
		void tick().then(focusInputForFinePointer);
	}

	function completeInput() {
		const completion = completeTerminalInput(input);
		input = completion.value;
		if (completion.candidates.length > 1) push('output', completion.candidates.join('  '));
		void tick().then(focusInput);
	}

	function recallHistory(step: number) {
		if (!history.length) return;
		const next = Math.min(Math.max(historyIndex + step, -1), history.length - 1);
		historyIndex = next;
		input = next >= 0 ? history[next] : '';
	}

	function onInputKeydown(event: KeyboardEvent) {
		if (event.ctrlKey && event.key.toLowerCase() === 'l') {
			event.preventDefault();
			clearScreen();
			return;
		}

		// Only hijack Ctrl+C as "cancel" when there is nothing selected to copy,
		// so the browser's own copy still works inside the prompt.
		if (event.ctrlKey && event.key.toLowerCase() === 'c') {
			const hasSelection = inputEl && inputEl.selectionStart !== inputEl.selectionEnd;
			if (hasSelection) return;
			event.preventDefault();
			cancelActivity();
			input = '';
			return;
		}

		// While a game runs the arrow keys steer it; otherwise they walk history.
		if (snake && ARROW_KEYS[event.key]) {
			event.preventDefault();
			steer(ARROW_KEYS[event.key]);
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			recallHistory(1);
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			recallHistory(-1);
		} else if (event.key === 'Tab') {
			event.preventDefault();
			completeInput();
		}
	}

	/**
	 * Steer from wherever the focus happens to be.
	 *
	 * The prompt's own handler only sees keys typed into it, so after clicking the
	 * d-pad or a quick command the arrows went to the page and scrolled it instead
	 * of turning the snake. A running game owns the arrow keys.
	 *
	 * Letters are only taken when the prompt is not focused, otherwise typing
	 * `stop` would steer on the s and never reach the input.
	 */
	function onWindowKeydown(event: KeyboardEvent) {
		if (!snake || event.ctrlKey || event.metaKey || event.altKey) return;
		// Events from the prompt are already handled there; don't steer twice.
		if (event.target === inputEl) return;

		const direction = ARROW_KEYS[event.key] ?? directionFrom(event.key);
		if (!direction) return;
		event.preventDefault();
		steer(direction);
	}

	/** The d-pad steers and hands the prompt back, so `stop` stays one word away. */
	function steerFromPad(direction: SnakeDirection) {
		steer(direction);
		void tick().then(focusInputForFinePointer);
	}

	/**
	 * Clicking dead space in the shell focuses the prompt, the way a real terminal
	 * does. This is attached imperatively and stays out of the accessibility tree
	 * on purpose: it is pure pointer convenience, and every control in the shell
	 * is already reachable with Tab. Clicks on controls, and clicks that finish a
	 * text selection, are left alone.
	 */
	function clickToFocus(node: HTMLElement) {
		function onMouseUp(event: MouseEvent) {
			const target = event.target as HTMLElement | null;
			if (target?.closest('button, a, input, textarea')) return;
			if (window.getSelection()?.toString()) return;
			focusInput();
		}

		node.addEventListener('mouseup', onMouseUp);
		return { destroy: () => node.removeEventListener('mouseup', onMouseUp) };
	}

	onMount(() => {
		resetTerminal();
		void tick().then(focusInputForFinePointer);
	});

	onDestroy(stopTimers);
</script>

<svelte:window on:keydown={onWindowKeydown} />

<div class="page-anim">
	<header class="page-title terminal-title">
		<div><span class="meta">{$t('terminal.meta')}</span></div>
		<div>
			<h1 class="display">{$t('terminal.title')}</h1>
			<p class="lede terminal-lede">{$t('terminal.lede')}</p>
		</div>
	</header>

	<section class="section terminal-section">
		<div class="terminal-grid">
			<div
				class="terminal-shell"
				class:is-matrix={matrixMode}
				role="region"
				aria-label={$t('terminal.shell.label')}
				use:clickToFocus
			>
				<MatrixRain active={matrixMode} />

				<div class="terminal-bar">
					<span class="terminal-session">nexenne://terminal</span>
					<div class="terminal-bar-actions">
						<button
							type="button"
							on:click|stopPropagation={() => void copyTranscript()}
							aria-label={$t('terminal.action.copy')}
							title={$t('terminal.action.copy')}>⧉</button
						>
						<button
							type="button"
							on:click|stopPropagation={resetTerminal}
							aria-label={$t('terminal.action.reset')}
							title={$t('terminal.action.reset')}>↻</button
						>
					</div>
				</div>

				<div bind:this={logEl} class="terminal-log" role="log" aria-live="polite">
					{#each lines as item (item.id)}
						{#if item.kind === 'input'}
							<pre class="terminal-line is-in"><span class="terminal-line-prompt">{prompt}</span
								>{item.text}</pre>
						{:else}
							<pre
								class="terminal-line"
								data-kind={item.kind}
								aria-hidden={item.kind === 'art' ? 'true' : undefined}>{item.text}</pre>
						{/if}
					{/each}
				</div>

				<form class="terminal-form" on:submit|preventDefault={submit}>
					<label class="sr-only" for="terminal-input">{$t('terminal.input')}</label>
					<span class="terminal-prompt" aria-hidden="true">
						<span class="terminal-prompt-full">{prompt}</span>
						<span class="terminal-prompt-short">{SHORT_PROMPT}</span>
					</span>
					<input
						id="terminal-input"
						bind:this={inputEl}
						bind:value={input}
						on:keydown={onInputKeydown}
						autocomplete="off"
						autocapitalize="none"
						enterkeyhint="send"
						spellcheck="false"
						placeholder="help"
					/>
					<button
						class="terminal-submit"
						type="submit"
						aria-label={$t('terminal.action.run')}
						title={$t('terminal.action.run')}>↵</button
					>
				</form>

				<div class="terminal-statusbar">
					<span class="terminal-status" class:is-live={busy} role="status">
						<span class="terminal-status-dot" aria-hidden="true"></span>{statusText}
					</span>
					<span class="terminal-status-meta">
						{lines.length}
						{$t('terminal.lines')} · Ctrl+L {$t('terminal.key.clear')} · Ctrl+C
						{$t('terminal.key.cancel')}
					</span>
				</div>
			</div>

			<aside class="terminal-side">
				{#if snake}
					<div class="terminal-box terminal-controller">
						<div class="terminal-box-head">
							<h3>{$t('terminal.controller')}</h3>
							<span>{fill($t('terminal.snake.score'), { score: snake.score })}</span>
						</div>
						<div class="terminal-dpad">
							<button
								type="button"
								class="is-up"
								on:click={() => steerFromPad('up')}
								aria-label={$t('terminal.direction.up')}>↑</button
							>
							<button
								type="button"
								class="is-left"
								on:click={() => steerFromPad('left')}
								aria-label={$t('terminal.direction.left')}>←</button
							>
							<button
								type="button"
								class="is-down"
								on:click={() => steerFromPad('down')}
								aria-label={$t('terminal.direction.down')}>↓</button
							>
							<button
								type="button"
								class="is-right"
								on:click={() => steerFromPad('right')}
								aria-label={$t('terminal.direction.right')}>→</button
							>
						</div>
						<button class="btn btn--sm" type="button" on:click={() => runShortcut('stop')}
							>{$t('terminal.controller.stop')}</button
						>
					</div>
				{/if}

				<div class="terminal-box">
					<div class="terminal-box-head">
						<h3>{$t('terminal.commands')}</h3>
						<span>{$t('terminal.commands.hint')}</span>
					</div>
					<ul class="terminal-shortcuts">
						{#each quickCommands as command (command.name)}
							<li>
								<button type="button" on:click={() => runShortcut(command.name)} data-hover>
									<span class="terminal-shortcut-name"
										>{command.name}{#if command.arg}&nbsp;{command.arg}{/if}</span
									>
									<span class="terminal-shortcut-desc">{$t(command.descriptionKey)}</span>
								</button>
							</li>
						{/each}
					</ul>
				</div>

				<div class="terminal-box">
					<div class="terminal-box-head">
						<h3>{$t('terminal.notes')}</h3>
					</div>
					<p class="terminal-note">{$t('terminal.notes.body')}</p>
					<ul class="terminal-keys">
						<li><kbd>↑ ↓</kbd> <span>{$t('terminal.key.history')}</span></li>
						<li><kbd>Tab</kbd> <span>{$t('terminal.key.complete')}</span></li>
						<li><kbd>Ctrl+L</kbd> <span>{$t('terminal.key.clear')}</span></li>
						<li><kbd>Ctrl+C</kbd> <span>{$t('terminal.key.cancel')}</span></li>
					</ul>
				</div>
			</aside>
		</div>
	</section>
</div>
