import type { ImageMetadata } from 'astro';
import images from '../content/images.json';

const masters = import.meta.glob<{ default: ImageMetadata }>('/src/assets/images/**/*.webp', {
  eager: true,
});

export type ImageEntry = (typeof images)[keyof typeof images];

/** images.json 키(`<post-slug>/<NN>-<slug>`)로 WebP 마스터와 기록된 크기·평균색을 찾는다. */
export function resolveImage(key: string): { entry: ImageEntry; master: ImageMetadata } {
  const entry = (images as Record<string, ImageEntry>)[key];
  if (!entry) throw new Error(`unknown image key "${key}"`);
  const mod = masters[entry.src];
  if (!mod) throw new Error(`master file missing for "${key}" (${entry.src})`);
  return { entry, master: mod.default };
}
