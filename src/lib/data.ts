export interface SocialLink {
	label: string;
	href: string;
	handle: string;
}

export interface LangLevel {
	label: string;
	level: string;
	bar: number;
}

export const SITE_URL = 'https://nexenne.com';
export const DEFAULT_OG_IMAGE = '/og-default.png';

export const SITE = {
	name: 'Nicolò Plebani',
	short: 'NP',
	owner: 'Nicolò',
	revision: __APP_VERSION__,
	commit: __GIT_COMMIT_HASH__,
	// Date of the last commit (build-time), so it always reflects the real update.
	updated: __GIT_COMMIT_DATE__,
	role: 'Software Architect',
	focus: 'Embedded · HMI · Libraries · Integrations',
	tagline:
		'Embedded software, HMI, custom native and web applications, software libraries and system integrations.',
	blurb:
		'I design custom software that connects devices, interfaces and business processes: embedded firmware, HMI, native and web applications, reusable libraries and system integrations.',
	quote: 'Una cosa deve essere fatta bene, altrimenti è meglio non farla.',
	quoteEn: 'Do a thing well, or do not do it at all.',
	location: 'Bergamo, Italy · remote',
	email: 'nicolo@nexenne.com',
	phone: '+39 346 311 6428',
	born: '1999',
	socials: [
		{ label: 'GitHub', href: 'https://github.com/signorenne', handle: '@signorenne' },
		{ label: 'Website', href: 'https://nexenne.com', handle: 'nexenne.com' },
		{ label: 'Email', href: 'mailto:nicolo@nexenne.com', handle: 'nicolo@nexenne.com' },
		{ label: 'Phone', href: 'tel:+393463116428', handle: '+39 346 311 6428' }
	] satisfies SocialLink[],
	stack: [
		'C',
		'C++',
		'Qt',
		'QML',
		'LVGL',
		'Kotlin',
		'Jetpack Compose',
		'SvelteKit',
		'TypeScript',
		'Java',
		'Python',
		'Bash',
		'ESP32',
		'ESP-IDF',
		'FreeRTOS',
		'NimBLE',
		'BLE',
		'CAN',
		'GPIO',
		'UART · I²C · SPI',
		'TCP/IP',
		'MQTT',
		'GDB',
		'CMake',
		'Conan',
		'Doctest',
		'Gradle',
		'SDL',
		'MySQL'
	],
	platforms: ['ESP32 · ESP-IDF', 'FreeRTOS', 'PlatformIO', 'GNU/Linux', 'Qt / QML', 'LVGL'],
	buses: ['CAN', 'BLE', 'UART · I²C · SPI', 'TCP/IP', 'MQTT'],
	tooling: ['Git', 'CMake', 'Conan', 'GDB', 'Doctest', 'Gradle'],
	languages: [
		{ label: 'Italian', level: 'Native', bar: 5 },
		{ label: 'English', level: 'B2', bar: 4 }
	] satisfies LangLevel[]
};

export interface ExperienceItem {
	role: string;
	company: string;
	where: string;
	period: string;
	points: string[];
	tags: string[];
}

