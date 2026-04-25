"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/axios";
import {
  TrendUp,
  TrendDown,
  ArrowRight,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

type Transaction = {
  id: number;
  type: string;
  status: string;
  total_amount: number;
  platform_fee: number;
  consultant_net: number;
  currency: string;
  booking_date: string | null;
  created_at: string;
};

type Meta = {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
};

type WalletData = {
  balance_bdt: number;
  monthly_earnings: number;
  change_percent: number;
  transactions: Transaction[];
  meta: Meta;
};

function formatCurrency(amount: number) {
  return `৳${amount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getTypeStyle(type: string) {
  switch (type) {
    case "payment":
      return "text-emerald-700 bg-emerald-500/10 border-emerald-500/30";
    case "payout":
      return "text-primary bg-primary/10 border-primary/30";
    case "refund":
      return "text-destructive bg-destructive/10 border-destructive/30";
    default:
      return "text-muted-foreground bg-muted/30 border-border";
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case "succeeded":
      return "text-emerald-700 bg-emerald-500/10 border-emerald-500/30";
    case "pending":
      return "text-amber-700 bg-amber-500/10 border-amber-500/30";
    case "failed":
      return "text-destructive bg-destructive/10 border-destructive/30";
    default:
      return "text-muted-foreground bg-muted/30 border-border";
  }
}

export default function EarningsPage() {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await api.get("/api/consultant/wallet", {
        params: { page },
      });
      setData(res.data);
    } catch (error) {
      console.error("Failed to load wallet", error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        {/* ── Header ──────────────────────────────────────────────── */}
        <header className="mb-8">
          <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Consultant
          </p>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Earnings
          </h1>
        </header>

        {/* ── Stats Cards ─────────────────────────────────────────── */}
        {loading ? (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="h-28 animate-pulse border border-border bg-muted" />
            <div className="h-28 animate-pulse border border-border bg-muted" />
          </div>
        ) : (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="border border-foreground bg-foreground p-6 text-background">
              <p className="font-sans text-xs text-background/60 uppercase">
                Total Balance
              </p>
              <p className="mt-2 font-heading text-2xl font-semibold">
                {formatCurrency(data?.balance_bdt ?? 0)}
              </p>
            </div>
            <div className="border border-border bg-card p-6">
              <p className="font-sans text-xs text-muted-foreground uppercase">
                This Month
              </p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
                {formatCurrency(data?.monthly_earnings ?? 0)}
              </p>
              {(data?.change_percent ?? 0) !== 0 && (
                <div className="mt-2 flex items-center gap-1">
                  {(data?.change_percent ?? 0) >= 0 ? (
                    <TrendUp size={14} weight="bold" className="text-emerald-500" />
                  ) : (
                    <TrendDown size={14} weight="bold" className="text-destructive" />
                  )}
                  <span
                    className={`font-sans text-xs font-medium ${
                      (data?.change_percent ?? 0) >= 0
                        ? "text-emerald-600"
                        : "text-destructive"
                    }`}
                  >
                    {(data?.change_percent ?? 0) >= 0 ? "+" : ""}
                    {data?.change_percent ?? 0}% vs last month
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Transactions Table ──────────────────────────────────── */}
        <div className="border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Transactions
            </p>
            <p className="mt-1 font-heading text-sm font-semibold text-foreground">
              Recent Activity
            </p>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse bg-muted" />
              ))}
            </div>
          ) : (data?.transactions ?? []).length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-heading text-sm font-medium text-foreground">
                No transactions yet
              </p>
              <p className="mt-1 font-sans text-xs text-muted-foreground">
                Completed session payouts will appear here.
              </p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-6 border-b border-border bg-muted/30 px-6 py-3">
                <span className="font-sans text-[10px] font-semibold text-muted-foreground uppercase">
                  Date
                </span>
                <span className="font-sans text-[10px] font-semibold text-muted-foreground uppercase">
                  Type
                </span>
                <span className="font-sans text-[10px] font-semibold text-muted-foreground uppercase">
                  Status
                </span>
                <span className="font-sans text-[10px] font-semibold text-muted-foreground uppercase text-right">
                  Amount
                </span>
                <span className="font-sans text-[10px] font-semibold text-muted-foreground uppercase text-right">
                  Fee
                </span>
                <span className="font-sans text-[10px] font-semibold text-muted-foreground uppercase text-right">
                  Net
                </span>
              </div>

              {/* Rows */}
              {data?.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="grid grid-cols-6 items-center border-b border-border/50 px-6 py-4 last:border-b-0"
                >
                  <span className="font-sans text-xs text-muted-foreground">
                    {formatDate(tx.created_at)}
                  </span>
                  <span
                    className={`inline-flex w-fit border px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wider ${getTypeStyle(tx.type)}`}
                  >
                    {tx.type}
                  </span>
                  <span
                    className={`inline-flex w-fit border px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wider ${getStatusStyle(tx.status)}`}
                  >
                    {tx.status}
                  </span>
                  <span className="font-sans text-xs text-foreground text-right">
                    {formatCurrency(tx.total_amount)}
                  </span>
                  <span className="font-sans text-xs text-muted-foreground text-right">
                    {formatCurrency(tx.platform_fee)}
                  </span>
                  <span className="font-sans text-xs font-medium text-foreground text-right">
                    {formatCurrency(tx.consultant_net)}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ── Pagination ──────────────────────────────────────────── */}
        {data?.meta && data.meta.last_page > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ArrowRight size={14} className="rotate-180" />
            </Button>
            <span className="font-sans text-xs text-muted-foreground">
              Page {data.meta.current_page} of {data.meta.last_page}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.meta.last_page}
              onClick={() => setPage((p) => p + 1)}
            >
              <ArrowRight size={14} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
