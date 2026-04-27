---
feature: febhs-mcq-component
tier: 2
ships_with: months-6-12
infrastructure_effort_hours: 20-30
ongoing_cost: question-authoring
status: locked
version: 1.7
---

# Feature 4 — FEBHS MCQ component

A multiple-choice question component for FEBHS exam preparation content. Reader sees a question, selects an answer, immediately receives feedback (correct/incorrect with explanation), with optional cross-link back to source article passage. Progress tracked in browser localStorage (no user accounts at MVP). Aggregate progress visible at `/en/learn/progress`.

---

## Strategic value

**No widely-used FEBHS-specific question bank exists in 2026.** The European hand surgery training community lacks a content destination that AMBOSS provides for US/German medical education. This is the highest-leverage peer-audience feature on the site — it gives every FEBHS candidate in Europe a reason to bookmark drgladysz.com and return regularly.

Once content fills it (questions authored by Mateusz, ideally peer-reviewed by other FEBHS surgeons), it becomes the most-shared content type within the European hand surgery training community. The FEBHS exam prep community is small and tightly connected; word spreads quickly when a quality resource appears.

---

## Critical caveat: question quality

**Bad questions are worse than no questions for a peer audience.** This is the single most important constraint on this feature.

A junior surgeon failing the FEBHS because they revised against incorrect explanations attributes that failure to your site. The reputational damage outweighs any SEO benefit.

Operating constraint:

1. **Every question peer-reviewed before publishing** — by another FEBHS-credentialed surgeon ideally, otherwise by a reliable senior hand surgeon
2. **Explanations cite supporting literature** — not "because the textbook says so" but with PubMed-linked citations
3. **Question difficulty is calibrated** — flag questions that have proven too easy or too hard from user data
4. **Errata mechanism** — clear way for users to flag suspected errors; prompt review and correction

If the peer-review pipeline doesn't exist, defer launching the MCQ component until it does. Better to launch later than to launch with quality risk.

---

## Architecture overview

```
┌──────────────────────────────────────────────────────┐
│ Sanity mcqQuestion documents                         │
│ - stem, options, correct answer, explanation         │
│ - source article reference (cross-link)              │
│ - difficulty tag (1-5)                               │
│ - anatomy/topic tags                                 │
│ - peer review status (draft, in review, published)   │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│ Astro page templates                                 │
│ - /en/learn — landing, lists topics                  │
│ - /en/learn/[topic] — question set for topic         │
│ - /en/learn/progress — overall progress dashboard    │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│ Preact island: MCQQuestion component                 │
│ - Renders one question with options                  │
│ - Shows feedback after answer selection              │
│ - Tracks attempt in localStorage                     │
│ - Cross-links to source article                      │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│ Browser localStorage (state only, no PII)            │
│ - questionId → { attempts, lastResult, lastDate }    │
│ - Progress dashboard reads from this                 │
└──────────────────────────────────────────────────────┘
```

---

## Sanity schema — `mcqQuestion.ts`

