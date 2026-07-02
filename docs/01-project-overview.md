# 1. Project Overview

## 1.1 What is HisabKitab?

HisabKitab ("hisab kitab" — Hindi/Urdu for "accounting" or "keeping the books") is a personal finance tracker built as a React Native mobile app. It is designed for a single user in India whose expenses are scattered across multiple UPI apps (GPay, PhonePe, Paytm, PayZapp) and bank transactions, with no consolidated view of where money goes.

It is **not** just a ledger. The core value proposition (from the original ADR) is:

> A tool that categorizes spending, shows where money goes, and proactively flags overspending/trends — e.g. "food delivery is 28% of spend, up from 15%."

## 1.2 Problem being solved

Before this app, the user's expense data lived in five disconnected places (four UPI apps + bank statements), with:

- No single view of total monthly spend
- No categorization (a Swiggy order and a rent payment look the same in a bank statement)
- No trend visibility (is spending on food increasing? by how much?)
- No budget accountability (is spend on track against a monthly target?)
- No visibility into recurring charges (subscriptions quietly piling up)

## 1.3 Goals (what this app does)

- Let the user log an expense manually in a few taps (amount, merchant, category, date)
- Show a month-by-month view of total spend, broken down by category
- Compute and surface **insights automatically** — no manual analysis required:
  - "This category is over 25% of your spend this month"
  - "This category is up sharply vs. your recent average"
  - "You added a new recurring charge this month"
  - "This category is stable / on track"
- Track budgets per category and flag overspending
- Show upcoming recurring-charge renewals (subscriptions, bills) so nothing sneaks up
- Work fully offline, with zero setup (no accounts, no server, no network dependency)
- Look good — a deliberate "Ledger" visual design (dark/light, monospace money, serif headers) rather than a generic CRUD-app aesthetic

## 1.4 Non-goals (v1 — deliberately out of scope)

These are documented here because a new developer will otherwise wonder "why doesn't this call a bank API?" or "where's the login screen?":

- **No backend, no server, no database.** All data lives on-device. See [16-design-decisions-and-tradeoffs.md](16-design-decisions-and-tradeoffs.md) for why.
- **No real bank/UPI integration.** No official personal-use API exists for GPay/PhonePe/Paytm/PayZapp for an individual developer to integrate against. Ingestion is phased (see [17-future-improvements.md](17-future-improvements.md)): manual entry now, CSV/PDF statement import later, SMS export later still.
- **No automatic categorization.** Every transaction is categorized by the user at entry time. Keyword/merchant-rule matching and LLM-assisted categorization are planned for later phases.
- **No authentication.** Single user, single device, no login. See [14-security.md](14-security.md).
- **No push notifications.** Renewal/budget alerts are in-app only for now.
- **No household/multi-user expense sharing.** Not implemented; see [17-future-improvements.md](17-future-improvements.md) for a sketch of what it would take.

## 1.5 Who this is for (as a codebase)

This is a personal project for a single user, not a product being built for external customers. That shapes several decisions documented throughout: no multi-tenancy concerns, no need for a formal auth system, and a willingness to accept "good enough for one person's phone" trade-offs (e.g., text-input dates instead of a native date picker) over building generalized infrastructure.

## 1.6 Current status

The app is fully functional end-to-end on Android via Expo Go:

- ✅ Manual expense entry
- ✅ Month-over-month totals, budget pacing bar
- ✅ Category breakdown with drill-down (6-month trend + merchant breakdown per category)
- ✅ Rule-based insights (category share, trend spikes, subscription growth, stability)
- ✅ Budget vs. actual per category
- ✅ Upcoming renewals list
- ✅ Dark/light theme toggle, edge-to-edge fullscreen UI
- ✅ ~6 months of realistic seed data for immediate exploration
- ⬜ Statement/SMS import (UI placeholders exist, marked "Coming soon")
- ⬜ Automated test suite (see [12-testing-strategy.md](12-testing-strategy.md) for current state and recommended approach)

## 1.7 Where to go next

- New to the codebase and want the big picture? → [03-architecture.md](03-architecture.md)
- Want to run it locally right now? → [10-setup-and-installation.md](10-setup-and-installation.md)
- Want to understand how an insight like "Food & Dining is up 48%" gets computed? → [08-business-logic-and-analytics.md](08-business-logic-and-analytics.md)
- Want to add a new screen or feature? → [18-developer-guide.md](18-developer-guide.md)
