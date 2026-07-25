/**
 * Pure logic behind the /terminal route: the command registry, a small shell
 * word splitter, tab completion, the generated help text, and the snake board.
 *
 * The registry below is the single source of truth. Completion, `help`, `ls`,
 * the usage lines, and `open` all read from it, so a new command means one entry
 * here plus its description key in src/lib/i18n.ts. The page component owns
 * rendering and side effects, which keeps everything here testable without a DOM.
 */

export interface VisibleCommand {
	name: string;
	/** i18n key for the one-line description printed by `help`. */
	descriptionKey: string;
	/** Shell-syntax argument placeholder shown in `help`, for example "<file>". */
	arg?: string;
	/** Values tab completion offers for the first argument. */
	completions?: readonly string[];
	hidden?: false;
}

/** Easter eggs: they run, but stay out of `help` and tab completion. */
export interface HiddenCommand {
	name: string;
	hidden: true;
	completions?: readonly string[];
}

export type TerminalCommandSpec = VisibleCommand | HiddenCommand;

/** A page `open` can navigate to. Paths are unprefixed; lgoto adds language. */
export interface TerminalTarget {
	name: string;
	path: string;
}

export interface ParsedCommand {
	args: string[];
	error: 'unterminated-quote' | null;
}

export interface Completion {
	value: string;
	candidates: string[];
}

export type Point = [number, number];
export type SnakeDirection = 'up' | 'down' | 'left' | 'right';

export interface SnakeState {
	body: Point[];
	apple: Point;
	score: number;
	/** The way the snake is travelling right now. */
	direction: SnakeDirection;
}

export interface SnakeMove {
	state: SnakeState;
	result: 'moved' | 'ate' | 'wall' | 'self' | 'won';
	head: Point;
}

/** Files `ls` prints and `cat` can read. */
export const VIRTUAL_FILES = ['about.txt', 'contact.txt', 'stack.txt'] as const;

/** Directory-looking `ls` entries. They are hints for `open`, not real paths. */
export const VIRTUAL_DIRS = ['work/', 'blog/', 'brand/'] as const;

export const WORKING_DIRECTORY = '/home/guest';

/**
 * Every page `open` reaches. The compatibility /card/ route is left out because
 * it is noindex and absent from navigation, and /404/ is left out because
 * nothing on the site may link to it.
 */
export const OPEN_TARGETS: readonly TerminalTarget[] = [
	{ name: 'home', path: '/' },
	{ name: 'work', path: '/work/' },
	{ name: 'blog', path: '/blog/' },
	{ name: 'services', path: '/services/' },
	{ name: 'about', path: '/about/' },
	{ name: 'resume', path: '/resume/' },
	{ name: 'now', path: '/now/' },
	{ name: 'uses', path: '/uses/' },
	{ name: 'contact', path: '/contact/' },
	{ name: 'brand', path: '/brand/' },
	{ name: 'colophon', path: '/colophon/' }
];

export const OPEN_TARGET_NAMES = OPEN_TARGETS.map((target) => target.name);

/** Convenience spellings that resolve to a canonical target. */
const TARGET_ALIASES: Record<string, string> = {
	projects: 'work',
	posts: 'blog',
	cv: 'resume',
	index: 'home'
};

/** Alternate spellings for command names, resolved before dispatch. */
const COMMAND_ALIASES: Record<string, string> = {
	'?': 'help',
	man: 'help',
	cls: 'clear'
};

