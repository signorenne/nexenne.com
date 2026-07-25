import { describe, expect, it } from 'vitest';
import { DICT } from './i18n';
import {
	OPEN_TARGETS,
	SNAKE_HEIGHT,
	SNAKE_WIDTH,
	TERMINAL_COMMANDS,
	VIRTUAL_FILES,
	VISIBLE_COMMANDS,
	buildHelp,
	completeTerminalInput,
	directionFrom,
	findCommand,
	listDirectory,
	moveSnake,
	newSnake,
	nextApple,
	parseCommand,
	renderSnakeBoard,
	resolveTarget,
	steerSnake,
	usageFor,
	type SnakeState
} from './terminal';

const translate = (key: string) => DICT.en[key] ?? key;

describe('command registry', () => {
	it('describes every visible command in both languages', () => {
		const missing = VISIBLE_COMMANDS.flatMap((command) =>
			(['en', 'it'] as const)
				.filter((lang) => !DICT[lang][command.descriptionKey])
				.map((lang) => `${lang}:${command.descriptionKey}`)
		);
		expect(missing).toEqual([]);
	});

	it('has no duplicate command names', () => {
		const names = TERMINAL_COMMANDS.map((command) => command.name);
		expect(names).toEqual([...new Set(names)]);
	});

	it('resolves aliases but keeps hidden commands out of completion', () => {
		expect(findCommand('?')?.name).toBe('help');
		expect(findCommand('CLS')?.name).toBe('clear');
		expect(findCommand('xyzzy')?.name).toBe('xyzzy');
		expect(completeTerminalInput('xyz')).toEqual({ value: 'xyz', candidates: [] });
	});
});

describe('open targets', () => {
	it('resolves canonical names and aliases to app paths', () => {
		expect(resolveTarget('work')).toBe('/work/');
		expect(resolveTarget('PROJECTS')).toBe('/work/');
		expect(resolveTarget('cv')).toBe('/resume/');
		expect(resolveTarget('nowhere')).toBeNull();
	});

	// Nothing on the site may link to /404/, and /card/ is a noindex
	// compatibility route that is deliberately absent from navigation.
	it('never exposes the 404 or card routes', () => {
		const paths = OPEN_TARGETS.map((target) => target.path);
		expect(paths).not.toContain('/404/');
		expect(paths).not.toContain('/card/');
	});

	it('offers every target as an argument completion for open', () => {
		expect(findCommand('open')?.completions).toEqual(OPEN_TARGETS.map((t) => t.name));
	});
});

describe('parseCommand', () => {
	it('keeps quoted and escaped arguments together', () => {
		expect(parseCommand('echo "hello terminal" one\\ two')).toEqual({
			args: ['echo', 'hello terminal', 'one two'],
			error: null
		});
	});

	it('reports an unterminated quote without dropping the current argument', () => {
		expect(parseCommand("echo 'unfinished")).toEqual({
			args: ['echo', 'unfinished'],
			error: 'unterminated-quote'
		});
	});
});

describe('completeTerminalInput', () => {
	it('completes command and argument names', () => {
		expect(completeTerminalInput('whoz')).toEqual({ value: 'whoz', candidates: [] });
		expect(completeTerminalInput('who')).toEqual({ value: 'whoami ', candidates: ['whoami'] });
		expect(completeTerminalInput('cat con')).toEqual({
			value: 'cat contact.txt ',
			candidates: ['contact.txt']
		});
		expect(completeTerminalInput('open res')).toEqual({
			value: 'open resume ',
			candidates: ['resume']
		});
	});

	it('returns ambiguous candidates with their shared prefix', () => {
		expect(completeTerminalInput('c')).toEqual({ value: 'c', candidates: ['cat', 'clear'] });
		expect(completeTerminalInput('s')).toEqual({
			value: 's',
			candidates: ['stack', 'scan', 'snake']
		});
	});
});

describe('buildHelp', () => {
	const help = buildHelp(translate);

	it('lists every visible command and no hidden one', () => {
		for (const command of VISIBLE_COMMANDS) {
			expect(help).toContain(`  ${command.name}`);
			expect(help).toContain(translate(command.descriptionKey));
		}
		expect(help).not.toContain('xyzzy');
		expect(help).not.toContain('sudo');
	});

	it('lists the same pages and files the rest of the module accepts', () => {
		for (const target of OPEN_TARGETS) expect(help).toContain(target.name);
		for (const file of VIRTUAL_FILES) {
			expect(help).toContain(file);
			expect(listDirectory()).toContain(file);
		}
	});

	it('renders in Italian when given the Italian dictionary', () => {
		const italian = buildHelp((key) => DICT.it[key] ?? key);
		expect(italian).toContain(DICT.it['terminal.help.header']);
		expect(italian).toContain(DICT.it['terminal.cmd.ls']);
	});
});

