# Everest coding challenge brief — Q&A (quiz)

The PDF *Inventory Reservation System Everest Coding challenge* is a scenario overview, not a multiple-choice sheet. Below are the answers you would give if quizzed on that brief.

**Why does this system matter in the real world?**  
Flash sales drive extreme traffic. For **limited stock** products, **many users click “Buy” at the same time**. Without proper design, the system can **oversell** (sell more units than exist).

**What is the core problem (in four ideas)?**  
1) Only **one** unit left in stock. 2) **Many** simultaneous requests (e.g. 500 users). 3) **Without** concurrency control, several requests can each think they reserved the item. 4) **Result:** overselling.

**What are the four challenge objectives?**  
**01** Prevent overselling. **02** Handle concurrent requests correctly. **03** Manage **temporary** reservations (holds). **04** Keep inventory state **consistent** end-to-end.

**How does “inventory reservation” work in one line?**  
A user **reserves** an item (inventory is **locked** for them), then **confirms** or **cancels**; if neither happens in time, the hold **auto-releases** on expiry.

**What hold duration does the brief specify?**  
**2 minutes.** After that, expired reservations should **automatically** release inventory back.

**What is the availability / available-stock formula in the brief?**  
**Available stock = Total stock − Confirmed sales − Active reservations.**

**What must happen if a reservation would exceed available stock?**  
The request must **fail** (reject the reservation).

**Can a confirmed purchase be undone in the rules?**  
**No.** Confirmed purchases **cannot** be reversed.

**How many users can reserve the last remaining unit?**  
**Only one** user should successfully reserve that last item; competing attempts should fail.

**What should happen when a reservation expires?**  
Inventory is **released automatically** (the hold is no longer counted against availability).

**What does Level 1 require?**  
Basic reservation: keep inventory **in memory**, implement **reserve**, and **reject** when stock is unavailable.

**What does Level 2 add (lifecycle)?**  
States such as **Active**, **Confirmed**, **Cancelled**, and **Expired**; **hold for 2 minutes**; **Confirm** means purchase completed; **Cancel** or **expiry** releases inventory. Example: stock = 1 → User A succeeds, User B fails.

**What is Level 3 about?**  
**Concurrency handling** so **race conditions** don’t break the rules. Example techniques named in the brief: **mutex/locks**, **atomic operations**, **thread-safe structures** (in a distributed service this is often expressed as atomic counters, single-threaded Lua, DB constraints, etc.).

**What is the Level 3 test scenario and expected outcome?**  
**Stock = 1**, **500** simultaneous reservation attempts → **exactly 1** success and **499** failures.

**How should you test and what will evaluators look for?**  
**Tests:** unit tests for reservation logic; **concurrency** tests with **parallel** requests. **Evaluation:** correctness, concurrency handling, **expiry** logic, code quality, and a **clear explanation of your locking / concurrency strategy**. Estimated time on the brief: **2–3 hours**.
