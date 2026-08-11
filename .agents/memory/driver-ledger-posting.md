---
name: Driver ledger posting rule
description: The product's accounting workflow for trip capture, reconciliation, and closing.
---

Pending trips are fast, editable captures. The next-day reconciliation step fills in invoice/payment details such as gross fare, tip, toll, platform fee, adjustments, and notes. Only Reconciled and Closed trips are posted to the Financial Statement; Closed trips are locked.

**Why:** The driver needs to record trips immediately without waiting for invoice and payment information, while keeping financial reporting accurate and preventing closed books from changing.

**How to apply:** Keep the Register and Financial Statement as separate concepts in future changes. New trip entries start Pending, status moves forward through Reconciled to Closed, and statement calculations must filter out Pending trips.