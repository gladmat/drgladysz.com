// studio/schemas/index.ts
import { author } from './author';
import { article } from './article';
import { procedurePage } from './procedurePage';
import { bibReference } from './bibReference';
import { glossaryTerm } from './glossaryTerm';
import { mcqQuestion } from './mcqQuestion';
import { calculator } from './calculator';
import { podcastEpisode } from './podcastEpisode';
import { callout } from './callout';

export const schemaTypes = [
  // Documents
  author,
  article,
  procedurePage,
  bibReference,
  glossaryTerm,
  mcqQuestion,
  calculator,
  podcastEpisode,
  // Shared object types
  callout,
];
