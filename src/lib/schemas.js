const { z } = require('zod');
const imageUnderstandingSchema = z.object({
  subject: z.string().min(1).max(120),
  category: z.string().min(1).max(60),
  attributes: z.array(z.string().min(1).max(80)).max(20),
  caption: z.string().min(5).max(500),
  confidence: z.number().min(0).max(1)
}).strict();
const createPostSchema = z.object({
  title: z.string().trim().min(3).max(180),
  content: z.string().trim().min(10).max(10000),
  expected_category: z.string().trim().max(60).optional().nullable(),
  expected_subject: z.string().trim().max(120).optional().nullable()
});
const imageUrlSchema = z.object({ image_url: z.string().url(), filename: z.string().max(180).optional() });
module.exports = { imageUnderstandingSchema, createPostSchema, imageUrlSchema };
