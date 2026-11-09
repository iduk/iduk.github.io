import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import images from './content/images.json';
import { createProjectSchema, imageEntrySchema, tagSchema } from './lib/schema';

// 이미지 블록은 images.json 키만 참조할 수 있다. 없는 키면 sync·build가 실패한다.
const projects = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/projects' }),
  schema: createProjectSchema(new Set(Object.keys(images))),
});

const tags = defineCollection({
  loader: file('src/content/tags.json'),
  schema: tagSchema,
});

const imageMeta = defineCollection({
  loader: file('src/content/images.json'),
  schema: imageEntrySchema,
});

export const collections = { projects, tags, images: imageMeta };
