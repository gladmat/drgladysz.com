// Anatomic-site predicates shared by the templates that carry a skin-prep line.
//
// Kept out of markdown.ts, which is emission helpers only — this is clinical
// logic that happens to feed a sentence.

// Facial / periocular / auricular sites, where alcoholic chlorhexidine is
// avoided (keratitis risk near the eye, ototoxicity risk near a perforated
// drum) and povidone-iodine aqueous is used instead.
//
// Scalp is deliberately absent: it is neither periocular nor auricular, and
// alcoholic chlorhexidine is the correct prep there.
const FACIAL_SITE_TERMS = [
  'face',
  'facial',
  'cheek',
  'nose',
  'nasal',
  'nasolabial',
  'ala',
  'alar',
  'columella',
  'eyelid',
  'lid',
  'periocular',
  'periorbital',
  'canthus',
  'canthal',
  'brow',
  'eyebrow',
  'forehead',
  'glabella',
  'temple',
  'temporal',
  'lip',
  'philtrum',
  'chin',
  'perioral',
  'vermilion',
  'ear',
  'earlobe',
  'helix',
  'antihelix',
  'tragus',
  'lobule',
  'preauricular',
  'pre-auricular',
  'postauricular',
  'post-auricular',
];

// \b is wrong here — it would fire inside hyphenated terms, so `pre-auricular`
// would match on its `auricular` half after `ear` had already been tried. The
// hand-rolled boundaries below treat `-` as a word character, and the
// alternation is ordered longest-first so `pre-auricular` wins over `ear`.
// A trailing `s` is tolerated so "both cheeks" matches; "shin" still does not
// match `chin`, because the preceding-character class rejects a letter before
// the term.
const FACIAL_SITE_RE = new RegExp(
  `(?:^|[^a-z-])(?:${[...FACIAL_SITE_TERMS]
    .sort((a, b) => b.length - a.length)
    .join('|')})s?(?![a-z-])`,
  'i',
);

export function isFacialSite(site: string): boolean {
  return FACIAL_SITE_RE.test(site);
}

export type PrepAgent = 'auto' | 'chlorhexidine' | 'betadine';

export type ResolvedPrepAgent = Exclude<PrepAgent, 'auto'>;

export function resolvePrepAgent(
  mode: PrepAgent,
  facial: boolean,
): ResolvedPrepAgent {
  if (mode !== 'auto') return mode;
  return facial ? 'betadine' : 'chlorhexidine';
}

// Agent phrase for the prep sentence. Each template wraps this in its own
// positioning sentence, so it is a noun phrase rather than a full sentence.
//
// The "why" clause is only appended when the site actually is facial —
// forcing Betadine on a forearm must not put a false justification in the
// note.
export function prepAgentPhrase(
  agent: ResolvedPrepAgent,
  facial: boolean,
): string {
  if (agent === 'chlorhexidine') return '0.5% chlorhexidine in alcohol';
  return facial
    ? 'povidone-iodine (Betadine) 10% aqueous — facial / periocular site, alcoholic chlorhexidine avoided near the eye'
    : 'povidone-iodine (Betadine) 10% aqueous';
}

export const PREP_AGENT_LABEL: Record<ResolvedPrepAgent, string> = {
  chlorhexidine: 'Chlorhexidine 0.5% in alcohol',
  betadine: 'Betadine 10% aqueous',
};
