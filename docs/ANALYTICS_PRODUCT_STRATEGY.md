# InsightFlow — Analytics Product Strategy

**Role:** Product Manager + Data Strategist  
**Context:** SaaS for CrossFit gyms; existing features: workouts CRUD, analytics summary, occupancy heatmap, member ranking, mobile app, web dashboard.  
**Goal:** Identify the highest-value analytics features for gym owners and prioritize build order.

---

## 1. Ten Highest-Value Analytics Features

| # | Feature | One-line description |
|---|--------|------------------------|
| 1 | **Churn risk (at-risk members)** | List members whose attendance dropped sharply (e.g. last 30d vs prior 30d); flag “at risk” for retention outreach. |
| 2 | **Revenue vs attendance** | Link subscription/payment status to attendance; show revenue per active member, MRR, and at-risk revenue (members who pay but rarely show). |
| 3 | **Class profitability** | Per-class or per-time-slot view: attendance, capacity utilization, and (when available) revenue or cost to judge which slots to keep or cut. |
| 4 | **Retention funnel** | Cohort view: e.g. “members who had first check-in in month X” and % still active 30/60/90 days later; show drop-off by cohort. |
| 5 | **Attendance trends & goals** | Time series of total check-ins (and optionally per member) with simple goals (e.g. “+5% vs last period”) and alerts when trend turns negative. |
| 6 | **Peak vs off-peak utilization** | Clear split of occupancy and revenue (if applicable) for peak vs off-peak slots to support pricing (e.g. premium peak, discounts off-peak). |
| 7 | **Coach / class performance** | If classes are linked to coach (future schema): attendance and satisfaction by coach/class to support scheduling and development. |
| 8 | **New vs returning member mix** | Count of first-time check-ins vs returning; trend over time to see if growth is from new signups or better retention. |
| 9 | **Capacity planning** | Recommendation: “add a class on Wed 18h” or “reduce capacity on Fri 12h” based on historical occupancy and waitlist (if captured). |
| 10 | **Member lifetime value (LTV) view)** | For each member (or segment): months active, total check-ins, total paid (from Payment/Subscription); simple LTV and “best members” list. |

---

## 2. Impact vs Implementation Complexity

**Impact:** value for gym owner (revenue, retention, capacity, decisions).  
**Complexity:** data model changes, backend logic, frontend, and ongoing maintenance.

| Feature | Impact (1–5) | Complexity (1–5) | Notes |
|---------|----------------|-------------------|--------|
| Churn risk (at-risk members) | 5 | 2 | Compare two windows of attendance; no new tables. |
| Revenue vs attendance | 5 | 3 | Join User ↔ Payment/Subscription; need userId linkage if missing. |
| Class profitability | 4 | 2 | Attendance + Class already there; add simple revenue/cost later. |
| Retention funnel (cohorts) | 5 | 4 | First-check-in date, then activity in 30/60/90d; more logic + UI. |
| Attendance trends & goals | 4 | 2 | Extend existing series; add target and % change. |
| Peak vs off-peak utilization | 4 | 2 | Tag slots by peak/off-peak; reuse occupancy logic. |
| Coach / class performance | 4 | 4 | Needs coach on Class or new model; then aggregate by coach. |
| New vs returning mix | 3 | 2 | “First attendance ever” vs “had attendance before”; simple query. |
| Capacity planning | 4 | 3 | Rules on top of occupancy + optional waitlist; some heuristics. |
| Member LTV view | 4 | 3 | Join User, Attendance counts, Payment/Subscription totals. |

**Rough 2×2:**

- **High impact, lower complexity:** Churn risk, Class profitability, Attendance trends & goals, Peak vs off-peak, New vs returning mix.  
- **High impact, higher complexity:** Revenue vs attendance, Retention funnel, Coach performance, Capacity planning, Member LTV.

---

## 3. Suggested Build Order

Recommended sequence to maximize value and reuse, and to reduce risk:

| Phase | Feature | Why first / next |
|-------|---------|-------------------|
| **1** | **Churn risk (at-risk members)** | Highest impact, low complexity; uses only Attendance + User; immediate retention actions. |
| **2** | **Attendance trends & goals** | Extends current summary/series; quick win; gives “are we growing?” at a glance. |
| **3** | **Class profitability** | Reuses Class + Attendance; helps decide which classes to keep or promote. |
| **4** | **New vs returning member mix** | Simple query; supports marketing (“we’re gaining new people”) and retention focus. |
| **5** | **Revenue vs attendance** | Requires Payment/Subscription ↔ User linkage; unlocks “who pays but doesn’t show” and revenue per member. |
| **6** | **Peak vs off-peak utilization** | Reuses occupancy; supports pricing and schedule design. |
| **7** | **Member LTV view** | Builds on revenue + attendance; “best members” and simple LTV. |
| **8** | **Retention funnel (cohorts)** | Strong for storytelling and investor/owner reports; more logic and UI. |
| **9** | **Capacity planning** | Depends on solid occupancy and optional waitlist; recommend “add/remove slot” next. |
| **10** | **Coach / class performance** | Depends on schema (coach on Class or new entity); do after coach is part of the model. |

