// site/scripts/audit-fix-cts-faq.ts
//
// Audit fix (2026-05-14, per audit Part 1 §P1-SEO + Phase N): populate the
// new `faq[]` field on the two carpal-tunnel-syndrome patient articles
// (EN + PL). Each answer is grounded in the existing article body and the
// matching procedure page (open-carpal-tunnel-release / zespol-ciesni-nadgarstka).
//
// Per the audit, the FAQ on the CTS article is the first to ship under the
// new schema. Once verified live with rich results, the same pattern can
// be applied to other patient articles (Dupuytren, future trigger finger,
// de Quervain, etc.).
//
// Voice: institutional neutral, patient-comprehension level. Matches the
// existing article register — no "you" / "Pan/Pani" direct address, no
// scare or marketing language. 2-4 sentences per answer.
//
// Idempotent — uses `set` on the `faq` field, replacing the whole array
// each run. Safe to re-run after editing the content here.
//
// Pre-requisite: deploy the extended article schema (it gained a `faq`
// field on 2026-05-14):
//   cd site && npx sanity@latest schema deploy
//
// Usage:
//   cd site
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-cts-faq.ts          # dry-run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-cts-faq.ts --commit

import { createClient } from '@sanity/client';

const COMMIT = process.argv.includes('--commit');
const TOKEN =
  process.env.SANITY_API_DEVELOPER_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN ||
  '';
if (COMMIT && !TOKEN) {
  console.error('✗ Missing SANITY_API_DEVELOPER_TOKEN.');
  process.exit(1);
}

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2026-01-01',
  token: TOKEN || undefined,
  useCdn: false,
});

// Helper: build a single-paragraph PortableText block from one string.
function textBlock(key: string, text: string) {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: `${key}s`, text, marks: [] }],
  };
}

// English FAQ — patient audience. Each answer ≤ ~75 words, plain language.
const EN_FAQ = [
  {
    _key: 'faq-en-1',
    question: 'How do I know if I have carpal tunnel syndrome?',
    answer: [
      textBlock(
        'faq-en-1a',
        'The most characteristic symptom is numbness or tingling in the hand at night, typically waking the person from sleep and affecting the thumb, index, middle, and the thumb side of the ring finger. With time, the same sensations can appear during activities that hold the wrist in one position — driving, reading, or using a phone. Reduced grip strength and occasional clumsiness with fine tasks are common in more advanced presentations. A clinical assessment, with provocative tests and where appropriate nerve conduction studies, confirms the diagnosis.',
      ),
    ],
  },
  {
    _key: 'faq-en-2',
    question: 'When should surgery be considered?',
    answer: [
      textBlock(
        'faq-en-2a',
        'Surgery is appropriate when symptoms persist despite conservative measures (a night-time splint, activity modification, sometimes a single steroid injection), when nerve conduction studies show moderate or severe changes, or when there is already measurable weakness or wasting of the thumb muscles. Open carpal tunnel release is the standard procedure: a short incision, about ten minutes of operating time, performed under local anaesthetic as a day-stay.',
      ),
    ],
  },
  {
    _key: 'faq-en-3',
    question: 'How long does recovery take?',
    answer: [
      textBlock(
        'faq-en-3a',
        'Most people return to office work within two to three weeks and to heavier physical work within four to six weeks. Light activity is encouraged from the first day. The dressing stays dry until the wound check at 10–14 days. Night-time numbness usually settles within the first few nights; full recovery of grip strength is gradual over about six months. Where pre-operative numbness was advanced, sensation can continue to improve for up to twelve months.',
      ),
    ],
  },
  {
    _key: 'faq-en-4',
    question: 'Is the surgery painful?',
    answer: [
      textBlock(
        'faq-en-4a',
        'The procedure is performed under local anaesthetic injected at the wrist and palm, so the operation itself is not painful — pressure may be felt, but not pain. A tourniquet on the upper arm prevents bleeding and provides a clean operative field. After the local anaesthetic wears off, simple analgesia (paracetamol with an anti-inflammatory if not contraindicated) is usually sufficient for the first few days.',
      ),
    ],
  },
  {
    _key: 'faq-en-5',
    question: 'Can carpal tunnel syndrome come back after surgery?',
    answer: [
      textBlock(
        'faq-en-5a',
        'True recurrence of compression at the same site is uncommon after a complete release. Persistent or recurrent symptoms more often reflect an incomplete release, scarring, or a different upstream nerve problem (such as cervical radiculopathy) that mimics carpal tunnel syndrome. Discomfort at the base of the palm — pillar pain — is common in the first three to six months after surgery and almost always settles; it is not the same as recurrence.',
      ),
    ],
  },
];

