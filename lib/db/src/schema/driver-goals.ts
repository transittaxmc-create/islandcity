import { index, jsonb, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

export const driverGoalsTable = pgTable("driver_goals", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  dailyGoal: jsonb("daily_goal").notNull().default(400),
  workDays: jsonb("work_days").notNull().default([1, 2, 3, 4, 5]),
  dayTargets: jsonb("day_targets").notNull().default({}),
  recurringPlan: jsonb("recurring_plan").notNull().default({
    enabled: false,
    workDays: [],
    dayTargets: {},
    untilDate: "",
  }),
  weekOverrides: jsonb("week_overrides").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("driver_goals_user_id_idx").on(table.userId),
]);

export type DriverGoal = typeof driverGoalsTable.$inferSelect;
export type InsertDriverGoal = typeof driverGoalsTable.$inferInsert;