**First to build:** Churn risk → Attendance trends & goals → Class profitability. These three deliver fast, high-impact decisions with the data you already have.

---

## 4. Business Value for Gym Owners

| Feature | Business value | Example decision |
|---------|----------------|------------------|
| **Churn risk** | Reduce cancellations by reaching out before members quit. | “Contact these 12 members; offer a check-in or trial class.” |
| **Revenue vs attendance** | See who pays but doesn’t show (retention/price risk) and revenue per active member. | “Improve onboarding or adjust plans for low-attendance payers.” |
| **Class profitability** | Know which classes and times are worth keeping. | “Cut the empty 12h Friday; add another 18h Wednesday.” |
| **Retention funnel** | Understand drop-off after first month and by cohort. | “Cohort from March has 40% still active at 90d; improve month-1 experience.” |
| **Attendance trends & goals** | One number: “are we growing?” and progress vs target. | “Check-ins +8% vs last month; keep current strategy.” |
| **Peak vs off-peak** | Justify peak pricing and fill off-peak. | “Peak at 85% utilization; run a promotion for 10h slot.” |
| **Coach / class performance** | Fair view of which coaches/classes pull attendance. | “Schedule Maria more in prime time; train João on engagement.” |
| **New vs returning mix** | Balance acquisition vs retention. | “Growth from returning members; focus on retention and upsell.” |
| **Capacity planning** | Data-backed schedule changes. | “Add class Wed 18h; demand is 2× capacity there.” |
| **Member LTV view** | Identify and reward high-value members. | “Top 20 members by LTV; offer referral or loyalty benefit.” |

---

## 5. Summary

- **Top 3 to build first:** (1) **Churn risk**, (2) **Attendance trends & goals**, (3) **Class profitability** — high impact, low–medium complexity, no new core entities.
- **Next tier:** New vs returning mix, Revenue vs attendance, Peak vs off-peak, Member LTV — require either simple logic or Payment/Subscription linkage.
- **Later:** Retention cohorts, Capacity planning, Coach performance — higher complexity or schema (coach, waitlist).

All ten features align with gym owner goals: **retention**, **revenue visibility**, **schedule optimization**, and **member value** — and they build on the current data model (User, Class, Attendance, Workout, Payment, Subscription) with minimal or incremental schema changes where needed.

---

## Appendix: Churn Risk (Option B) — Final contract and endpoints

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics/churn-risk` | Returns at-risk members (baseline drop or no-show). |
| GET | `/api/analytics/baselines/recompute` | Recomputes stored baselines (e.g. for cron). |

### GET /api/analytics/churn-risk

**Query parameters:**

| Param         | Type   | Default | Description                              |
|---------------|--------|--------|------------------------------------------|
| `days`        | number | 30     | Current window in days (7–90).            |
| `noShowDays`  | number | 10     | Flag as at-risk if no check-in in last N days. |
| `limit`       | number | 50     | Max members to return (1–100).           |

**Response (200):**

```ts
{
  period: {
    current: { from: string; to: string };  // YYYY-MM-DD
    days: number;
    noShowDays: number;
  };
  criteria: {
    baselineDropThreshold: number;   // 0.7
    baselinePeriodWeeks: number;     // 12
  };
  data: Array<{
    userId: string;
    name: string;
    previousCount: number;
    currentCount: number;
    dropPercent: number;
    baselineCheckInsPerWeek: number | null;  // avg weekly check-ins over baseline period
    currentCheckInsPerWeek: number;          // rate in current window
    daysSinceLastCheckIn: number | null;
  }>;
}
```

**Business logic:**

- **Baseline:** Avg weekly check-ins over the last 12 weeks; stored in `UserChurnBaseline`. Recomputed if missing or older than 7 days.
- **Candidates:** Users with at least one attendance in the last 60 days.
- **At-risk:** (1) Current rate (last 30d) &lt; baseline × 0.7 **or** (2) No check-in in the last 10 days (configurable via `noShowDays`).
- **Ordering:** By `daysSinceLastCheckIn` descending, then by `currentCheckInsPerWeek` ascending.

### GET /api/analytics/baselines/recompute

**Query parameters:**

| Param          | Type   | Default | Description                    |
|----------------|--------|--------|--------------------------------|
| `periodWeeks`  | number | 12     | Lookback weeks for baseline (4–52). |

**Response (200):**

```ts
{
  ok: true;
  periodWeeks: number;
  updatedUsers: number;
  totalBaselines: number;
}
```

Recomputes and upserts `UserChurnBaseline` for every user who has attendance in the last `periodWeeks` weeks. Intended for periodic (e.g. weekly) cron jobs.
