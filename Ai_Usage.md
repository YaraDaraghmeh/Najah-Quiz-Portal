# AI Usage

I used AI heavily on this project, as the brief expects. This file says which tools I used, how I directed them, and how I checked the results.

## Tools

* **Google AI Studio**: generated the base application. Its output was the best of the three, so I built on it.
* **Replit**: same prompt, used for comparison. Not kept.
* **Claude**: same prompt, used for comparison, and TODO: say if you also used it later (reviewing, fixing, tests, docs).

## How I worked

1. **Prompt first.** I wrote one detailed prompt from the brief. It contained the client message, numbered hard rules (server-authoritative timer, correct answers never sent before submission, lazy auto-finalising of abandoned attempts, per-route authorization against IDOR, one pure scoring function with the score floored at 0, no question edits once attempts exist, rate limiting and zod validation), features per role, Arabic/RTL and mobile rules, seed data, required tests, deliverables, and eight stages to commit one at a time. The prompt is committed at `initial-prompt.md`.
2. **Compared three tools.** I gave the same prompt to Google AI Studio, Replit and Claude and compared the results. Google AI Studio's was the best. TODO: one line on why (structure, working timer, RTL, etc.).
3. **Took over the code.** I downloaded the AI Studio project and worked on it myself, with AI help for individual changes:

   * reorganised the file structure
   * deleted files and code the app did not need
   * added features the generated version lacked, such as **deleting and updating users**
4. **Committed as I went**, so the history shows the work after the initial generation.

## How I checked the output

* Automated Vitest tests for scoring (per-question points, negative marking, zero floor) and server-side timer enforcement. TODO: update the test count and add any others.
* Read the generated code before keeping it, and removed what I did not understand or need.
* Tried to break it by hand. TTODO: how you checked phone layout and Arabic/RTL.

## Where the AI got things wrong

* **Missing features.** The generated version had no way to delete or update users, so I added it.

## 

