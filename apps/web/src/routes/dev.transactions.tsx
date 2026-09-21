import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dev/transactions")({
  component: TransactionsPerfRoute,
});

const DEFAULT_PREFIX = "PERF TEST";
const today = () => new Date().toISOString().slice(0, 10);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Stats {
  created: number;
  deleted: number;
  lastBatchMs: number | null;
  lastBatchSize: number;
  avgCreateMs: number | null;
  avgDeleteMs: number | null;
}

const EMPTY_STATS: Stats = {
  created: 0,
  deleted: 0,
  lastBatchMs: null,
  lastBatchSize: 0,
  avgCreateMs: null,
  avgDeleteMs: null,
};

/**
 * Development-only performance harness. Creates and deletes tagged
 * transactions in bulk so the write path can be measured without clicking
 * through the UI. Deletion is scoped to rows tagged with the configured
 * prefix, never the user's real data.
 */
function TransactionsPerfRoute() {
  const [amount, setAmount] = useState("12.34");
  const [date, setDate] = useState(today());
  const [prefix, setPrefix] = useState(DEFAULT_PREFIX);
  const [count, setCount] = useState("25");
  const [delayMs, setDelayMs] = useState("0");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<{ id: number; line: string }[]>([]);
  const logId = useRef(0);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [batchIds, setBatchIds] = useState<string[]>([]);

  if (!import.meta.env.DEV) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Not available"
          description="The transactions performance harness is only available in development."
        />
      </div>
    );
  }

  const appendLog = (line: string) => {
    logId.current += 1;
    setLog((prev) => [{ id: logId.current, line }, ...prev].slice(0, 40));
  };

  const createBatch = async () => {
    const n = Math.max(1, Math.min(500, Number.parseInt(count, 10) || 1));
    const cents = Math.round(Number(amount) * 100);
    const throttle = Math.max(0, Number.parseInt(delayMs, 10) || 0);
    if (!Number.isFinite(cents)) {
      appendLog("Invalid amount");
      return;
    }

    setBusy(true);
    const ids: string[] = [];
    const durations: number[] = [];
    const start = performance.now();

    try {
      for (let i = 0; i < n; i++) {
        const t0 = performance.now();
        const result = await orpc.transactions.createTransaction.call({
          amount: cents,
          date,
          transactionDetails: `${prefix} #${Date.now()}-${i + 1}`,
          notes: "created by /dev/transactions",
        });
        durations.push(performance.now() - t0);
        if (result.transaction) ids.push(result.transaction.id);
        if (throttle > 0) await sleep(throttle);
      }

      const total = performance.now() - start;
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      setBatchIds(ids);
      setStats((prev) => ({
        ...prev,
        created: prev.created + ids.length,
        lastBatchMs: total,
        lastBatchSize: ids.length,
        avgCreateMs: avg,
      }));
      appendLog(
        `create ${ids.length} in ${Math.round(total)}ms (avg ${avg.toFixed(1)}ms, ${(ids.length / (total / 1000)).toFixed(1)}/s)`,
      );
    } catch (error) {
      appendLog(`create failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const deleteIds = async (ids: string[], label: string) => {
    if (ids.length === 0) {
      appendLog("nothing to delete");
      return;
    }
    setBusy(true);
    const durations: number[] = [];
    const start = performance.now();
    let removed = 0;

    try {
      for (const id of ids) {
        const t0 = performance.now();
        await orpc.transactions.deleteTransaction.call({ id });
        durations.push(performance.now() - t0);
        removed += 1;
      }
      const total = performance.now() - start;
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      setStats((prev) => ({
        ...prev,
        deleted: prev.deleted + removed,
        lastBatchMs: total,
        lastBatchSize: removed,
        avgDeleteMs: avg,
      }));
      appendLog(
        `${label} ${removed} in ${Math.round(total)}ms (avg ${avg.toFixed(1)}ms, ${(removed / (total / 1000)).toFixed(1)}/s)`,
      );
    } catch (error) {
      appendLog(`delete failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const deleteLastBatch = () => deleteIds(batchIds, "deleted batch");

  const deleteAllTagged = async () => {
    setBusy(true);
    try {
      const ids: string[] = [];
      let page = 1;
      // Walk every page of the tagged rows before deleting.
      for (;;) {
        const res = await orpc.transactions.getView.call({
          scope: "ledger",
          reviewState: "all",
          side: "all",
          sort: "date",
          text: prefix,
          page,
          pageSize: 100,
        });
        for (const tx of res.transactions) {
          if (tx.transactionDetails.startsWith(prefix)) ids.push(tx.id);
        }
        if (
          page >= res.pagination.totalPages ||
          res.transactions.length === 0
        ) {
          break;
        }
        page += 1;
      }
      setBusy(false);
      await deleteIds(ids, `deleted ${prefix}`);
      setBatchIds([]);
    } catch (error) {
      appendLog(`scan failed: ${(error as Error).message}`);
      setBusy(false);
    }
  };

  const resetStats = () => {
    setStats(EMPTY_STATS);
    setLog([]);
    setBatchIds([]);
  };

  return (
    <div className="mx-auto max-w-screen-2xl space-y-8 px-4 py-8 lg:px-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground">
          Dev · Performance harness
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Transaction write path
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Bulk-creates and deletes transactions tagged{" "}
          <code className="rounded bg-muted px-1">{prefix}</code> so you can
          measure the create/delete path. Delete is scoped to that tag only.{" "}
          <Link to="/dev/primitives" className="text-accent underline">
            Primitives
          </Link>
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Create">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (dollars)">
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Details prefix">
              <Input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
              />
            </Field>
            <Field label="Count">
              <Input
                type="number"
                min={1}
                max={500}
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </Field>
            <Field label="Delay between calls (ms)">
              <Input
                type="number"
                min={0}
                value={delayMs}
                onChange={(e) => setDelayMs(e.target.value)}
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={busy} onClick={createBatch}>
              Create {count || "0"}
            </Button>
            <Button
              variant="outline"
              disabled={busy || batchIds.length === 0}
              onClick={deleteLastBatch}
            >
              Delete last batch ({batchIds.length})
            </Button>
          </div>
        </Panel>

        <Panel title="Delete">
          <p className="text-sm text-muted-foreground">
            Finds every transaction whose details start with the prefix and
            deletes it. Only rows created by this harness should match.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="destructive"
              disabled={busy}
              onClick={deleteAllTagged}
            >
              Delete all “{prefix}”
            </Button>
            <Button variant="ghost" disabled={busy} onClick={resetStats}>
              Reset stats
            </Button>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Results">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Created" value={stats.created.toString()} />
            <Stat label="Deleted" value={stats.deleted.toString()} />
            <Stat
              label="Last batch"
              value={
                stats.lastBatchMs === null
                  ? "—"
                  : `${Math.round(stats.lastBatchMs)}ms / ${stats.lastBatchSize}`
              }
            />
            <Stat
              label="Avg create"
              value={
                stats.avgCreateMs === null
                  ? "—"
                  : `${stats.avgCreateMs.toFixed(1)}ms`
              }
            />
            <Stat
              label="Avg delete"
              value={
                stats.avgDeleteMs === null
                  ? "—"
                  : `${stats.avgDeleteMs.toFixed(1)}ms`
              }
            />
            <Stat label="Busy" value={busy ? "yes" : "no"} />
          </dl>
        </Panel>

        <Panel title="Log">
          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground">No runs yet.</p>
          ) : (
            <ul className="space-y-1 font-mono text-xs text-muted-foreground">
              {log.map((entry) => (
                <li key={entry.id}>{entry.line}</li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-lg font-semibold tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}
