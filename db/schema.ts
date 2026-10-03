import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const priorityPreview = sqliteTable('priority_preview', {
  mode: text('mode').primaryKey().notNull(),
  draftJson: text('draft_json').notNull(),
  updatedAt: text('updated_at').notNull(),
});
export const adminSkills = sqliteTable('admin_skills', {
  job: text('job').primaryKey().notNull(),
  reviewJson: text('review_json').notNull(),
  updatedAt: text('updated_at').notNull(),
});
