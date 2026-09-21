# Tallyo frontend — rebuild from first principles

Status: planning. Branch: `exp/drastic-changes`.

Decisions locked:

- **Paradigm shift** — rethink the interaction model, not just the visuals.
- **Dashboard as canvas** — the canvas is the center; other surfaces are lenses over it.
- **Route loaders own state** — no prefetch-then-resubscribe.
- **Mobile-first, one layout** — design at 390px, scale up; one render, not two.

---

## The thesis

A personal finance app is **one dataset (transactions) and one filter algebra**. Every
screen today is a hand-rolled re-query of that dataset with its own state machine: the
ledger has `search.tsx` filters, reports has `transaction-report.tsx` filters, and
dashboard drill-downs are URL links into the ledger. Three implementations of the same
idea.

So the rewrite is: **one transaction view model, one query engine, and a canvas that
composes views into panels.** "Pages" disappear; what remains are *lenses* over the same
data.

```
TODAY                              AFTER
┌──────────────┐                   ┌────────────────────────────────────┐
│ dashboard    │─┐                 │            Canvas (time range)      │
│ transactions │ │  5 routes,      │  ┌────────┐ ┌────────┐ ┌─────────┐  │
│ merchants    │ ├─ each re-      │  │ cash   │ │ spend  │ │ income  │  │
│ categories   │ │  implements     │  └────────┘ └────────┘ └─────────┘  │
│ reports      │─┘  filtering     │         │ open lens (filter)         │
└──────────────┘                   │         ▼                          │
   top-nav duped x2                │   ┌─ Ledger lens ────────────────┐  │
   table + cards x2                │   │ the only transaction list    │  │
   3 entity pickers                │   │ (desktop column / mobile sheet) │
   3 relative-time fns             │   └──────────────────────────────┘  │
   2 chart stacks                  └────────────────────────────────────┘
```

---

## 1. The transaction view — the missing abstraction

Introduce a single serializable value that every surface speaks:

```ts
// lib/views/transaction-view.ts
type TransactionView = {
  range: { from: string; to: string };
  categories?: string[];
  merchants?: string[];
  text?: string;
  reviewState?: "all" | "reviewed" | "unreviewed";
  withoutMerchant?: boolean;
  amount?: { min?: number; max?: number }; // cents
  sort?: "date" | "amount";
};

const encodeView = (v: TransactionView): URLSearchParams => ...;
const decodeView = (params: URLSearchParams): TransactionView => ...;
const viewQueryOptions = (v: TransactionView) =>
  orpc.transactions.getUserTransactions.queryOptions({ ... });
```

- The dashboard is `TransactionView` + aggregates. A pie slice click becomes
  `viewQueryOptions({ ...view, categories: [id] })` and opens the ledger lens.
- `/reports` stops existing as a separate page: it becomes the same ledger with an amount
  predicate and a summary panel. `transaction-report.tsx` (603 lines) collapses into
  "ledger lens + summary panel".
- `/transactions`' filter UI (`search.tsx`, 254 lines) becomes a `ViewControls` component
  that edits this value, used everywhere.

This is the keystone. It kills the reports/transactions duplication and makes drill-down
trivial and uniform.

---

## 2. Route tree: one layout, canvas + overlay lenses

```
__root
├── _app                    ← the ONLY auth gate + session owner + shell
│   ├── route.tsx           beforeLoad: ensureSession + load session once
│   ├── index.tsx           → canvas
│   ├── canvas.tsx          loader-owns: overview aggregates for the range
│   ├── ledger.tsx          loader-owns: the TransactionView query
│   ├── taxonomy.tsx        merchants + categories, one manager lens
│   └── settings.tsx        sheet, not a page
├── signin.tsx
└── privacy.tsx, terms.tsx  (public)
```

- **Auth exists in exactly one place.** `ensureSession` is deleted from every route. A new
  route is protected by construction. (Today protection is repeated in 6 routes:
  `dashboard.tsx:39`, `transactions.tsx:129`, `categories.tsx:32`, `merchants.tsx:35`,
  `reports.tsx:23`, `settings.tsx:23`.)
