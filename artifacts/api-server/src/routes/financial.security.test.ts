import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import {
  db,
  driverExpensesTable,
  driverGoalsTable,
  driverHoursTable,
} from "@workspace/db";
import { like } from "drizzle-orm";

vi.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuth: (req: { headers: Record<string, string | undefined> }) => ({
    userId: req.headers["x-test-user"] ?? null,
    sessionClaims: null,
  }),
}));

let app: typeof import("../app").default;
const suffix = Date.now().toString(36);
const userA = `financial-A-${suffix}`;
const userB = `financial-B-${suffix}`;
const expenseId = `expense-${suffix}`;
const hourId = `hour-${suffix}`;

beforeAll(async () => {
  app = (await import("../app")).default;
});

afterAll(async () => {
  await db.delete(driverExpensesTable).where(like(driverExpensesTable.id, `%${suffix}%`));
  await db.delete(driverHoursTable).where(like(driverHoursTable.id, `%${suffix}%`));
  await db.delete(driverGoalsTable).where(like(driverGoalsTable.id, `%${suffix}%`));
});

describe("financial endpoint authentication", () => {
  it("rejects unauthenticated expense, hours, and goals requests", async () => {
    await request(app).get("/api/expenses").expect(401);
    await request(app).post("/api/expenses").send({ expense: { id: expenseId, date: "2026-08-30" } }).expect(401);
    await request(app).put(`/api/expenses/${expenseId}`).send({ date: "2026-08-30" }).expect(401);
    await request(app).delete(`/api/expenses/${expenseId}`).expect(401);

    await request(app).get("/api/hours").expect(401);
    await request(app).post("/api/hours").send({ hour: { id: hourId, date: "2026-08-30" } }).expect(401);
    await request(app).put(`/api/hours/${hourId}`).send({ date: "2026-08-30" }).expect(401);
    await request(app).delete(`/api/hours/${hourId}`).expect(401);

    await request(app).get("/api/goals").expect(401);
    await request(app).put("/api/goals").send({ dailyGoal: 500 }).expect(401);
  });
});

describe("financial endpoint ownership", () => {
  it("isolates expense create, list, update, and delete", async () => {
    await request(app)
      .post("/api/expenses")
      .set("x-test-user", userA)
      .send({
        expense: {
          id: expenseId,
          date: "2026-08-30",
          category: "Vehicle & Fuel",
          vendor: "Test Fuel",
          amount: 42.15,
          note: "private A",
          verified: false,
          purpose: "business",
        },
      })
      .expect(200);

    const aList = await request(app).get("/api/expenses").set("x-test-user", userA).expect(200);
    expect(aList.body.expenses).toContainEqual(expect.objectContaining({ id: expenseId, note: "private A" }));

    const bList = await request(app).get("/api/expenses").set("x-test-user", userB).expect(200);
    expect(bList.body.expenses.some((expense: { id: string }) => expense.id === expenseId)).toBe(false);
    await request(app).delete(`/api/expenses/${expenseId}`).set("x-test-user", userB).expect(404);

    await request(app)
      .put(`/api/expenses/${expenseId}`)
      .set("x-test-user", userA)
      .send({ date: "2026-08-30", category: "Vehicle & Fuel", vendor: "Test Fuel", amount: 45, note: "updated A" })
      .expect(200);
    const updated = await request(app).get("/api/expenses").set("x-test-user", userA).expect(200);
    expect(updated.body.expenses).toContainEqual(expect.objectContaining({ id: expenseId, amount: 45, note: "updated A" }));

    await request(app).delete(`/api/expenses/${expenseId}`).set("x-test-user", userA).expect(200);
  });

  it("isolates hours create, list, update, and delete", async () => {
    await request(app)
      .post("/api/hours")
      .set("x-test-user", userA)
      .send({
        hour: {
          id: hourId,
          date: "2026-08-30",
          hours: 8.25,
          clockIn: "2026-08-30T12:00:00.000Z",
          clockOut: "2026-08-30T20:30:00.000Z",
          breakMs: 900000,
          miles: 120.5,
        },
      })
      .expect(200);

    const aList = await request(app).get("/api/hours").set("x-test-user", userA).expect(200);
    expect(aList.body.hours).toContainEqual(expect.objectContaining({ id: hourId, hours: 8.25 }));

    const bList = await request(app).get("/api/hours").set("x-test-user", userB).expect(200);
    expect(bList.body.hours.some((entry: { id: string }) => entry.id === hourId)).toBe(false);
    await request(app).delete(`/api/hours/${hourId}`).set("x-test-user", userB).expect(404);

    await request(app)
      .put(`/api/hours/${hourId}`)
      .set("x-test-user", userA)
      .send({
        date: "2026-08-30",
        hours: 8.5,
        clockIn: "2026-08-30T12:00:00.000Z",
        clockOut: "2026-08-30T20:45:00.000Z",
        breakMs: 900000,
      })
      .expect(200);
    const updated = await request(app).get("/api/hours").set("x-test-user", userA).expect(200);
    expect(updated.body.hours).toContainEqual(expect.objectContaining({ id: hourId, hours: 8.5 }));

    await request(app).delete(`/api/hours/${hourId}`).set("x-test-user", userA).expect(200);
  });

  it("isolates each user's single goals row", async () => {
    await request(app)
      .put("/api/goals")
      .set("x-test-user", userA)
      .send({
        goals: {
          dailyGoal: 650,
          workDays: [1, 3, 5],
          dayTargets: { 1: 700 },
          recurringPlan: { enabled: true, workDays: [1], dayTargets: { 1: 700 }, untilDate: "2026-12-31" },
          weekOverrides: { "2026-08-31": { workDays: [2], dayTargets: { 2: 800 } } },
        },
      })
      .expect(200);

    const aGoals = await request(app).get("/api/goals").set("x-test-user", userA).expect(200);
    expect(aGoals.body.goals).toEqual(expect.objectContaining({ dailyGoal: 650, workDays: [1, 3, 5] }));

    const bGoals = await request(app).get("/api/goals").set("x-test-user", userB).expect(200);
    expect(bGoals.body.goals).toBeNull();
  });
});