```typescript
// studio/schemas/mcqQuestion.ts
import { defineType, defineField } from 'sanity';

export const mcqQuestion = defineType({
  name: 'mcqQuestion',
  title: 'MCQ question',
  type: 'document',
  fields: [
    defineField({
      name: 'stem',
      title: 'Question stem',
      type: 'array',
      of: [{ type: 'block' }],
      validation: (Rule) => Rule.required(),
      description: 'The question text. Can include images, citations, etc.',
    }),
    defineField({
      name: 'options',
      title: 'Answer options (4-5)',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'option',
          fields: [
            { name: 'text', title: 'Option text', type: 'text', rows: 2, validation: (Rule) => Rule.required() },
            { name: 'isCorrect', title: 'Is correct answer?', type: 'boolean', initialValue: false },
            { name: 'explanationDetail', title: 'Why this is correct/incorrect (specific to this option)', type: 'text', rows: 3 },
          ],
          preview: {
            select: { text: 'text', isCorrect: 'isCorrect' },
            prepare: ({ text, isCorrect }) => ({
              title: text?.substring(0, 60) + (text?.length > 60 ? '...' : ''),
              subtitle: isCorrect ? '✓ Correct answer' : 'Incorrect',
            }),
          },
        },
      ],
      validation: (Rule) => Rule.required().min(4).max(5).custom((options) => {
        const correctCount = options?.filter((o: any) => o.isCorrect).length || 0;
        if (correctCount !== 1) return 'Exactly one option must be marked correct';
        return true;
      }),
    }),
    defineField({
      name: 'explanation',
      title: 'Overall explanation',
      type: 'array',
      of: [{ type: 'block' }],
      validation: (Rule) => Rule.required(),
      description: 'Comprehensive explanation shown after the question is answered. Should cite supporting literature using citation marks.',
    }),
    defineField({
      name: 'sourceArticle',
      title: 'Source article (optional cross-link)',
      type: 'reference',
      to: [{ type: 'article' }, { type: 'procedurePage' }],
      description: 'If this question is based on a specific article on the site, link it here. Adds "Read source article" link in feedback.',
    }),
    defineField({
      name: 'difficulty',
      title: 'Difficulty (1=easiest, 5=hardest)',
      type: 'number',
      validation: (Rule) => Rule.required().integer().min(1).max(5),
      initialValue: 3,
    }),
    defineField({
      name: 'topic',
      title: 'Topic',
      type: 'string',
      options: {
        list: [
          { title: 'Hand anatomy', value: 'anatomy' },
          { title: 'Hand trauma', value: 'trauma' },
          { title: 'Tendon disorders', value: 'tendon' },
          { title: 'Nerve compression', value: 'nerve-compression' },
          { title: 'Peripheral nerve injury', value: 'nerve-injury' },
          { title: 'Joint disorders', value: 'joint' },
          { title: 'Bone disorders', value: 'bone' },
          { title: 'Microsurgery', value: 'microsurgery' },
          { title: 'Congenital hand', value: 'congenital' },
          { title: 'Tumours', value: 'tumours' },
          { title: 'Imaging', value: 'imaging' },
          { title: 'Examination', value: 'examination' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'tags',
      title: 'Additional tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'reviewStatus',
      title: 'Peer review status',
      type: 'string',
      options: {
        list: [
          { title: 'Draft (do not publish)', value: 'draft' },
          { title: 'In review', value: 'in-review' },
          { title: 'Published', value: 'published' },
          { title: 'Errata flagged', value: 'errata' },
        ],
      },
      validation: (Rule) => Rule.required(),
      initialValue: 'draft',
    }),
    defineField({
      name: 'reviewedBy',
      title: 'Reviewed by (peer reviewer name)',
      type: 'string',
      description: 'Required before publishing. Can be Mateusz himself for self-review during early build.',
    }),
    defineField({
      name: 'reviewDate',
      title: 'Last review date',
      type: 'date',
    }),
  ],
  preview: {
    select: {
      stem: 'stem',
      topic: 'topic',
      difficulty: 'difficulty',
      reviewStatus: 'reviewStatus',
    },
    prepare({ stem, topic, difficulty, reviewStatus }) {
      const stemText = stem?.[0]?.children?.[0]?.text || 'Untitled';
      return {
        title: stemText.substring(0, 60) + (stemText.length > 60 ? '...' : ''),
        subtitle: `${topic} · D${difficulty} · ${reviewStatus}`,
      };
    },
  },
});
```

---

## Preact component — `MCQQuestion.tsx`