- **Lenses render as overlays**: `canvas.tsx` renders the base and an `<Outlet/>`; the
  ledger/taxonomy routes mount as a panel-push on desktop and a full-height sheet on
  mobile. Selecting a merchant doesn't swap the page — it slides the ledger over the
  canvas, and Back pops it. URL stays deep-linkable.
- **`/merchants` and `/categories` merge into `taxonomy`** and become mostly unnecessary as
  destinations: the entity picker creates/edits/merges inline (see §4). This deletes two
  routes and ~10 components.

---

## 3. Loader-owned state + one mutation layer

### Reads

Delete every prefetch-then-`useQuery` pair. The canonical pattern:

```ts
export const Route = createFileRoute("/_app/ledger")({
  validateSearch: viewSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureQueryData(viewQueryOptions(decodeView(deps))),
  component: Ledger, // reads Route.useLoaderData() / useSuspenseQuery(same key)
});
```

Because the loader ensures and the component `useSuspenseQuery`s the *same* options, you
get loader-owned initial data **and** reactive cache updates, with no `isLoading` branches
anywhere. `DelayedLoading`, the `isLoading={false}` prop at `transactions.tsx:424`, and the
double-fetch all vanish.

### Mutations

One factory, one invalidation registry:

```ts
// lib/mutations/optimistic.ts
export function optimisticListMutation<TVars>(
  getView: () => TransactionView,
  patch: (tx: Transaction, vars: TVars) => Transaction,
  invalidate: MutationKey[],
) { ... }
```

- A `queryKeys` registry is the single source of truth for keys + dependencies. Today
  `transactions.tsx:313` and `create-transaction-form.tsx:63` invalidate nothing, because
  string prefixes don't deep-match array keys.
- Every mutation ends in `queryClient.invalidateQueries(registry.transactions)` **and**
  `router.invalidate()` so loader-owned data refreshes.
- `review-mode.tsx`'s four hand-rolled mutations, `useQuickSplit`'s split, and
  `split-transaction-dialog.tsx`'s duplicate `splitTransaction` collapse into one
  `useTransactionMutations()`.
- Session moves to `_app` route context; the second session query and `useSession`'s
  fallback gymnastics (`auth-client.ts:63-78`) simplify. Remove dead `ORPCContext`/`useORPC`
  (`__root.tsx:65-83`, `utils/orpc.ts:42-49`).

---

## 4. One primitive per concept

| Concept | Today | After |
| --- | --- | --- |
| Entity selection | `entity-select`, `entity-picker-sheet`, `multi-entity-select`, `merchant-select`, `category-select`, `merchant-multi-select`, `category-multi-select` | one `EntityPicker` (`kind`, `multiple`, `allowCreate`, `allowEdit`, `allowMerge`); mobile sheet + desktop command internally |
| Panel / section | `card`, `section`, `card-list`, dashboard `SectionPanel` | one `Panel` |
| Date / relative time | 3 implementations, 2 conflicting "upcoming" thresholds | one `lib/dates.ts` |
| Empty state | duplicated JSX in `transactions-table.tsx:178` & `:384` | one `<EmptyState>` |
| Charts | `@tanstack/charts` pie + raw d3-sankey | shared `ChartFrame` (theme, tooltip, privacy, legend, a11y); one rendering approach |
| Privacy mode | `CurrencyAmount` + manual `formatValueWithPrivacy` in Sankey | a formatting layer all numeric output goes through |
| Nav | arrays + active logic duplicated in `top-nav` & `mobile-nav-drawer` | one `nav.ts` config consumed by rail, sheets, and command palette |

**Inline taxonomy creation** is the unlock: `EntityPicker` can create/edit/merge a merchant
or category without leaving the transaction. That is why taxonomy stops needing a page.

---