// Polish FAQ — informacje dla pacjenta. Neutralny rejestr instytucjonalny,
// brak "Pan/Pani", brak rozkazującej formy.
const PL_FAQ = [
  {
    _key: 'faq-pl-1',
    question: 'Po czym poznać zespół cieśni nadgarstka?',
    answer: [
      textBlock(
        'faq-pl-1a',
        'Najbardziej charakterystycznym objawem są nocne drętwienia i mrowienia palców — najczęściej kciuka, palca wskazującego, środkowego oraz promieniowej połowy palca serdecznego. Z czasem objawy mogą pojawiać się także w ciągu dnia, podczas czynności wymagających utrzymania nadgarstka w określonej pozycji: prowadzenia samochodu, czytania, korzystania z telefonu. W zaawansowanym przebiegu pojawia się osłabienie chwytu i niezręczność przy precyzyjnych czynnościach. Rozpoznanie potwierdza badanie kliniczne z testami prowokacyjnymi, a w razie potrzeby badanie elektrofizjologiczne.',
      ),
    ],
  },
  {
    _key: 'faq-pl-2',
    question: 'Kiedy konieczna jest operacja?',
    answer: [
      textBlock(
        'faq-pl-2a',
        'Leczenie operacyjne jest wskazane, gdy objawy utrzymują się mimo leczenia zachowawczego (szyna nocna, modyfikacja aktywności, ewentualnie pojedyncze wstrzyknięcie sterydu), gdy badanie elektrofizjologiczne wykazuje umiarkowane lub ciężkie zmiany albo gdy obecne jest mierzalne osłabienie lub zanik mięśni kłębu kciuka. Otwarte odbarczenie kanału nadgarstka jest standardowym zabiegiem: krótkie nacięcie, około dziesięciu minut operacji, w znieczuleniu miejscowym, w trybie ambulatoryjnym.',
      ),
    ],
  },
  {
    _key: 'faq-pl-3',
    question: 'Jak długo trwa rekonwalescencja po zabiegu?',
    answer: [
      textBlock(
        'faq-pl-3a',
        'Większość osób wraca do pracy biurowej w ciągu 2–3 tygodni, a do pracy fizycznej w ciągu 4–6 tygodni. Delikatne czynności są zalecane od pierwszego dnia. Opatrunek pozostaje suchy aż do kontroli rany w 10.–14. dobie. Ustąpienie nocnego drętwienia jest zazwyczaj pierwszą zauważalną poprawą w ciągu pierwszych kilku nocy; powrót pełnej siły chwytu jest stopniowy i może zająć około sześciu miesięcy. Jeśli przedoperacyjne drętwienie było zaawansowane, czucie w palcach może wracać przez okres do dwunastu miesięcy.',
      ),
    ],
  },
  {
    _key: 'faq-pl-4',
    question: 'Czy operacja jest bolesna?',
    answer: [
      textBlock(
        'faq-pl-4a',
        'Zabieg wykonuje się w znieczuleniu miejscowym podawanym w obrębie nadgarstka i dłoni, więc sama operacja nie jest bolesna — można odczuwać ucisk, ale nie ból. Opaska uciskowa na ramieniu zapobiega krwawieniu, dzięki czemu chirurg ma czystą ekspozycję pola operacyjnego. Po ustąpieniu znieczulenia miejscowego zwykle wystarcza prosta analgezja — paracetamol z lekiem przeciwzapalnym, o ile nie ma przeciwwskazań — przez pierwsze kilka dni.',
      ),
    ],
  },
  {
    _key: 'faq-pl-5',
    question: 'Czy zespół cieśni może wrócić po operacji?',
    answer: [
      textBlock(
        'faq-pl-5a',
        'Prawdziwy nawrót ucisku w tym samym miejscu po całkowitym odbarczeniu jest rzadki. Utrzymujące się lub nawracające objawy częściej wskazują na niepełne odbarczenie, na zmiany bliznowate albo na inną przyczynę w wyższym piętrze (np. radikulopatia szyjna), która imituje zespół cieśni nadgarstka. Dolegliwości w okolicy podstawy dłoni — tzw. pillar pain — są częste w pierwszych 3–6 miesiącach po zabiegu i prawie zawsze ustępują; nie są tożsame z nawrotem choroby.',
      ),
    ],
  },
];

const TARGETS = [
  { id: 'article-carpal-tunnel-syndrome', faq: EN_FAQ, locale: 'EN' },
  { id: 'article-zespol-ciesni-nadgarstka', faq: PL_FAQ, locale: 'PL' },
];

async function main() {
  console.log(`audit-fix-cts-faq — ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);

  for (const t of TARGETS) {
    const doc = await client.fetch<{ _id: string; faq?: unknown[] } | null>(
      `*[_id == $id][0]{_id, faq}`,
      { id: t.id },
    );
    if (!doc) {
      console.warn(`  · ${t.id} — not found, skipping`);
      continue;
    }
    const existing = (doc.faq as unknown[] | undefined)?.length ?? 0;
    console.log(
      `  · ${t.id} [${t.locale}] — ${t.faq.length} questions ` +
        (existing > 0 ? `(replacing ${existing} existing)` : '(populating)'),
    );
    if (!COMMIT) continue;
    await client.patch(t.id).set({ faq: t.faq }).commit();
    console.log(`    ✓ committed`);
  }

  if (!COMMIT) {
    console.log('\n(dry-run — re-run with --commit to apply)');
  }
}

main().catch((err) => {
  console.error('\n✗ Patch failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
