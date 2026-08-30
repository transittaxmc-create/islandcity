import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, driverGoalsTable } from "@workspace/db";
import { authenticatedUserId, requireAuth } from "../middlewares/requireAuth";

const goalsRouter = Router();
goalsRouter.use("/goals", requireAuth);

type GoalsPayload = {
  dailyGoal: number;
  workDays: number[];
  dayTargets: Record<number, number>;
  recurringPlan: {
    enabled: boolean;
    workDays: number[];
    dayTargets: Record<number, number>;
    untilDate: string;
  };
  weekOverrides: Record<string, { workDays: number[]; dayTargets: Record<number, number> }>;
};

const defaults: GoalsPayload = {
  dailyGoal: 400,
  workDays: [1, 2, 3, 4, 5],
  dayTargets: {},
  recurringPlan: { enabled: false, workDays: [], dayTargets: {}, untilDate: "" },
  weekOverrides: {},
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const finiteNonnegative = (value: unknown, fallback: number) => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
};

const dayNumberMap = (value: unknown): Record<number, number> => {
  const source = asRecord(value);
  if (!source) return {};
  return Object.fromEntries(Object.entries(source)
    .filter(([key, item]) => /^[1-7]$/.test(key) && Number.isFinite(Number(item)) && Number(item) >= 0)
    .map(([key, item]) => [Number(key), finiteNonnegative(item, 0)]));
};

const workDayList = (value: unknown, fallback: number[]) =>
  Array.isArray(value)
    ? value.filter(item => Number.isInteger(item) && item >= 1 && item <= 7)
    : fallback;

function normalizeGoals(input: unknown): GoalsPayload {
  const source = asRecord(input) ?? {};
  const recurring = asRecord(source.recurringPlan) ?? {};
  const overridesSource = asRecord(source.weekOverrides) ?? {};
  const weekOverrides = Object.fromEntries(Object.entries(overridesSource).map(([week, item]) => {
    const override = asRecord(item) ?? {};
    return [week, {
      workDays: workDayList(override.workDays, []),
      dayTargets: dayNumberMap(override.dayTargets),
    }];
  }));
  return {
    dailyGoal: finiteNonnegative(source.dailyGoal, defaults.dailyGoal),
    workDays: workDayList(source.workDays, defaults.workDays),
    dayTargets: dayNumberMap(source.dayTargets),
    recurringPlan: {
      enabled: recurring.enabled === true,
      workDays: workDayList(recurring.workDays, []),
      dayTargets: dayNumberMap(recurring.dayTargets),
      untilDate: typeof recurring.untilDate === "string" ? recurring.untilDate : "",
    },
    weekOverrides,
  };
}

const serializeGoals = (row: typeof driverGoalsTable.$inferSelect): GoalsPayload => ({
  dailyGoal: finiteNonnegative(row.dailyGoal, defaults.dailyGoal),
  workDays: workDayList(row.workDays, defaults.workDays),
  dayTargets: dayNumberMap(row.dayTargets),
  recurringPlan: normalizeGoals({
    recurringPlan: row.recurringPlan,
  }).recurringPlan,
  weekOverrides: normalizeGoals({
    weekOverrides: row.weekOverrides,
  }).weekOverrides,
});

goalsRouter.get("/goals", async (req, res) => {
  const userId = authenticatedUserId(req);
  try {
    const [row] = await db
      .select()
      .from(driverGoalsTable)
      .where(eq(driverGoalsTable.userId, userId))
      .limit(1);
    res.json({ ok: true, goals: row ? serializeGoals(row) : null });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

goalsRouter.put("/goals", async (req, res) => {
  const userId = authenticatedUserId(req);
  const body = asRecord(req.body);
  const goals = normalizeGoals(body?.goals ?? req.body);
  try {
    const [saved] = await db
      .insert(driverGoalsTable)
      .values({
        id: userId,
        userId,
        dailyGoal: goals.dailyGoal,
        workDays: goals.workDays,
        dayTargets: goals.dayTargets,
        recurringPlan: goals.recurringPlan,
        weekOverrides: goals.weekOverrides,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: driverGoalsTable.id,
        set: {
          dailyGoal: goals.dailyGoal,
          workDays: goals.workDays,
          dayTargets: goals.dayTargets,
          recurringPlan: goals.recurringPlan,
          weekOverrides: goals.weekOverrides,
          updatedAt: new Date(),
        },
      })
      .returning();
    res.json({ ok: true, goals: saved ? serializeGoals(saved) : goals, updatedAt: saved?.updatedAt });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default goalsRouter;