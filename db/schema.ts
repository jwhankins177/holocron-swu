import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const workspaces = sqliteTable('workspaces', {
 userId: text('user_id').primaryKey(),
 payload: text('payload').notNull(),
 revision: integer('revision').notNull().default(1),
 updatedAt: text('updated_at').notNull(),
});

// Shared catalog snapshots and public news; never stores user collections.
export const catalogCache = sqliteTable('catalog_cache', {
 key: text('key').primaryKey(),
 payload: text('payload').notNull(),
 updatedAt: text('updated_at').notNull(),
});
