/**
 * Resume content loader (server only).
 *
 * Parses the Italian and English resume Markdown files and validates their
 * frontmatter with zod into a structured Resume object. Projects are sorted
 * most-recent first using the recency helper.
 */
import { z } from 'zod';
import { parseMarkdown } from './parser.server';
import { recencyKey } from './recency';

const ContactSchema = z.object({
	email: z.string(),
	website: z.string(),
	github: z.string(),
	phone: z.string(),
	location: z.string(),
	born: z.string()
});

const ExperienceSchema = z.object({
	role: z.string(),
	company: z.string(),
	date: z.string(),
	location: z.string(),
	current: z.boolean().optional().default(false),
	headline: z.string().optional().default(''),
	points: z.array(z.string()).default([]),
	tags: z.array(z.string()).default([])
});

const ProjectSchema = z.object({
	name: z.string(),
	kind: z.string().optional().default('Personale'),
	date: z.string(),
	location: z.string(),
	current: z.boolean().optional().default(false),
	headline: z.string().optional().default(''),
	points: z.array(z.string()).default([]),
	link: z.string().optional().default(''),
	tags: z.array(z.string()).default([])
});

const SkillGroupSchema = z.object({
	title: z.string(),
	items: z.array(z.string())
});

const EducationSchema = z.object({
	degree: z.string(),
	school: z.string(),
	date: z.string(),
	current: z.boolean().optional().default(false)
});

const LanguageSchema = z.object({
	name: z.string(),
	level: z.string()
});

const AwardSchema = z.object({
	title: z.string(),
	year: z.string().optional().default(''),
	body: z.string()
});

// UI labels for the resume page, co-located with the resume content so the whole
// document (data + section headings) lives in one per-language file. Required, so
// a missing label fails the build (stronger than the old i18n parity check).
const LabelsSchema = z.object({
	subtitle: z.string(),
	title: z.string(),
	download: z.string(),
	born: z.string(),
	experience: z.string(),
	date: z.string(),
	location: z.string(),
	projects: z.string(),
	one_line: z.string(),
	skills: z.string(),
	education: z.string(),
	languages: z.string(),
	awards: z.string(),
	off_screen: z.string(),
	consent: z.string()
});

const ResumeSchema = z.object({
	name: z.string(),
	role: z.string(),
	photo: z.string(),
	status: z.string().optional().default(''),
	accent: z.string().optional().default('#2e5266'),
	labels: LabelsSchema,
	contact: ContactSchema,
	quote: z.string(),
	motto: z.string(),
	experience: z.array(ExperienceSchema).default([]),
	projects: z.array(ProjectSchema).default([]),
	skills: z.array(SkillGroupSchema).default([]),
	education: z.array(EducationSchema).default([]),
	languages: z.array(LanguageSchema).default([]),
	awards: z.array(AwardSchema).default([]),
	hobbies: z.array(z.string()).default([]),
	consent: z.string().optional().default('')
});

export type Resume = z.infer<typeof ResumeSchema>;

const files = import.meta.glob('/content/resume/resume*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

let cached: Resume | null = null;
let cachedAll: Record<'it' | 'en', Resume> | null = null;

function parseResume(path: string, raw: string): Resume {
	const { data } = parseMarkdown(raw);
	const parsed = ResumeSchema.safeParse(data);
	if (!parsed.success) {
		console.error(`[resume] Invalid frontmatter in ${path}:`, parsed.error.message);
		throw parsed.error;
	}
	// Show projects most-recent first regardless of authoring order.
	parsed.data.projects.sort((a, b) => recencyKey(b.date) - recencyKey(a.date));
	return parsed.data;
}

export function getResumes(): Record<'it' | 'en', Resume> {
	if (cachedAll) return cachedAll;

	const itPath = '/content/resume/resume.md';
	const enPath = '/content/resume/resume.en.md';
	const itRaw = files[itPath];
	const enRaw = files[enPath];

	if (!itRaw || !enRaw) {
		throw new Error(
			'Both content/resume/resume.md and content/resume/resume.en.md are required.'
		);
	}

	cachedAll = {
		it: parseResume(itPath, itRaw),
		en: parseResume(enPath, enRaw)
	};
	return cachedAll;
}

export function getResume(): Resume {
	if (cached) return cached;
	cached = getResumes().it;
	return cached;
}