## 5. Mobile-first, one layout

Design at 390px, scale up. Delete the dual render (table + card) entirely — one
`TransactionRow` that becomes a stacked row on mobile and a table row on desktop via
layout, not `md:hidden` / `hidden md:block` forks. Review mode is a *state of the ledger*
(`reviewState: unreviewed` + focused card), not a separate `md:hidden` tree. Unify
breakpoints (today `md` / `lg` / `768` disagree everywhere: table-vs-card at `md`, nav and
search at `lg`, review mode at `md`). One shell: bottom bar + sheets on mobile, left rail +
inspector on desktop.

---

## 6. Visual language

`index.css` (580 lines) is currently a shadcn token dump with the palette declared twice
(`:root` and `@theme inline`), an unused `next-themes`, and one working custom provider.
The rewrite replaces it with a deliberate system:

- A real token layer (color / space / type / elevation / motion) in one place, dark-first
  but a genuine light theme (today dark is default while the provider defaults to `system`).
- Financial semantics get first-class tokens (`income`/`expense`/`savings` already exist —
  promote them to the chart + ledger system).
- Mobile-first type scale; 44px touch targets as a default primitive constraint.
- Motion as a defined vocabulary (lens push/pop, optimistic settle).

Aesthetic direction is still open (see below).

---

## 7. What gets deleted

- `components/layout/app-sidebar.tsx` (0 bytes)
- `components/layout/breadcrumbs.tsx` (never imported)
- `components/user-menu.tsx` (never imported)
- `components/webhook-button.tsx` (functionality inlined in `top-nav.tsx:48-64`)
- `components/settings/developer-mode-toggle.tsx`, `privacy-mode-toggle.tsx` (never imported)
- `components/date-picker/date-picker.tsx` (never imported)
- `useORPC` / `ORPCContext` (dead plumbing)
- `_healthCheck` (`index.tsx:36`), `_parentCategories` (`create-category-form.tsx:87`)
- Inline dialogs duplicating the category/merchant dialog wrappers
  (`categories.tsx:117-130`, `merchants.tsx:142-155`)
- `keepPreviousData` (v4 option, no-op in v5) — `transactions.tsx:209`
- `next-themes` dependency (never mounted; `sonner.tsx` reads the wrong provider)
- `console.log` at `transactions-table.tsx:464`

The uncommitted refactor (`transaction-card`, `row-actions`, `transaction-fields`,
`transaction-utils`, `use-quick-split`, `use-transaction-notes`, `review-mode`) is a
tidy-up of the *old* shape. Port its good ideas (extracted row actions, notes hook) into
the new primitives and discard the dual-render structure.

---

## 8. Phasing (vertical slice first)

| Phase | Output | Verify |
| --- | --- | --- |
| 0 | Design tokens + `Panel` / `EntityPicker` / `ChartFrame` / `EmptyState` primitives on a scratch route | Dev-only route at `/dev/primitives`, mobile + desktop |
| 1 | `_app` layout, single auth gate, session in context, shell, command palette | Nav works; a new route is protected for free |
| 2 | `TransactionView` + one ledger lens (loader-owned, one row component, review as state) | Replaces `/transactions`; drill-down from canvas works |
| 3 | Canvas panels wired to views; delete dashboard's 6 duplicated queries | Dashboard is panels over one view |
| 4 | Taxonomy as inline picker capability + `taxonomy` lens; delete `/merchants`, `/categories` pages | Create/edit/merge without leaving a transaction |
| 5 | Reports as a saved view over the ledger; delete `transaction-report.tsx` | Parity with today's report filters |
| 6 | Settings sheet, signin, public pages restyle; dead-code sweep | Full pass, `npm run check-types` |

Each phase is independently shippable; the branch can land as slices or one PR.

---

## 9. Backend changes

The hard parts already exist: `getTransactionReport` (`transactions.ts:550-765`) already
does multi-category, multi-merchant, amount-range, date-range, and reviewed filters. The
work is unification, not invention.

