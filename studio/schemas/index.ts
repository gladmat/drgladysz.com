// studio/schemas/index.ts
import { author } from './author';
import { article } from './article';
import { procedurePage } from './procedurePage';
import { bibReference } from './bibReference';
import { glossaryTerm } from './glossaryTerm';
import { calculator } from './calculator';
import { podcastEpisode } from './podcastEpisode';
import { callout } from './callout';

// FESSH MCQ schemas — consumed by the learn.drgladysz.com sub-application.
// They live in this studio (alongside the main-site schemas) so authoring
// happens in one place, even though they're rendered by a separate Astro
// app. See learn/src/lib/sanity.ts for the consumer.
import { fesshReference } from './fesshReference';
import { fesshMcq } from './fesshMcq';
import { fesshStatement } from './fesshStatement';
import { fesshMcqMetadata } from './fesshMcqMetadata';
import { fesshMockExam } from './fesshMockExam';

export const schemaTypes = [
  // Main-site documents
  author,
  article,
  procedurePage,
  bibReference,
  glossaryTerm,
  calculator,
  podcastEpisode,
  // Sub-app documents (learn.drgladysz.com)
  fesshReference,
  fesshMcq,
  fesshMockExam,
  // Shared object types
  callout,
  fesshStatement,
  fesshMcqMetadata,
];
