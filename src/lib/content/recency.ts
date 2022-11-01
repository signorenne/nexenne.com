// Month names (Italian and English, full and common abbreviations) mapped to 1-12.
const MONTHS: Record<string, number> = {
	gennaio: 1, gen: 1, january: 1, jan: 1,
	febbraio: 2, feb: 2, february: 2,
	marzo: 3, mar: 3, march: 3,
	aprile: 4, apr: 4, april: 4,
	maggio: 5, may: 5, mag: 5,
	giugno: 6, giu: 6, june: 6, jun: 6,
	luglio: 7, lug: 7, july: 7, jul: 7,
	agosto: 8, ago: 8, august: 8, aug: 8,
	settembre: 9, set: 9, sett: 9, september: 9, sep: 9, sept: 9,
	ottobre: 10, ott: 10, october: 10, oct: 10,
	novembre: 11, nov: 11, november: 11,
	dicembre: 12, dic: 12, december: 12, dec: 12
};

/**
 * Turn a free-text date or year string (for example "Da marzo 2026",
 * "Nov 2022-Feb 2023", "2026 ongoing", or "Since December 2025") into a sortable
 * number in YYYYMM form. It uses the latest year mentioned and the last month
 * name found (the end of a range), so a higher number means more recent.
 *
 * @param text A free-text date or year string from content frontmatter.
 * @return A sortable YYYYMM number, or 0 when no year is present.
 */
export function recencyKey(text: string): number {
	if (!text) return 0;
	const years = (text.match(/\d{4}/g) ?? []).map(Number);
	if (!years.length) return 0;
	const year = Math.max(...years);

	let month = 0;
	const words = text.toLowerCase().match(/[a-zàèéìòù]+/g) ?? [];
	for (const w of words) {
		if (w in MONTHS) month = MONTHS[w]; // keep the last month found (range end)
	}
	return year * 100 + month;
}