export const TERMINAL_COMMANDS: readonly TerminalCommandSpec[] = [
	{ name: 'help', descriptionKey: 'terminal.cmd.help' },
	{ name: 'ls', descriptionKey: 'terminal.cmd.ls' },
	{ name: 'pwd', descriptionKey: 'terminal.cmd.pwd' },
	{ name: 'whoami', descriptionKey: 'terminal.cmd.whoami' },
	{
		name: 'cat',
		descriptionKey: 'terminal.cmd.cat',
		arg: '<file>',
		completions: VIRTUAL_FILES
	},
	{
		name: 'open',
		descriptionKey: 'terminal.cmd.open',
		arg: '<page>',
		completions: OPEN_TARGET_NAMES
	},
	{ name: 'stack', descriptionKey: 'terminal.cmd.stack' },
	{ name: 'email', descriptionKey: 'terminal.cmd.email' },
	{ name: 'date', descriptionKey: 'terminal.cmd.date' },
	{ name: 'uname', descriptionKey: 'terminal.cmd.uname' },
	{ name: 'echo', descriptionKey: 'terminal.cmd.echo', arg: '<text>' },
	{ name: 'history', descriptionKey: 'terminal.cmd.history' },
	{ name: 'scan', descriptionKey: 'terminal.cmd.scan' },
	{ name: 'fortune', descriptionKey: 'terminal.cmd.fortune' },
	{ name: 'matrix', descriptionKey: 'terminal.cmd.matrix' },
	{ name: 'theme', descriptionKey: 'terminal.cmd.theme' },
	{ name: 'lang', descriptionKey: 'terminal.cmd.lang' },
	{ name: 'guess', descriptionKey: 'terminal.cmd.guess' },
	{ name: 'snake', descriptionKey: 'terminal.cmd.snake' },
	{ name: 'clear', descriptionKey: 'terminal.cmd.clear' },
	{ name: 'reset', descriptionKey: 'terminal.cmd.reset' },
	{ name: 'coffee', hidden: true },
	{ name: 'sudo', hidden: true },
	{ name: 'rm', hidden: true },
	{ name: 'xyzzy', hidden: true },
	{ name: 'opengl', hidden: true }
];

/** Commands offered by `help` and tab completion, in registry order. */
export const VISIBLE_COMMANDS = TERMINAL_COMMANDS.filter(
	(command): command is VisibleCommand => !command.hidden
);

const BY_NAME = new Map(TERMINAL_COMMANDS.map((command) => [command.name, command]));

/**
 * Resolve a typed command word to its registry entry, following aliases.
 *
 * @param name The first word of the command line, in any case.
 * @return The matching spec, or null when the command does not exist.
 */
export function findCommand(name: string): TerminalCommandSpec | null {
	const typed = name.trim().toLowerCase();
	return BY_NAME.get(COMMAND_ALIASES[typed] ?? typed) ?? null;
}

/**
 * Resolve an `open` argument to an app-absolute path, following aliases.
 *
 * @param name The target name typed by the visitor, in any case.
 * @return The unprefixed path, or null when the target is unknown.
 */
export function resolveTarget(name: string): string | null {
	const typed = name.trim().toLowerCase();
	const canonical = TARGET_ALIASES[typed] ?? typed;
	return OPEN_TARGETS.find((target) => target.name === canonical)?.path ?? null;
}

/**
 * Split a shell-like command line while preserving spaces inside single or
 * double quotes. This intentionally supports only the small grammar the fake
 * terminal needs: words, quotes, and backslash escaping.
 */
export function parseCommand(input: string): ParsedCommand {
	const args: string[] = [];
	let token = '';
	let quote: "'" | '"' | null = null;
	let escaped = false;
	let tokenStarted = false;

	for (const char of input.trim()) {
		if (escaped) {
			token += char;
			tokenStarted = true;
			escaped = false;
			continue;
		}

		if (char === '\\') {
			escaped = true;
			tokenStarted = true;
			continue;
		}

		if (quote) {
			if (char === quote) {
				quote = null;
			} else {
				token += char;
			}
			tokenStarted = true;
			continue;
		}

		if (char === "'" || char === '"') {
			quote = char;
			tokenStarted = true;
			continue;
		}

		if (/\s/.test(char)) {
			if (tokenStarted) {
				args.push(token);
				token = '';
				tokenStarted = false;
			}
			continue;
		}

		token += char;
		tokenStarted = true;
	}

	if (escaped) token += '\\';
	if (tokenStarted) args.push(token);

	return { args, error: quote ? 'unterminated-quote' : null };
}

function commonPrefix(values: string[]): string {
	if (!values.length) return '';
	let prefix = values[0];
	for (const value of values.slice(1)) {
		while (prefix && !value.startsWith(prefix)) prefix = prefix.slice(0, -1);
	}
	return prefix;
}

