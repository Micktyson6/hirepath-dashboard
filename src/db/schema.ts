import { pgTable, uuid, varchar, text, integer, timestamp, index } from 'drizzle-orm/pg-core';

export const candidates = pgTable('candidates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  skills: text('skills').notNull(), // JSON string of skills array
  resumeLink: varchar('resume_link', { length: 500 }),
  experience: integer('experience').notNull().default(0), // years of experience
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, inactive, archived
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  statusIdx: index('status_idx').on(table.status),
  experienceIdx: index('experience_idx').on(table.experience),
}));

export type Candidate = typeof candidates.$inferSelect;
export type NewCandidate = typeof candidates.$inferInsert;