```typescript
// src/components/interactive/MCQQuestion.tsx
import { useState, useEffect } from 'preact/hooks';
import { PortableText } from 'astro-portabletext';

interface MCQQuestionProps {
  question: {
    _id: string;
    stem: any[]; // Portable Text
    options: { text: string; isCorrect: boolean; explanationDetail?: string }[];
    explanation: any[]; // Portable Text
    sourceArticle?: { slug: string; title: string };
    difficulty: number;
    topic: string;
  };
}

interface AttemptRecord {
  attempts: number;
  lastResult: 'correct' | 'incorrect';
  lastDate: string;
}

const STORAGE_KEY = 'mcq-progress';

function loadProgress(): Record<string, AttemptRecord> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveProgress(progress: Record<string, AttemptRecord>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export default function MCQQuestion({ question }: MCQQuestionProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [previousAttempt, setPreviousAttempt] = useState<AttemptRecord | null>(null);
  
  useEffect(() => {
    const progress = loadProgress();
    setPreviousAttempt(progress[question._id] || null);
  }, [question._id]);
  
  const correctIndex = question.options.findIndex(o => o.isCorrect);
  const isCorrect = hasAnswered && selectedIndex === correctIndex;
  
  function handleSubmit() {
    if (selectedIndex === null) return;
    setHasAnswered(true);
    
    // Save to localStorage
    const progress = loadProgress();
    const existing = progress[question._id];
    progress[question._id] = {
      attempts: (existing?.attempts || 0) + 1,
      lastResult: selectedIndex === correctIndex ? 'correct' : 'incorrect',
      lastDate: new Date().toISOString(),
    };
    saveProgress(progress);
  }
  
  function handleReset() {
    setSelectedIndex(null);
    setHasAnswered(false);
  }
  
  return (
    <div class="mcq-question">
      <div class="mcq-meta">
        <span class="mcq-topic">{question.topic.replace(/-/g, ' ')}</span>
        <span class="mcq-difficulty" aria-label={`Difficulty ${question.difficulty} of 5`}>
          {'●'.repeat(question.difficulty)}{'○'.repeat(5 - question.difficulty)}
        </span>
        {previousAttempt && (
          <span class="mcq-previous">
            Previously: {previousAttempt.lastResult} ({previousAttempt.attempts} attempt{previousAttempt.attempts !== 1 ? 's' : ''})
          </span>
        )}
      </div>
      
      <div class="mcq-stem">
        <PortableText value={question.stem} />
      </div>
      
      <fieldset class="mcq-options" disabled={hasAnswered}>
        <legend class="visually-hidden">Answer options</legend>
        {question.options.map((option, i) => {
          const isSelected = selectedIndex === i;
          const isCorrectOption = option.isCorrect;
          const showFeedback = hasAnswered;
          
          let className = 'mcq-option';
          if (isSelected && !showFeedback) className += ' selected';
          if (showFeedback && isSelected && isCorrectOption) className += ' correct';
          if (showFeedback && isSelected && !isCorrectOption) className += ' incorrect';
          if (showFeedback && !isSelected && isCorrectOption) className += ' correct-not-selected';
          
          return (
            <label class={className}>
              <input
                type="radio"
                name={`mcq-${question._id}`}
                value={i}
                checked={isSelected}
                disabled={hasAnswered}
                onChange={() => setSelectedIndex(i)}
              />
              <span class="mcq-option-marker">{String.fromCharCode(65 + i)}</span>
              <span class="mcq-option-text">{option.text}</span>
              {showFeedback && isCorrectOption && (
                <span class="mcq-option-icon" aria-label="Correct">✓</span>
              )}
              {showFeedback && isSelected && !isCorrectOption && (
                <span class="mcq-option-icon" aria-label="Incorrect">✗</span>
              )}
            </label>
          );
        })}
      </fieldset>
      
      <div class="mcq-actions">
        {!hasAnswered && (
          <button
            type="button"
            class="mcq-submit"
            disabled={selectedIndex === null}
            onClick={handleSubmit}
          >
            Submit answer
          </button>
        )}
        {hasAnswered && (
          <button type="button" class="mcq-reset" onClick={handleReset}>
            Try again
          </button>
        )}
      </div>
      
      {hasAnswered && (
        <div class={`mcq-feedback ${isCorrect ? 'correct' : 'incorrect'}`} aria-live="polite">
          <p class="mcq-result-label">
            {isCorrect ? 'Correct' : 'Incorrect'}
          </p>
          
          {!isCorrect && question.options[selectedIndex!].explanationDetail && (
            <p class="mcq-option-explanation">
              <strong>Why your answer is incorrect:</strong>{' '}
              {question.options[selectedIndex!].explanationDetail}
            </p>
          )}
          
          <div class="mcq-explanation">
            <h4>Explanation</h4>
            <PortableText value={question.explanation} />
          </div>
          
          {question.sourceArticle && (
            <a href={`/en/blog/${question.sourceArticle.slug}`} class="mcq-source-link">
              Read source article: {question.sourceArticle.title} →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
```

