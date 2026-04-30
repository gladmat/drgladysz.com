// src/components/interactive/QuickDASH.tsx
//
// QuickDASH — Quick Disabilities of the Arm, Shoulder and Hand. 11-item
// patient-reported outcome measure, 5-point Likert per item, score 0–100.
// Higher score = greater disability.
//
// Source: Beaton DE, Wright JG, Katz JN, Upper Extremity Collaborative Group.
// Development of the QuickDASH: comparison of three item-reduction approaches.
// J Bone Joint Surg Am. 2005;87(5):1038-46. (and J Hand Ther 18:33-44 short
// reference). Score = ((sum/n) - 1) × 25 where n = number of answered items.
// At least 10 of 11 items must be answered for a score.
//
// Per-item response options vary by item type (functional 1-6, interference
// 7-8, symptom 9-11) per the validated form. All map to 1-5 internally for
// scoring.
//
// State is component-local (useState). No localStorage — clinical scores
// must not persist across sessions for privacy/audit reasons.
import { useState } from 'preact/hooks';
import './calculator.css';

type Locale = 'en' | 'pl';

interface Props {
  locale?: Locale;
}

// Response sets — three label families per the QuickDASH validated form.
const FUNCTIONAL_OPTIONS: ResponseOption[] = [
  { value: 1, label: 'No difficulty' },
  { value: 2, label: 'Mild difficulty' },
  { value: 3, label: 'Moderate difficulty' },
  { value: 4, label: 'Severe difficulty' },
  { value: 5, label: 'Unable' },
];

const INTERFERENCE_OPTIONS: ResponseOption[] = [
  { value: 1, label: 'Not at all' },
  { value: 2, label: 'Slightly' },
  { value: 3, label: 'Moderately' },
  { value: 4, label: 'Quite a bit' },
  { value: 5, label: 'Extremely' },
];

const SYMPTOM_OPTIONS: ResponseOption[] = [
  { value: 1, label: 'None' },
  { value: 2, label: 'Mild' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'Severe' },
  { value: 5, label: 'Extreme' },
];

interface ResponseOption {
  value: 1 | 2 | 3 | 4 | 5;
  label: string;
}

interface Question {
  id: number;
  prompt: string;
  options: ResponseOption[];
}

// 11-item QuickDASH per Beaton 2005. Items 1-6 functional; 7-8 interference;
// 9-11 symptom. Wording is the validated English form — do not paraphrase
// without re-validating.
const QUESTIONS: Question[] = [
  { id: 1, prompt: 'Open a tight or new jar.', options: FUNCTIONAL_OPTIONS },
  { id: 2, prompt: 'Do heavy household chores (e.g., wash walls, floors).', options: FUNCTIONAL_OPTIONS },
  { id: 3, prompt: 'Carry a shopping bag or briefcase.', options: FUNCTIONAL_OPTIONS },
  { id: 4, prompt: 'Wash your back.', options: FUNCTIONAL_OPTIONS },
  { id: 5, prompt: 'Use a knife to cut food.', options: FUNCTIONAL_OPTIONS },
  {
    id: 6,
    prompt:
      'Recreational activities in which you take some force or impact through your arm, shoulder or hand (e.g., golf, hammering, tennis, etc.).',
    options: FUNCTIONAL_OPTIONS,
  },
  {
    id: 7,
    prompt:
      'During the past week, to what extent has your arm, shoulder or hand problem interfered with your normal social activities with family, friends, neighbours or groups?',
    options: INTERFERENCE_OPTIONS,
  },
  {
    id: 8,
    prompt:
      'During the past week, were you limited in your work or other regular daily activities as a result of your arm, shoulder or hand problem?',
    options: INTERFERENCE_OPTIONS,
  },
  {
    id: 9,
    prompt: 'Please rate the severity of the following symptom during the past week: arm, shoulder or hand pain.',
    options: SYMPTOM_OPTIONS,
  },
  {
    id: 10,
    prompt:
      'Please rate the severity of the following symptom during the past week: tingling (pins and needles) in your arm, shoulder or hand.',
    options: SYMPTOM_OPTIONS,
  },
  {
    id: 11,
    prompt:
      'During the past week, how much difficulty have you had sleeping because of the pain in your arm, shoulder or hand?',
    options: SYMPTOM_OPTIONS,
  },
];

const MIN_ANSWERED = 10; // Beaton 2005: allow up to 1 missing of 11.

type Responses = Partial<Record<number, 1 | 2 | 3 | 4 | 5>>;

interface ScoreResult {
  isComplete: boolean; // ≥10 items answered
  answeredCount: number;
  score: number | null; // null when isComplete is false
}

function computeScore(responses: Responses): ScoreResult {
  const values = Object.values(responses).filter(
    (v): v is 1 | 2 | 3 | 4 | 5 => typeof v === 'number',
  );
  const answeredCount = values.length;
  if (answeredCount < MIN_ANSWERED) {
    return { isComplete: false, answeredCount, score: null };
  }
  const sum = values.reduce((a, b) => a + b, 0);
  const raw = (sum / answeredCount - 1) * 25;
  // Round to one decimal place per common clinical convention.
  const score = Math.round(raw * 10) / 10;
  return { isComplete: true, answeredCount, score };
}

