// studio/schemas/index.ts
import { author } from './author';
import { article } from './article';
import { procedurePage } from './procedurePage';
import { reference } from './reference';
import { glossaryTerm } from './glossaryTerm';
import { mcqQuestion } from './mcqQuestion';
import { calculator } from './calculator';
import { podcastEpisode } from './podcastEpisode';

export const schemaTypes = [
  author,
  article,
  procedurePage,
  reference,
  glossaryTerm,
  mcqQuestion,
  calculator,
  podcastEpisode,
];
