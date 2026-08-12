---
name: IRS Statement implementation
description: How the IRS print statement is built to avoid TSX parser issues
---

`handlePrintIRSStatement` is defined AFTER `expensesAll` and `netAll` (line order matters for const temporal dead zone).

**Why string concatenation:** TSX/Babel parser gets confused by `<` characters inside template literals — it tries to parse them as JSX opening tags. Nested template literals (backtick inside backtick) make this worse. Solution: use `Array.join('')` and string concatenation instead of template literals for HTML generation.

**How to apply:** Any function inside a React component that builds HTML strings should avoid template literals with bare `<` characters. Use `.join('')` on an array of strings or explicit string concatenation instead.

**Output:** Opens in a new window (`window.open('','_blank')`) then triggers `window.print()` after 400ms delay to allow the DOM to render.