export const EXPERIENCE: ExperienceItem[] = [
	{
		role: 'Firmware Developer',
		company: 'Work Louder',
		where: 'Remote · Canada',
		period: 'Dec 2025 → ongoing',
		points: [
			'Working on Creator Micro 2 since Dec 2025, XYZ Work Board r2 since Jan 2026, and Knob1 and Nomad [E] 2 since Mar 2026.',
			'Completed and now maintain the Creator Micro 2, XYZ Work Board r2 and Knob1 firmware through fixes and feature updates.',
			'Actively developing the Nomad [E] 2 firmware and LVGL interface for its new hardware platform.',
			'Rewrote shared USB/BLE, RPC, power and charging libraries to improve reliability across the product line.',
			'Built hardware drivers and LVGL interfaces while resolving memory leaks, latent defects and performance issues.'
		],
		tags: ['ESP32', 'ESP-IDF', 'NimBLE', 'TinyUSB', 'LVGL']
	},
	{
		role: 'Software Developer - Embedded / HMI',
		company: 'Re:Lab',
		where: 'Treviglio, IT · onsite at SDF',
		period: 'Jan 2025 → ongoing',
		points: [
			'Working with the SDF R&D team through Re:Lab on tractor cabin software and onboard displays.',
			'Designed a machine-data flow that separates communication, interpretation, validation and application state.',
			'Developed a Qt-integrated hardware-abstraction library aligned with the HMI application model.',
			'Built reusable QML components and cluster pages for indicators, controls, alarms and popups.',
			'Optimized latency, resolved regressions and validated the system directly on reference hardware.'
		],
		tags: ['Automotive', 'HMI', 'Qt', 'Embedded Linux', 'Hardware integration']
	},
	{
		role: 'Artigiano',
		company: 'NicoLab',
		where: 'Chiuduno, IT',
		period: 'Oct 2023 – Feb 2024',
		points: [
			'Started and ran a sole proprietorship for contract finishing of fashion accessories.',
			'Planned work around deadlines, quality standards and client specifications.',
			'Managed clients directly, adapting priorities and processes when issues came up.'
		],
		tags: ['Self-employed', 'Operations']
	},
	{
		role: 'Artigiano',
		company: 'Giosmalt',
		where: 'Chiuduno, IT',
		period: 'Jan 2019 – Sep 2024',
		points: [
			'Worked in the family workshop, mainly on fashion accessory production.',
			'Handled operational and administrative work across production, quality control and delivery.',
			'Built the habit of meeting deadlines and quality standards during busy periods.'
		],
		tags: ['Operations', 'Quality']
	},
	{
		role: 'IT Intern',
		company: 'Italtrans',
		where: 'Calcinate, IT',
		period: 'Jun – Aug 2018',
		points: [
			'Provided technical and system administration support for maintenance and issue triage.',
			'Handled PC hardware/software repairs and upgrades, support tickets and peripheral maintenance.',
			"Learned a logistics company's internal processes by working across departments."
		],
		tags: ['IT support', 'Internship']
	},
	{
		role: 'Programmer',
		company: 'Garmsafe (IFS · school-business program)',
		where: 'Bergamo, IT',
		period: 'Nov 2016 – Jan 2018',
		points: [
			'Built software for ultrasonic-sensor management, from design through integration and testing.',
			'Coordinated a team of four, organizing activities and priorities for the final presentation.',
			"Project won 1st place at the IFS competition at Bergamo's Chamber of Commerce (BlindStrip, 2018)."
		],
		tags: ['3D modeling', 'Teamwork', 'Arduino']
	}
];

export const EDUCATION = [
	{
		degree: "Bachelor's degree in Computer Science",
		school: 'Università di Milano-Bicocca',
		period: '2021 – 2025'
	},
	{
		degree: 'Diploma in Computer Science',
		school: 'I.T.I.S. P. Paleocapa · Bergamo',
		period: 'Sep 2013 – Jun 2018'
	}
];

export const AWARDS = [
	{
		year: '2018',
		title: 'IFS · 1st place',
		body: "Garmsafe IFS project and the BlindStrip product, awarded at Bergamo's Chamber of Commerce."
	}
];

export const SKILL_GROUPS = [
	{
		title: 'Soft',
		items: [
			'Meticulous',
			'Leadership',
			'Pragmatic',
			'Time management',
			'Problem solving',
			'Critical thinking',
			'Conflict management'
		]
	},
	{ title: 'Languages', items: ['C', 'C++', 'Kotlin', 'Java', 'Python', 'Bash'] },
	{ title: 'Embedded', items: ['ESP32', 'ESP-IDF', 'FreeRTOS', 'PlatformIO'] },
	{ title: 'HMI', items: ['Qt', 'QML', 'LVGL', 'Embedded displays', 'Operator flows'] },
	{ title: 'Protocols', items: ['UART · I²C · SPI', 'CAN', 'BLE', 'TCP/IP', 'MQTT'] },
	{
		title: 'Tooling',
		items: [
			'Git',
			'CMake',
			'Conan',
			'GDB',
			'Qt · QML',
			'SDL',
			'MySQL',
			'Jetpack Compose',
			'Gradle',
			'Doctest'
		]
	},
	{
		title: 'Environments',
		items: [
			'GNU/Linux',
			'Windows',
			'QtCreator',
			'VSCode',
			'Android Studio',
			'IntelliJ IDEA',
			'Org-mode',
			'Godot Engine'
		]
	}
];