| Frontend plan item | Backend change |
| --- | --- |
| `TransactionView` | One query contract replacing `getUserTransactions` + `getTransactionReport` |
| Reports folds into ledger | Delete `getTransactionReport`; move its summary to an aggregate |
| Canvas panels | One `getCanvasOverview` replacing 6 dashboard calls |
| Drill-down consistency | Shared WHERE builder used by ledger + every aggregate |
| Inline taxonomy | Return shapes + keyword-on-assign + a taxonomy stats aggregate |
| Saved views (open Q) | Only possible schema change: new `saved_views` table |

### 9.1 The one contract change: `getUserTransactions`

Today's input (`transactions.ts:238-247`) can't express a view: single `category` /
`merchant`, no date range, no amount, no sort. But `getTransactionReport`
(`transactions.ts:551-567`) already has almost exactly the right shape. The view is the
merge of the two inputs:

```ts
const transactionViewSchema = z.object({
  range: z.object({ from: z.string(), to: z.string() }).optional(),
  categories: z.array(z.string()).optional(),
  merchants: z.array(z.string()).optional(),
  text: z.string().optional(), // renamed from `filter`
  reviewState: z.enum(["all", "reviewed", "unreviewed"]).default("all"),
  withoutMerchant: z.boolean().optional(),
  amount: z
    .object({ min: z.number().int().optional(), max: z.number().int().optional() })
    .optional(),
  sort: z.enum(["date", "amount"]).default("date"),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(50),
});
```

**This forces a semantic decision.** There are three different "what counts" rules today:

- **Ledger** (`transactions.ts:285-288`): everything — reviewed or not, income or expense,
  includes `hideFromInsights` and uncategorized.
- **Report** (`transactions.ts:609-650`): excludes `treatAsIncome` and `hideFromInsights`,
  includes uncategorized, ignores `reviewed` unless explicitly passed.
- **Dashboard** (`dashboard.ts:148-154`): `reviewed = true`, `hideFromInsights = false`,
  splits income/expense by `treatAsIncome`.

The view needs one explicit field, e.g. `scope: "ledger" | "insights"`. Without it,
"click a category slice → open ledger" shows a different set of rows than the slice
counted.

### 9.2 Delete `getTransactionReport`; split out the summary

The report returns `{ transactions, summary }` with summary computed over the **entire**
filtered set, not the page (`transactions.ts:695-700`). Pagination can't own that.

- `transactions.getView(view)` → `{ transactions, pagination }`
- `transactions.getViewSummary(view)` → aggregates over the full view

Keeps pagination cheap and lets the report panel cache independently. The monthly-average
blocks (`transactions.ts:664-691` and `:726-750`, duplicated) collapse into one.

### 9.3 One canvas aggregate instead of six

The dashboard fires 6 procedures, each re-parsing the date range and re-scanning:
`getStatsCounts`, `getCategoryData` (×2 income/expense), `getMerchantStats`,
`getTransactionStats`, `getSankeyData`, `getPeriodComparison` (`dashboard.ts:300-716`).
Replace with `dashboard.getCanvasOverview(view)` returning all panels, sharing one filter
builder and one range parse. `getPeriodComparison` stays internal (it derives the previous
range). This also makes the canvas filterable by the same `TransactionView`, so panels stay
consistent if the canvas is ever scoped.

### 9.4 Shared WHERE builder (required, not optional)

Date-range + `reviewed` + `hideFromInsights` + `treatAsIncome` conditions are copy-pasted
in at least 8 places (`transactions.ts:252-288`, `:572-651`; `dashboard.ts:148-154`,
`:315-326`, `:354-369`, `:399-407`, `:478-513`, `:627-698`). Extract:

```ts
buildTransactionWhere(userId: string, filter: TransactionViewFilter): SQL;
```

Both the ledger and every aggregate call it, or the "one view" claim is a lie and scope
semantics drift again.

### 9.5 Taxonomy: mostly there, three gaps

