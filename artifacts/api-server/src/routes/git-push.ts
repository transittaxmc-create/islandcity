import { Router } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);
const gitPushRouter = Router();

// Simple in-memory rate-limit: one push per 10 minutes max
let lastPushAt = 0;
const MIN_INTERVAL_MS = 10 * 60 * 1000;

function errorOutput(err: unknown): string {
  if (!err || typeof err !== "object") return String(err);
  const candidate = err as { message?: unknown; stdout?: unknown; stderr?: unknown };
  return [candidate.message, candidate.stdout, candidate.stderr]
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join("\n");
}

function isNonFastForwardPush(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("fetch first") ||
    normalized.includes("non-fast-forward") ||
    normalized.includes("rejected") && normalized.includes("remote contains work")
  );
}

// POST /api/git-push — push latest code to GitHub
gitPushRouter.post("/git-push", async (_req, res) => {
  const pat = process.env.GITHUB_PAT;
  if (!pat) {
    return res.status(503).json({ ok: false, error: "GITHUB_PAT secret not configured" });
  }

  const now = Date.now();
  if (now - lastPushAt < MIN_INTERVAL_MS) {
    const waitSec = Math.ceil((MIN_INTERVAL_MS - (now - lastPushAt)) / 1000);
    return res.json({ ok: true, skipped: true, reason: `Rate-limited — wait ${waitSec}s` });
  }

  const repoUrl = `https://${pat}@github.com/transittaxmc-create/islandcity.git`;
  const workspaceRoot = path.resolve("/home/runner/workspace");

  try {
    // Stage all changes and commit if there's anything new
    await execAsync("git add -A", { cwd: workspaceRoot });
    const { stdout: diffStat } = await execAsync("git status --porcelain", { cwd: workspaceRoot });
    if (diffStat.trim()) {
      const ts = new Date().toISOString().slice(0, 16).replace("T", " ");
      await execAsync(`git commit -m "Auto-backup ${ts}"`, { cwd: workspaceRoot });
    }

    // Push to the configured main branch first. If GitHub's main has commits
    // that are not in this workspace, never force-push over them: preserve the
    // complete local snapshot in a new backup branch instead.
    let stdout = "";
    let stderr = "";
    let backupBranch: string | undefined;
    try {
      ({ stdout, stderr } = await execAsync(
        `git push "${repoUrl}" main`,
        { cwd: workspaceRoot, timeout: 30000 }
      ));
    } catch (pushError: unknown) {
      const pushMessage = errorOutput(pushError);
      if (!isNonFastForwardPush(pushMessage)) throw pushError;

      const branchSuffix = new Date().toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}Z$/, "Z")
        .replace("T", "-")
        .replace("Z", "");
      backupBranch = `replit-backup/${branchSuffix}`;
      ({ stdout, stderr } = await execAsync(
        `git push "${repoUrl}" HEAD:refs/heads/${backupBranch}`,
        { cwd: workspaceRoot, timeout: 30000 }
      ));
    }

    lastPushAt = Date.now();
    const msg = stdout || stderr || "Push complete";
    return res.json({
      ok: true,
      message: backupBranch
        ? `Main branch was ahead; snapshot saved to ${backupBranch}. ${msg.trim()}`
        : msg.trim(),
      branch: backupBranch ?? "main",
      pushedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = errorOutput(err);
    // Sanitize PAT from error message before returning
    const safe = message.replace(pat, "***");
    return res.status(500).json({ ok: false, error: safe });
  }
});

// GET /api/git-push/status — last push time
gitPushRouter.get("/git-push/status", (_req, res) => {
  res.json({
    ok: true,
    lastPushAt: lastPushAt ? new Date(lastPushAt).toISOString() : null,
    githubConfigured: !!process.env.GITHUB_PAT,
  });
});

export default gitPushRouter;
