import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { db, driverBackupsTable, driverTripsTable, scannedDocumentsTable } from "@workspace/db";
import { eq, like } from "drizzle-orm";

vi.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuth: (req: { headers: Record<string, string | undefined> }) => ({
    userId: req.headers["x-test-user"] ?? null,
    sessionClaims: null,
  }),
}));

let app: typeof import("../app").default;
const suffix = Date.now().toString(36);
const tripId = `security-${suffix}`;

beforeAll(async () => {
  app = (await import("../app")).default;
});

afterAll(async () => {
  await db.delete(driverTripsTable).where(like(driverTripsTable.id, `%security-${suffix}%`));
  await db.delete(driverBackupsTable).where(eq(driverBackupsTable.userId, `security-A-${suffix}`));
  await db.delete(scannedDocumentsTable).where(eq(scannedDocumentsTable.userId, `security-A-${suffix}`));
});

describe("trip ownership", () => {
  it("rejects unauthenticated requests", async () => {
    await request(app).get("/api/trips").expect(401);
    await request(app).post("/api/trips").send({ id: tripId, date: "2026-08-29" }).expect(401);
    await request(app).delete(`/api/trips/${tripId}`).expect(401);
  });

  it("isolates reads, writes, and deletes by authenticated user", async () => {
    await request(app)
      .post("/api/trips")
      .set("x-test-user", "user_A")
      .send({ id: tripId, date: "2026-08-29", fare: 100, tip: 20 })
      .expect(200);

    const aList = await request(app).get("/api/trips").set("x-test-user", "user_A").expect(200);
    expect(aList.body.trips.some((trip: { id: string }) => trip.id === tripId)).toBe(true);

    const bList = await request(app).get("/api/trips").set("x-test-user", "user_B").expect(200);
    expect(bList.body.trips.some((trip: { id: string }) => trip.id === tripId)).toBe(false);

    await request(app).delete(`/api/trips/${tripId}`).set("x-test-user", "user_B").expect(404);
    await request(app).delete(`/api/trips/${tripId}`).set("x-test-user", "user_A").expect(200);
  });

  it("isolates backups by authenticated user", async () => {
    const userA = `security-A-${suffix}`;
    const userB = `security-B-${suffix}`;
    await request(app)
      .post("/api/backup")
      .set("x-test-user", userA)
      .send({ trips: [{ id: "private-A" }], expenses: [], hoursLog: [], settings: {} })
      .expect(200);

    const aLatest = await request(app).get("/api/backup/latest").set("x-test-user", userA).expect(200);
    expect(aLatest.body.backup.trips[0].id).toBe("private-A");

    const bLatest = await request(app).get("/api/backup/latest").set("x-test-user", userB).expect(200);
    expect(bLatest.body.backup).toBeNull();
  });

  it("isolates scanned-document listings by authenticated user", async () => {
    const userA = `security-A-${suffix}`;
    const userB = `security-B-${suffix}`;
    await db.insert(scannedDocumentsTable).values({
      userId: userA,
      type: "receipt",
      objectPath: `security/${suffix}.jpg`,
    });

    const aDocs = await request(app).get("/api/documents").set("x-test-user", userA).expect(200);
    expect(aDocs.body.documents.some((doc: { objectPath: string }) => doc.objectPath === `security/${suffix}.jpg`)).toBe(true);

    const bDocs = await request(app).get("/api/documents").set("x-test-user", userB).expect(200);
    expect(bDocs.body.documents.some((doc: { objectPath: string }) => doc.objectPath === `security/${suffix}.jpg`)).toBe(false);
  });
});