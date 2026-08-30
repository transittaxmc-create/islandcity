import { boolean, index, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

export const driverExpensesTable = pgTable("driver_expenses", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  date: text("date").notNull(),
  category: text("category").notNull(),
  vendor: text("vendor").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2, mode: "number" }).notNull(),
  note: text("note").notNull().default(""),
  type: text("type"),
  verified: boolean("verified").notNull().default(false),
  frequency: text("frequency"),
  dueDate: text("due_date"),
  endDate: text("end_date"),
  receiptDocId: integer("receipt_doc_id"),
  purpose: text("purpose"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("driver_expenses_user_id_idx").on(table.userId),
]);

export type DriverExpense = typeof driverExpensesTable.$inferSelect;
export type InsertDriverExpense = typeof driverExpensesTable.$inferInsert;