/**
 * Complete the command name, or the first argument of a command that declares
 * completions. The candidates are returned too, so the page can print them when
 * the completion is ambiguous. Hidden commands never complete.
 */
export function completeTerminalInput(input: string): Completion {
	const leading = input.match(/^\s*/)?.[0] ?? '';
	const trimmed = input.trimStart();
	const firstSpace = trimmed.search(/\s/);

	if (firstSpace === -1) {
		const part = trimmed.toLowerCase();
		const candidates = VISIBLE_COMMANDS.map((command) => command.name).filter((name) =>
			name.startsWith(part)
		);
		if (!candidates.length) return { value: input, candidates: [] };
		const suffix = candidates.length === 1 ? ' ' : '';
		return { value: `${leading}${commonPrefix(candidates)}${suffix}`, candidates };
	}

	const name = trimmed.slice(0, firstSpace).toLowerCase();
	const rest = trimmed.slice(firstSpace).trimStart();
	const options = findCommand(name)?.completions ?? [];
	const candidates = options.filter((option) => option.startsWith(rest.toLowerCase()));
	if (!candidates.length) return { value: input, candidates: [] };
	const suffix = candidates.length === 1 ? ' ' : '';
	return {
		value: `${leading}${name} ${commonPrefix([...candidates])}${suffix}`,
		candidates: [...candidates]
	};
}

/**
 * Render the `help` output from the registry, so the command index can never
 * drift from the commands the page actually dispatches.
 *
 * @param translate Lookup for i18n keys, normally get(t) from src/lib/i18n.ts.
 * @return The full multi-line help text.
 */
export function buildHelp(translate: (key: string) => string): string {
	const signatures = VISIBLE_COMMANDS.map((command) =>
		command.arg ? `${command.name} ${command.arg}` : command.name
	);
	const width = Math.max(...signatures.map((signature) => signature.length)) + 2;
	const rows = VISIBLE_COMMANDS.map(
		(command, index) => `  ${signatures[index].padEnd(width)}${translate(command.descriptionKey)}`
	);

	return [
		translate('terminal.help.header'),
		...rows,
		'',
		`${translate('terminal.help.pages')} ${OPEN_TARGET_NAMES.join(', ')}`,
		`${translate('terminal.help.files')} ${VIRTUAL_FILES.join(', ')}`
	].join('\n');
}

/** The `ls` listing: virtual files first, then the navigable directories. */
export function listDirectory(): string {
	return [...VIRTUAL_FILES, ...VIRTUAL_DIRS].join('  ');
}

/**
 * Build a `usage:` line for a command from its declared completions, so the
 * hint always matches what completion and dispatch accept.
 *
 * @param name      Registry command name.
 * @param translate Lookup for i18n keys.
 * @return A usage line, for example "usage: cat about.txt | contact.txt".
 */
export function usageFor(name: string, translate: (key: string) => string): string {
	const command = findCommand(name);
	const options = command?.completions ?? [];
	return `${translate('terminal.usage')} ${name} ${options.join(' | ')}`;
}

export const SNAKE_WIDTH = 12;
export const SNAKE_HEIGHT = 8;

/** How long a cell stays put before the snake advances, in milliseconds. */
export const SNAKE_TICK_MS = 190;

/** The board every new game starts from, kept out of the component for tests. */
export function newSnake(): SnakeState {
	return {
		body: [
			[4, 3],
			[3, 3],
			[2, 3]
		],
		apple: [9, 5],
		score: 0,
		direction: 'right'
	};
}

const DELTAS: Record<SnakeDirection, Point> = {
	up: [0, -1],
	down: [0, 1],
	left: [-1, 0],
	right: [1, 0]
};

const OPPOSITE: Record<SnakeDirection, SnakeDirection> = {
	up: 'down',
	down: 'up',
	left: 'right',
	right: 'left'
};