```css
/* MCQ component styles using brand tokens */
.mcq-question {
  background: var(--bg-card);
  border: 1px solid var(--rule-strong);
  padding: 32px;
  margin: 32px 0;
  font-family: var(--sans);
}

.mcq-meta {
  display: flex;
  gap: 24px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--rule);
}

.mcq-topic {
  font-family: var(--mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--accent);
}

.mcq-difficulty {
  font-size: 12px;
  letter-spacing: 0.2em;
  color: var(--ink-3);
}

.mcq-previous {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-3);
  margin-left: auto;
}

.mcq-stem {
  font-size: 16px;
  line-height: 1.6;
  color: var(--ink);
  margin-bottom: 24px;
}

.mcq-options {
  border: none;
  padding: 0;
  margin: 0 0 24px;
}

.mcq-option {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--rule);
  background: var(--bg);
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.mcq-option input[type="radio"] {
  position: absolute;
  opacity: 0;
}

.mcq-option:hover:not(.correct):not(.incorrect):not(.correct-not-selected) {
  border-color: var(--ink-2);
}

.mcq-option.selected {
  border-color: var(--ink);
  background: var(--bg-deep);
}

.mcq-option.correct {
  border-color: #2A8856;
  background: #F0F8F4;
}

.mcq-option.incorrect {
  border-color: var(--accent);
  background: #FBF5F2;
}

.mcq-option.correct-not-selected {
  border-color: #2A8856;
  background: #F8FBFA;
  border-style: dashed;
}

.mcq-option-marker {
  font-family: var(--mono);
  font-weight: 500;
  color: var(--accent);
  min-width: 24px;
}

.mcq-option-text {
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
}

.mcq-option-icon {
  font-size: 16px;
  font-weight: 600;
}

.mcq-option.correct .mcq-option-icon { color: #2A8856; }
.mcq-option.incorrect .mcq-option-icon { color: var(--accent); }

.mcq-actions {
  display: flex;
  gap: 12px;
}

.mcq-submit {
  padding: 12px 24px;
  background: var(--ink);
  color: var(--bg);
  border: 1px solid var(--ink);
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.mcq-submit:hover:not(:disabled) {
  background: var(--accent);
  border-color: var(--accent);
}

.mcq-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mcq-reset {
  padding: 12px 24px;
  background: transparent;
  color: var(--ink-2);
  border: 1px solid var(--ink-3);
  font-family: var(--sans);
  font-size: 14px;
  cursor: pointer;
}

.mcq-feedback {
  margin-top: 24px;
  padding: 24px;
  border-left: 3px solid;
}

.mcq-feedback.correct {
  border-left-color: #2A8856;
  background: #F0F8F4;
}

.mcq-feedback.incorrect {
  border-left-color: var(--accent);
  background: #FBF5F2;
}

.mcq-result-label {
  font-family: var(--mono);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  margin: 0 0 16px;
  font-weight: 500;
}

.mcq-feedback.correct .mcq-result-label { color: #2A8856; }
.mcq-feedback.incorrect .mcq-result-label { color: var(--accent); }

.mcq-option-explanation {
  font-size: 14px;
  line-height: 1.6;
  color: var(--ink-2);
  margin: 0 0 16px;
}

.mcq-explanation h4 {
  font-family: var(--serif);
  font-size: 16px;
  margin: 0 0 12px;
  color: var(--ink);
}

.mcq-explanation p {
  font-size: 14px;
  line-height: 1.6;
  color: var(--ink);
}

.mcq-source-link {
  display: inline-block;
  margin-top: 16px;
  font-size: 13px;
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid var(--accent);
  padding-bottom: 1px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## Progress dashboard — `/en/learn/progress`

```typescript
// src/components/interactive/MCQProgress.tsx
import { useState, useEffect } from 'preact/hooks';