`createMerchant` / `updateMerchant` / `mergeMerchants` (`merchants.ts:162,210,491`) and
`createCategory` / `updateCategory` (`categories.ts:78,154`) exist. For inline
`EntityPicker` use:

- **Return relations.** `createCategory` returns a bare row (`categories.ts:137-139`);
  `createMerchant` returns a bare row (`merchants.ts:198-201`). Both should return the same
  shape as `getUserMerchants` (`merchants.ts:137-153`, with `recommendedCategory` +
  `keywords`) / `getUserCategories`, so the client can write straight into cache.
- **Keyword on assign already works** — `updateTransactionMerchant` adds/removes keywords
  (`transactions.ts:340-394`). No change.
- **New `getTaxonomyStats`** if the taxonomy lens shows usage ("14 transactions, $230/mo,
  last used Mar 3"). `getUserMerchants` / `getUserCategories` return uncounted lists today.

### 9.6 Cleanups to fold in

- `getMerchantFromVendor` is a client-exposed procedure (`merchants.ts:117`) but is really
  a server-side helper.
- `getCategoryData` fabricates category objects with `new Date()` timestamps
  (`dashboard.ts:459-460`, `:561-563`) — normalize.
- Indexes are fine for a single-user DB; `(user_id, date)` covers the range, `inArray` uses
  the existing category/merchant indexes. Sorting by `amount` may eventually want a
  `(user_id, amount)` index; not needed now.

### 9.7 What does not change

Auth, `protectedProcedure`, context, bearer-token external API (`external-api.ts`),
webhooks, settings, and `getUserMeta`'s unreviewed count / earliest date
(`meta.ts:100-125`) — the latter just feeds the canvas default range.

---

## 10. Data model changes

For the plan as scoped, the schema is almost a non-issue: the only migration implied is the
optional `saved_views` table. First-principles review exposes defects the view engine will
make visible rather than hide.

### 10.1 Splits are modeled by deletion (the real flaw)

`splitTransaction` (`transactions.ts:502-543`) **deletes the original row** and inserts N
children with `splitFromId = <deleted id>`. Consequences:

- `splitFromId` is a **dangling pointer by construction** — no FK, no index
  (`schema/app.ts:163`; `migrations/0003_fluffy_jimmy_woo.sql:1`).
- The `CONTEXT.md` invariant "children sum to the original amount" is **unenforceable**:
  there is no original row, and the sum-check runs only once at creation
  (`transactions.ts:490-498`).
- `createdAt` / `updatedAt` are reset; the original's history is gone.

`splitFromId` is *already* used as a group key (all children share it) — it just lies about
being a reference. Two honest options:

**A. It's a group id, not a reference (recommended).** Rename to `splitGroupId`, index it:

```ts
splitGroupId: text("split_group_id"),
// index
index("transaction_split_group_id_idx").on(table.splitGroupId),
```

No parent row, no double-counting, grouping works. Minimal migration (rename + index), no
data rewrite, and the ledger only ever contains leaves.

**B. Model the parent.** Keep the original as a tombstone with a real self-FK, exclude
parents from aggregates, and get true provenance:

```ts
splitFromId: text("split_from_id").references((): AnyPgColumn => transaction.id, {
  onDelete: "cascade",
}),
// every aggregate adds a notExists(child) / isNull(splitFromId) guard
```

More correct, but the double-counting hazard is exactly what silently breaks the canvas.
If provenance is wanted later, B is additive on top of A.

### 10.2 "What counts in insights" is category-level only

`treatAsIncome` and `hideFromInsights` live on `category` (`schema/app.ts:49-50`).

- **Uncategorized income is misfiled as expense.** `getTransactionReport` hardcodes
  uncategorized → expense (`transactions.ts:637-650`). A refund with no category lands on
  the expense side.
- Transfers, reimbursements, and reconciliation rows have no category that fits;
  `hideFromInsights` forces a dummy category.

Fix: transaction-level flags, which is what makes `scope` (§9.1) expressible per row
instead of inferring side from category:

```ts
flow: text("flow", { enum: ["income", "expense", "transfer"] }),
excludedFromInsights: boolean("excluded_from_insights").notNull().default(false),
```

### 10.3 Category hierarchy is unbounded but the UI assumes two levels

`parentCategoryId` is a self-FK with no depth limit (`schema/app.ts:44-47`), yet
`CategorySelect` treats it as parent → child and `getCategoryData` resolves only one parent
level (`dashboard.ts:417-465`). A grandchild aggregates with a dangling parent. Pick one:
reject a parent that itself has a parent, or genuinely support N levels in the queries and
the drill-down.

### 10.4 Keyword matching has no normalized key

Uniqueness is on the raw string `(merchantId, keyword, userId)` (`schema/app.ts:110-114`),
but matching is case-insensitive (`transactions.ts:150-153`; `lib/merchant-matching.ts`), so
`NETFLIX` and `netflix` are two rules that both match. If the inline picker makes keyword
creation one tap, duplicates accumulate. Fix: store a lowercased key (`keywordLower`) or use
`citext`, plus a functional index.

### 10.5 Merchant → category is one-to-many pretending to be one-to-one

`merchant.recommendedCategoryId` is a single FK (`schema/app.ts:83-86`); Amazon-style
merchants genuinely map to several categories. Keywords carry no category, so you cannot
say "`AMZN Mktp` → Shopping" vs "`AMZN Digital` → Subscriptions". Additive fix if the
taxonomy lens grows: `merchantKeyword.categoryId` as an override.

### 10.6 Hygiene to fold into the migration pass

- `createdAt` / `updatedAt` are `timestamp` (no tz) — use `timestamptz`.
- `updatedAt` is set manually per mutation (`transactions.ts:86`); `$onUpdate` removes the
  "forgot to bump it" class of bug.
- `settings.webhookUrls` is a `text[]` with no per-hook metadata; a `webhooks` table is the
  redesign-shaped version if the integrations surface grows.
- `authToken` is one-per-user, plaintext-plus-hash, no name/last-used
  (`schema/app.ts:193-214`). Out of scope; note only.

### 10.7 Migration summary

| Change | Needed for the plan? | Migration cost |
| --- | --- | --- |
| `saved_views` table | Only if open decision #3 = real persistence | New table |
| `split_group_id` rename + index (option A) | Strongly recommended | Rename col + index, no data rewrite |
| `transaction.flow` / `excludedFromInsights` | Needed for honest `scope` semantics | Add column(s), backfill from category |
| Category depth constraint | If 2-level UX is kept | Validation only (or none) |
| Keyword normalization | Nice-to-have | Backfill lowercase + unique index |
| `merchantKeyword.categoryId` | If taxonomy lens grows | Add nullable FK |
| `timestamptz` / `$onUpdate` | Hygiene | Column type change, mechanical |

None of this changes the view engine's contract — the view sits on top. But §10.1 and
§10.2 are best done *with* the rewrite, because the view engine is what exposes them.

---

## 11. Open decisions

1. **Visual direction** — keep the warm orange ledger identity, or go somewhere new
   (editorial monochrome, terminal/utilitarian, soft glass)?
2. **Lens edges** — max 2 stackable lenses, or arbitrary depth?
3. **Persistence** — should "saved views" (named `TransactionView`s) be a real feature
   (new server table) or URL-only?
4. **`/reports`** — keep it as a distinct destination for muscle memory, or fully fold it
   into saved views?
5. **Scope semantics** — `scope: "ledger" | "insights"`, and does it bring transaction-level
   `flow` / `excludedFromInsights` (§10.2)?
6. **Sub-categories** — clicking a parent slice should include descendants; expand
   server-side or only ever pass leaf ids?
7. **Split model** — option A (`splitGroupId`, group key) or option B (real parent, with
   provenance)?