describe('usageFor', () => {
	it('builds usage lines from the declared completions', () => {
		expect(usageFor('cat', translate)).toBe('usage: cat about.txt | contact.txt | stack.txt');
		expect(usageFor('open', translate)).toContain('usage: open home | work |');
	});
});

describe('directionFrom', () => {
	it('accepts WASD keys and direction words, and nothing else', () => {
		expect(directionFrom('w')).toBe('up');
		expect(directionFrom(' LEFT ')).toBe('left');
		expect(directionFrom('stop')).toBeNull();
	});
});

describe('moveSnake', () => {
	const pickApple = () => [0, 0] as [number, number];

	it('allows the head to move into the tail cell when the tail moves away', () => {
		const state: SnakeState = {
			body: [
				[1, 1],
				[1, 2],
				[2, 2],
				[2, 1]
			],
			apple: [4, 4],
			score: 0,
			direction: 'right'
		};

		const move = moveSnake(state, 'right', 5, 5, pickApple);
		expect(move.result).toBe('moved');
		expect(move.state.body[0]).toEqual([2, 1]);
	});

	it('keeps the previous state when a wall is hit', () => {
		const state: SnakeState = { body: [[0, 0]], apple: [2, 2], score: 0, direction: 'left' };
		const move = moveSnake(state, 'left', 3, 3, pickApple);
		expect(move.result).toBe('wall');
		expect(move.state).toBe(state);
	});

	it('grows and rescores when the apple is eaten', () => {
		const state: SnakeState = { body: [[0, 0]], apple: [1, 0], score: 3, direction: 'right' };
		const move = moveSnake(state, 'right', 4, 4, () => [3, 3]);
		expect(move.result).toBe('ate');
		expect(move.state.score).toBe(4);
		expect(move.state.body).toHaveLength(2);
		expect(move.state.apple).toEqual([3, 3]);
	});
});

describe('nextApple', () => {
	it('never lands on the snake body', () => {
		const body = newSnake().body;
		for (let score = 0; score < 20; score += 1) {
			const apple = nextApple(body, score, SNAKE_WIDTH, SNAKE_HEIGHT);
			expect(body.some(([x, y]) => x === apple[0] && y === apple[1])).toBe(false);
			expect(apple[0]).toBeGreaterThanOrEqual(0);
			expect(apple[0]).toBeLessThan(SNAKE_WIDTH);
			expect(apple[1]).toBeGreaterThanOrEqual(0);
			expect(apple[1]).toBeLessThan(SNAKE_HEIGHT);
		}
	});
});

describe('renderSnakeBoard', () => {
	it('draws a framed board with the head, body and apple', () => {
		const rows = renderSnakeBoard(newSnake(), SNAKE_WIDTH, SNAKE_HEIGHT).split('\n');
		expect(rows).toHaveLength(SNAKE_HEIGHT + 2);
		expect(rows[0]).toBe(`┌${'─'.repeat(SNAKE_WIDTH)}┐`);
		expect(rows.at(-1)).toBe(`└${'─'.repeat(SNAKE_WIDTH)}┘`);
		// Row 3 holds the snake (head at x=4, body at x=3 and x=2).
		expect(rows[4]).toBe('│··oo@·······│');
		// Row 5 holds the apple at x=9.
		expect(rows[6]).toBe('│·········*··│');
	});
});

describe('steerSnake', () => {
	// Without this the first press of the opposite arrow would drive the head into
	// the snake's own neck and end the game, which no snake game does.
	it('ignores a reversal into its own neck', () => {
		expect(steerSnake('right', 'left')).toBe('right');
		expect(steerSnake('up', 'down')).toBe('up');
	});

	it('turns for any other direction, and holds course with no input', () => {
		expect(steerSnake('right', 'up')).toBe('up');
		expect(steerSnake('right', 'right')).toBe('right');
		expect(steerSnake('right', null)).toBe('right');
	});

	it('lets a new game turn away from its starting direction', () => {
		const start = newSnake();
		expect(start.direction).toBe('right');
		expect(steerSnake(start.direction, 'up')).toBe('up');
		expect(steerSnake(start.direction, 'down')).toBe('down');
		// The reversal that used to kill the game instantly is now a no-op.
		expect(steerSnake(start.direction, 'left')).toBe('right');
	});
});

describe('moveSnake direction', () => {
	it('records the direction it travelled, so the next tick can hold course', () => {
		const move = moveSnake(newSnake(), 'down', SNAKE_WIDTH, SNAKE_HEIGHT, (b, sc) =>
			nextApple(b, sc, SNAKE_WIDTH, SNAKE_HEIGHT)
		);
		expect(move.state.direction).toBe('down');
	});
});