export default function MCQProgress({ allQuestions }: { allQuestions: any[] }) {
  const [progress, setProgress] = useState<Record<string, any>>({});
  
  useEffect(() => {
    setProgress(JSON.parse(localStorage.getItem('mcq-progress') || '{}'));
  }, []);
  
  const stats = {
    totalAttempted: Object.keys(progress).length,
    totalCorrect: Object.values(progress).filter((p: any) => p.lastResult === 'correct').length,
    totalAvailable: allQuestions.length,
  };
  
  const byTopic = allQuestions.reduce((acc, q) => {
    if (!acc[q.topic]) acc[q.topic] = { total: 0, attempted: 0, correct: 0 };
    acc[q.topic].total++;
    if (progress[q._id]) {
      acc[q.topic].attempted++;
      if (progress[q._id].lastResult === 'correct') acc[q.topic].correct++;
    }
    return acc;
  }, {});
  
  function handleClearProgress() {
    if (confirm('Clear all progress? This cannot be undone.')) {
      localStorage.removeItem('mcq-progress');
      setProgress({});
    }
  }
  
  return (
    <div class="mcq-progress">
      <div class="progress-summary">
        <div class="progress-stat">
          <p class="stat-value">{stats.totalAttempted} / {stats.totalAvailable}</p>
          <p class="stat-label">Questions attempted</p>
        </div>
        <div class="progress-stat">
          <p class="stat-value">{stats.totalCorrect} / {stats.totalAttempted}</p>
          <p class="stat-label">Correct on last attempt</p>
        </div>
        {stats.totalAttempted > 0 && (
          <div class="progress-stat">
            <p class="stat-value">{Math.round((stats.totalCorrect / stats.totalAttempted) * 100)}%</p>
            <p class="stat-label">Accuracy</p>
          </div>
        )}
      </div>
      
      <h2>Progress by topic</h2>
      <div class="topic-progress">
        {Object.entries(byTopic).map(([topic, data]: [string, any]) => (
          <div class="topic-row">
            <p class="topic-name">{topic.replace(/-/g, ' ')}</p>
            <div class="progress-bar">
              <div 
                class="progress-bar-fill" 
                style={`width: ${(data.attempted / data.total) * 100}%`}
              />
            </div>
            <p class="topic-numbers">{data.correct}/{data.attempted} of {data.total}</p>
          </div>
        ))}
      </div>
      
      <div class="progress-actions">
        <a href="/en/learn" class="learn-link">Continue practising →</a>
        <button onClick={handleClearProgress} class="clear-button">
          Clear progress
        </button>
      </div>
      
      <p class="progress-note">
        Progress is stored locally in your browser. No account is required.
        Clearing browser data will reset your progress.
      </p>
    </div>
  );
}
```

---

## Question authoring workflow

For each new question:

1. **Author writes question in Sanity** with status `draft`
2. **Self-review for clinical accuracy** — author verifies correct answer against published literature
3. **Add citations to explanation** using citation marks (Feature 1 system)
4. **Send to peer reviewer** (another FEBHS-credentialed surgeon ideally)
5. **Peer reviewer suggests edits** in Sanity (uses comments or reverts)
6. **Author addresses feedback**, updates `reviewedBy` and `reviewDate` fields
7. **Set status to `published`** — question now live on site

The Sanity workflow supports multi-stage publishing via the status field. The Astro template only fetches questions with `reviewStatus === 'published'`.

---

## Tier 3 deferred: spaced repetition

The MVP version is "next unanswered question" simple progression. A spaced-repetition algorithm (SuperMemo SM-2 or similar) is conceptually a good fit but only justifies its complexity once the question bank exceeds ~200 questions. Defer to year 2+.

---

## Effort estimate

- **Sanity schema + workflow:** 4-6 hours
- **MCQQuestion Preact component + styles:** 8-10 hours
- **Progress dashboard component:** 4-6 hours
- **Astro page templates (/learn, /learn/[topic], /learn/progress):** 4-6 hours
- **Testing, accessibility, edge cases:** 2-4 hours

**Total infrastructure: 20-30 hours**

**Ongoing cost: question authoring** — plan ~1-2 hours per question for high-quality questions including peer review. Year 1 target ~50-100 questions = 50-200 hours of content authoring spread across the year. This is the real cost of this feature.