function interpret(score: number): string {
  // QuickDASH has no formally established interpretation thresholds in the
  // 2005 paper — score is reported continuously. The MCID is around 10-15
  // points (Mintken et al. 2009 for shoulder; Sorensen et al. 2013 for hand).
  // The descriptors below are MDCalc's commonly-cited bands.
  if (score < 15) return 'Minimal disability';
  if (score < 40) return 'Mild disability';
  if (score < 60) return 'Moderate disability';
  if (score < 80) return 'Severe disability';
  return 'Extreme disability';
}

export default function QuickDASH({ locale = 'en' }: Props) {
  const [responses, setResponses] = useState<Responses>({});
  const result = computeScore(responses);

  const handleChange = (questionId: number, value: 1 | 2 | 3 | 4 | 5) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleReset = () => {
    setResponses({});
  };

  const t = locale === 'pl' ? PL_LABELS : EN_LABELS;

  return (
    <div class="calculator-widget" data-calculator="quickdash">
      {locale === 'pl' && (
        <p class="calculator-locale-note">
          {/* PL note — questions remain in validated English wording until
              the Polish-validated translation is plugged in. */}
          {t.localeNote}
        </p>
      )}

      <form class="calculator-form" onSubmit={(e) => e.preventDefault()}>
        <fieldset class="calculator-fieldset">
          <legend class="calculator-legend">{t.legend}</legend>
          <ol class="calculator-questions">
            {QUESTIONS.map((q) => (
              <li class="calculator-question" key={q.id}>
                <p class="calculator-question-prompt">
                  <span class="calculator-question-num">{q.id}.</span>
                  <span>{q.prompt}</span>
                </p>
                <div
                  class="calculator-options"
                  role="radiogroup"
                  aria-label={`Question ${q.id} response`}
                >
                  {q.options.map((opt) => {
                    const id = `q${q.id}-opt${opt.value}`;
                    const checked = responses[q.id] === opt.value;
                    return (
                      <label class="calculator-option" key={opt.value}>
                        <input
                          type="radio"
                          id={id}
                          name={`question-${q.id}`}
                          value={opt.value}
                          checked={checked}
                          onChange={() => handleChange(q.id, opt.value)}
                        />
                        <span class="calculator-option-num">{opt.value}</span>
                        <span class="calculator-option-label">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
        </fieldset>
      </form>

      <div
        class="calculator-result"
        aria-live="polite"
        aria-atomic="true"
      >
        {result.isComplete && result.score !== null ? (
          <>
            <p class="calculator-result-label">{t.resultLabel}</p>
            <p class="calculator-result-score">
              <span class="calculator-result-number">{result.score}</span>
              <span class="calculator-result-range" aria-hidden="true">
                / 100
              </span>
            </p>
            <p class="calculator-result-interpretation">{interpret(result.score)}</p>
            <p class="calculator-result-note">{t.scoreNote}</p>
          </>
        ) : (
          <>
            <p class="calculator-result-label">{t.incompleteLabel}</p>
            <p class="calculator-result-progress">
              {t.progressPrefix} {result.answeredCount} / 11
              {result.answeredCount > 0 && result.answeredCount < MIN_ANSWERED && (
                <span class="calculator-result-hint">
                  {' '}
                  · {t.progressNeeded} {MIN_ANSWERED}.
                </span>
              )}
            </p>
          </>
        )}
        {Object.keys(responses).length > 0 && (
          <button
            type="button"
            class="calculator-reset"
            onClick={handleReset}
          >
            {t.reset}
          </button>
        )}
      </div>
    </div>
  );
}

const EN_LABELS = {
  legend: 'Rate your ability to do the following activities in the past week.',
  resultLabel: 'QuickDASH score',
  scoreNote:
    'Higher scores indicate greater disability. The validation paper (Beaton 2005) reports the score continuously; the band labels above are commonly cited descriptors.',
  incompleteLabel: 'Score',
  progressPrefix: 'Answered',
  progressNeeded: 'at least',
  reset: 'Reset',
  localeNote: '',
};

const PL_LABELS = {
  legend: 'Oceń swoją zdolność do wykonywania poniższych czynności w ciągu ostatniego tygodnia.',
  resultLabel: 'Wynik QuickDASH',
  scoreNote:
    'Wyższy wynik oznacza większy stopień niesprawności. W oryginalnej walidacji (Beaton 2005) wynik jest raportowany na skali ciągłej; powyższe pasma są powszechnie cytowanymi opisami.',
  incompleteLabel: 'Wynik',
  progressPrefix: 'Odpowiedziano na',
  progressNeeded: 'wymagana liczba odpowiedzi:',
  reset: 'Wyczyść',
  localeNote:
    'Pytania prezentowane są w zwalidowanej angielskiej wersji. Polska zwalidowana wersja zostanie dodana wkrótce.',
};