export const SERVICES = [
	{
		num: '01',
		title: 'ESP32 firmware & embedded systems',
		body: 'Firmware, BLE, CAN/GPIO integration, hardware-facing modules, stability fixes and features tested on target devices.',
		price: 'Project · scoped'
	},
	{
		num: '02',
		title: 'HMI & operator interfaces',
		body: 'Qt/QML and LVGL interfaces, dashboards, embedded displays, machine data and UI logic connected to real devices.',
		price: 'Project · scoped'
	},
	{
		num: '03',
		title: 'Software libraries',
		body: 'Reusable C/C++ libraries with clear APIs, focused responsibilities, automated tests and maintainable integration points.',
		price: 'Project · scoped'
	},
	{
		num: '04',
		title: 'Custom software & applications',
		body: 'Native Android apps, websites, web applications and internal tools built around specific product and business needs.',
		price: 'Project · scoped'
	},
	{
		num: '05',
		title: 'System integrations & automation',
		body: 'Backends, APIs and internal tools that connect devices, services, data and existing business processes.',
		price: 'Project · scoped'
	}
];

export const NOW = [
	{
		time: 'this week',
		title: 'Work Louder firmware',
		body: 'Developing Nomad [E] 2 while maintaining Creator Micro 2, XYZ Work Board r2 and Knob1 with fixes, upgrades and new features.'
	},
	{
		time: 'weekly',
		title: 'Onsite at SDF · Treviglio',
		body: 'Two days a week with the R&D team. Cluster refinements, machine-data integration and HMI work on reference hardware.'
	},
	{
		time: 'evenings',
		title: 'Nexenne Library',
		body: 'Building independent C++23 utility, container, time and random modules with tests, documentation and composable CMake targets.'
	},
	{
		time: 'reading',
		title: 'Modern C++ Design (Alexandrescu)',
		body: 'Slowly. With margin notes.'
	},
	{
		time: 'away from work',
		title: 'Hiking & calisthenics',
		body: "Bergamo's pre-Alps in the morning. Calisthenics in the evening. Skiing as soon as there is snow."
	}
];

export const USES = {
	computer: [
		{ k: 'Editors', v: 'QtCreator · VSCode · IntelliJ IDEA · Android Studio' },
		{ k: 'Terminal', v: 'Bash · GNU/Linux' },
		{ k: 'Notes', v: 'Org-mode → published here' },
		{ k: 'Debug', v: 'GDB · serial logs · oscilloscope when needed' }
	],
	desk: [
		{ k: 'Boards', v: 'ESP32 dev kits · custom HMI reference panels' },
		{ k: 'Display', v: 'Tractor display reference hardware (SDF lab)' },
		{ k: 'Bus tools', v: 'CAN dongle · BLE sniffer · logic analyzer' },
		{ k: 'Audio', v: 'Headphones · quiet room when I can get one' }
	],
	build: [
		{ k: 'Toolchain', v: 'GCC · CMake · Conan · PlatformIO · Gradle' },
		{ k: 'Test', v: 'Doctest · GDB · dedicated regression rigs' },
		{ k: 'VCS', v: 'Git · GitHub · GitHub Actions' },
		{ k: 'RTOS', v: 'FreeRTOS · ESP-IDF' }
	],
	shipping: [
		{ k: 'This site', v: 'SvelteKit · adapter-static' },
		{ k: 'Content', v: '.md / .org · unified + uniorg · checked with Zod' },
		{ k: 'Hosting', v: 'Static · DNS-only' }
	]
};

export interface SidemapRoute {
	id: string;
	code: string;
	labelKey: string;
	hex: string;
}

export const SIDEMAP_ROUTES: SidemapRoute[] = [
	{ id: 'home', code: '00', labelKey: 'sidemap.home', hex: '0x00' },
	{ id: 'work', code: '01', labelKey: 'sidemap.work', hex: '0x1A' },
	{ id: 'services', code: '02', labelKey: 'sidemap.services', hex: '0x2C' },
	{ id: 'about', code: '03', labelKey: 'sidemap.about', hex: '0x3E' },
	{ id: 'resume', code: '04', labelKey: 'sidemap.resume', hex: '0x3F' },
	{ id: 'blog', code: '05', labelKey: 'sidemap.blog', hex: '0x4F' },
	{ id: 'now', code: '06', labelKey: 'sidemap.now', hex: '0x6A' },
	{ id: 'uses', code: '07', labelKey: 'sidemap.uses', hex: '0x7B' },
	{ id: 'contact', code: '08', labelKey: 'sidemap.contact', hex: '0x8C' },
	{ id: 'card', code: '09', labelKey: 'sidemap.card', hex: '0x9D' },
	{ id: 'colophon', code: '10', labelKey: 'sidemap.colophon', hex: '0xAE' }
];
