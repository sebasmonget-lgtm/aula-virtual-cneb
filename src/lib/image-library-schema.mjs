import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/u);
const terms = z.array(z.string().trim().min(2)).min(1);
const relativeImage = z.string().regex(/^[a-z0-9_/-]+\.(?:jpg|png)$/u);

export const imageMetadataSchema = z.object({
  id: slug,
  file: relativeImage,
  master: relativeImage,
  title: z.string().trim().min(8),
  category: slug,
  subcategory: slug,
  characters: z.array(slug).min(1),
  concepts: terms,
  actions: terms,
  objects: terms,
  contexts: terms,
  age_range: z.array(z.union([z.literal(3), z.literal(4), z.literal(5)])).min(1),
  orientation: z.literal("landscape"),
  aspect_ratio: z.enum(["3:2", "4:3"]),
  has_text: z.literal(false),
  country_context: z.literal("PE"),
  variant: z.number().int().positive(),
  priority: z.number().int().min(1).max(10),
}).strict();

export const characterRegistrySchema = z.object({
  version: z.literal(1),
  characters: z.record(slug, z.object({
    name: z.string().trim().min(2),
    reference: relativeImage,
    description: z.string().trim().min(20),
  }).strict()),
}).strict();

export const imageIndexSchema = z.object({
  version: z.literal(1),
  images: z.array(imageMetadataSchema),
}).strict();
