import { z } from 'zod';

/** 사람이 읽는 필드. 두 언어 모두 실제 내용이 있어야 한다. */
export const L = z.object({
  ko: z.string().trim().min(1),
  en: z.string().trim().min(1),
});
export type LText = z.infer<typeof L>;

const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const slug = z.string().regex(SLUG);
const periodPoint = z.string().regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/);

export const tagSchema = z.object({
  id: slug,
  name: L,
  status: z.literal('draft-translation').optional(),
});

export const imageEntrySchema = z.object({
  src: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  avgColor: z.string().regex(/^#[0-9a-f]{6}$/),
  bytes: z.number().int().positive(),
  original: z.string().min(1),
});

/** images.json 키를 검사하는 프로젝트 스키마. 키 집합은 호출 쪽이 넘긴다. */
export function createProjectSchema(imageKeys: ReadonlySet<string>) {
  const image = z.string().refine((k) => imageKeys.has(k), {
    message: 'unknown image key (not in images.json)',
  });
  const picture = z.object({ image, alt: L });

  const block = z.discriminatedUnion('type', [
    z.object({ type: z.literal('image'), image, alt: L }),
    z.object({ type: z.literal('pair'), images: z.tuple([picture, picture]) }),
    z.object({ type: z.literal('longshot'), image, alt: L }),
    z.object({ type: z.literal('text'), body: L }),
    z.object({ type: z.literal('demo'), demo: slug }),
  ]);

  return z
    .object({
      slug,
      year: z.number().int().min(1990).max(2100),
      period: z.object({ start: periodPoint, end: periodPoint.optional() }).optional(),
      order: z.number().int().positive(),
      title: L,
      role: L,
      summary: L,
      tags: z.array(slug),
      featured: z.boolean(),
      cover: picture,
      blocks: z.array(block),
      demo: slug.optional(),
      legacy: z.object({
        id: z.number().int().positive(),
        path: z.string().regex(/^\/portfolio\/[^/]+\/$/),
        slug: z.string().min(1).optional(),
      }),
      status: z.literal('draft-translation').optional(),
    })
    .superRefine((p, ctx) => {
      for (const [i, b] of p.blocks.entries()) {
        if (b.type === 'demo' && b.demo !== p.demo) {
          ctx.addIssue({
            code: 'custom',
            path: ['blocks', i, 'demo'],
            message: 'demo block must match project.demo',
          });
        }
      }
    });
}

export type Project = z.infer<ReturnType<typeof createProjectSchema>>;
export type Block = Project['blocks'][number];
