---
name: Toll entry workflow
description: Product boundary between automatic Daily Entry toll capture and manual Queue/Register corrections.
---

Daily Entry must detect toll crossings automatically by GPS. One or multiple crossings are summed into TOLL REIMB., and Notes lists every plaza and its individual charge. Do not add per-crossing manual controls to Daily Entry or alter its canonical field placement and appearance.

Manual toll correction belongs only after the transaction is saved as pending in Queue/Register. There the driver may add a missed crossing, rename or change an existing crossing, or remove one; the toll total and managed Notes breakdown must update together.

**Why:** Manual controls inside Daily Entry duplicate the pending-transaction correction workflow and blur the distinction between automatic collection and later review.

**How to apply:** Preserve GPS capture and multi-toll accumulation during entry. Put any detailed toll editor exclusively in Queue/Register editing before posting to Ledger.