/**
 * Decide which way the snake actually turns.
 *
 * Steering straight back into its own neck is not a move a snake game makes: it
 * would end the game on the player's first press of the opposite arrow. Every
 * implementation ignores the reversal and carries on, so this does too.
 *
 * @param current The direction the snake is travelling.
 * @param wanted  The direction the player asked for, if any.
 * @return The direction to travel on the next tick.
 */
export function steerSnake(current: SnakeDirection, wanted: SnakeDirection | null): SnakeDirection {
	if (!wanted || wanted === OPPOSITE[current]) return current;
	return wanted;
}

/** Typed direction words and the WASD keys that mean the same move. */
const DIRECTION_WORDS: Record<string, SnakeDirection> = {
	w: 'up',
	up: 'up',
	a: 'left',
	left: 'left',
	s: 'down',
	down: 'down',
	d: 'right',
	right: 'right'
};

/**
 * Read a snake direction from typed input.
 *
 * @param input A command line such as "w", "left", or something unrelated.
 * @return The direction, or null when the input is not a move.
 */
export function directionFrom(input: string): SnakeDirection | null {
	return DIRECTION_WORDS[input.trim().toLowerCase()] ?? null;
}

/**
 * Pick the next apple cell deterministically, so a game replays identically and
 * the board never needs a random source.
 *
 * @param body   The snake body after the move that ate the previous apple.
 * @param score  The score after eating, which varies the search start.
 * @param width  Board width in cells.
 * @param height Board height in cells.
 * @return The first free cell found, or [0, 0] on a full board.
 */
export function nextApple(body: Point[], score: number, width: number, height: number): Point {
	for (let index = 0; index < width * height; index += 1) {
		const x = (score * 3 + index * 5 + 2) % width;
		const y = (score * 2 + index * 7 + 1) % height;
		if (!body.some(([sx, sy]) => sx === x && sy === y)) return [x, y];
	}
	return [0, 0];
}

/**
 * Advance the deterministic snake game by one cell. Moving into the previous
 * tail cell is valid when no apple is eaten because that cell moves away in
 * the same turn.
 */
export function moveSnake(
	state: SnakeState,
	direction: SnakeDirection,
	width: number,
	height: number,
	pickApple: (body: Point[], score: number) => Point
): SnakeMove {
	const [dx, dy] = DELTAS[direction];
	const [x, y] = state.body[0];
	const head: Point = [x + dx, y + dy];
	const hitWall = head[0] < 0 || head[0] >= width || head[1] < 0 || head[1] >= height;

	if (hitWall) return { state, result: 'wall', head };

	const ate = head[0] === state.apple[0] && head[1] === state.apple[1];
	const collisionBody = ate ? state.body : state.body.slice(0, -1);
	const hitSelf = collisionBody.some(([sx, sy]) => sx === head[0] && sy === head[1]);
	if (hitSelf) return { state, result: 'self', head };

	const body = [head, ...state.body] satisfies Point[];
	if (!ate) body.pop();
	const score = state.score + (ate ? 1 : 0);
	const won = ate && body.length === width * height;
	const apple = ate && !won ? pickApple(body, score) : state.apple;

	return {
		state: { body, apple, score, direction },
		result: won ? 'won' : ate ? 'ate' : 'moved',
		head
	};
}

/**
 * Draw the snake board as monospace ASCII art.
 *
 * @param state  Current game state.
 * @param width  Board width in cells.
 * @param height Board height in cells.
 * @return The framed board, without the score line the page adds above it.
 */
export function renderSnakeBoard(state: SnakeState, width: number, height: number): string {
	const [headX, headY] = state.body[0];
	const rows: string[] = [];

	for (let y = 0; y < height; y += 1) {
		let row = '';
		for (let x = 0; x < width; x += 1) {
			const isHead = headX === x && headY === y;
			const isBody = state.body.some(([sx, sy], index) => index > 0 && sx === x && sy === y);
			const isApple = state.apple[0] === x && state.apple[1] === y;
			row += isHead ? '@' : isBody ? 'o' : isApple ? '*' : '·';
		}
		rows.push(`│${row}│`);
	}

	return [`┌${'─'.repeat(width)}┐`, ...rows, `└${'─'.repeat(width)}┘`].join('\n');
}
