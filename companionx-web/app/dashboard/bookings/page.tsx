"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/axios";
import { fetchCurrentUser } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import {
  VideoCamera,
  Check,
  X,
  ArrowRight,
  Star,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Booking = {
  id: number;
  ref: string;
  subtitle: string;
  status: string;
  scheduled_start: string;
  scheduled_end: string;
  price_at_booking: number;
  jitsi_room_uuid: string;
  stripe_session_id: string | null;
  is_first_time: boolean;
  review: {
    id: number;
    rating: number;
    comment: string | null;
  } | null;
};

type Meta = {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
};

const TABS = [
  { key: "booked", label: "Payment" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Upcoming" },
  { key: "completed", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusStyle(status: string) {
  switch (status) {
    case "pending":
      return "border-amber-500/40 text-amber-700 bg-amber-500/10";
    case "confirmed":
      return "border-emerald-500/40 text-emerald-700 bg-emerald-500/10";
    case "completed":
      return "border-primary/40 text-primary bg-primary/10";
    case "cancelled":
      return "border-border text-muted-foreground bg-muted/30";
    case "booked":
      return "border-amber-500/40 text-amber-700 bg-amber-500/10";
    default:
      return "border-border text-muted-foreground bg-muted/30";
  }
}

export default function BookingsPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "pending");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [verifyLoading, setVerifyLoading] = useState<number | null>(null);
  const [isConsultant, setIsConsultant] = useState(false);
  const [reviewModal, setReviewModal] = useState<{ bookingId: number; rating: number; comment: string } | null>(null);
  const [isEditReview, setIsEditReview] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchCurrentUser().then((u) => setIsConsultant(u?.system_role === "consultant"));
  }, []);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/bookings", {
        params: { status: activeTab, page },
      });
      setBookings(res.data.bookings);
      setMeta(res.data.meta);
    } catch (error) {
      console.error("Failed to load bookings", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    setPage(1);
    fetchBookings();
  }, [activeTab]);

  useEffect(() => {
    fetchBookings();
  }, [page]);

  const handleApprove = async (bookingId: number) => {
    setActionLoading(bookingId);
    try {
      await api.post(`/api/consultant/bookings/${bookingId}/approve`);
      await fetchBookings();
    } catch (error) {
      console.error("Failed to approve booking", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (bookingId: number) => {
    setActionLoading(bookingId);
    try {
      await api.post(`/api/consultant/bookings/${bookingId}/reject`);
      await fetchBookings();
    } catch (error) {
      console.error("Failed to reject booking", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyPayment = async (booking: Booking) => {
    setVerifyLoading(booking.id);
    try {
      if (!booking.stripe_session_id) {
        toast.error("No payment session found. Please contact support.");
        return;
      }
      await api.post("/api/bookings/complete", {
        session_id: booking.stripe_session_id,
        booking_id: booking.id,
      });
      toast.success("Payment verified! Session confirmed.");
      await fetchBookings();
    } catch {
      toast.error("Payment verification failed. Contact support.");
    } finally {
      setVerifyLoading(null);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewModal) return;
    setReviewLoading(true);
    try {
      await api.post("/api/reviews", {
        booking_id: reviewModal.bookingId,
        rating: reviewModal.rating,
        comment: reviewModal.comment,
      });
      toast.success("Review submitted!");
      setReviewModal(null);
      setIsEditReview(false);
      await fetchBookings();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Could not submit review.");
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        {/* ── Header ──────────────────────────────────────────────── */}
        <header className="mb-8">
          <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            {isConsultant ? "Consultant" : "User"}
          </p>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Bookings
          </h1>
        </header>

        {/* ── Tabs ────────────────────────────────────────────────── */}
        <div className="mb-6 flex items-center gap-1 border border-border bg-card p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                const params = new URLSearchParams(searchParams.toString());
                params.set("tab", tab.key);
                router.replace(`?${params.toString()}`);
              }}
              className={`flex-1 px-4 py-2.5 font-sans text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Bookings List ───────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse border border-border bg-muted" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="border border-border bg-card p-10 text-center">
            <p className="font-heading text-sm font-medium text-foreground">
              No {activeTab} bookings
            </p>
              <p className="mt-1 font-sans text-xs text-muted-foreground">
                {activeTab === "booked"
                  ? "Bookings awaiting payment confirmation will appear here."
                  : activeTab === "pending"
                    ? "New session requests will appear here."
                    : activeTab === "confirmed"
                      ? "Upcoming confirmed sessions will appear here."
                      : "Past sessions will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="border border-border bg-card px-6 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-sans text-sm font-medium text-foreground">
                        {booking.ref}
                      </span>
                      {booking.subtitle && (
                        <span className="font-sans text-xs text-muted-foreground">
                          {booking.subtitle}
                        </span>
                      )}
                      <span
                        className={`font-sans text-[10px] font-medium uppercase tracking-wider border px-2 py-0.5 ${getStatusStyle(booking.status)}`}
                      >
                        {booking.status}
                      </span>
                      {booking.is_first_time && (
                        <span className="font-sans text-[10px] text-muted-foreground">
                          First-time
                        </span>
                      )}
                    </div>
                    <p className="font-sans text-xs text-muted-foreground">
                      {formatDate(booking.scheduled_start)},{" "}
                      {formatTime(booking.scheduled_start)} –{" "}
                      {formatTime(booking.scheduled_end)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isConsultant && booking.status === "pending" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-medium"
                        onClick={() => handleReject(booking.id)}
                        disabled={actionLoading === booking.id}
                      >
                        <X size={14} weight="bold" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs font-medium"
                        onClick={() => handleApprove(booking.id)}
                        disabled={actionLoading === booking.id}
                      >
                        <Check size={14} weight="bold" />
                        Approve
                      </Button>
                    </>
                  )}
                  {booking.status === "booked" && (
                    <Button
                      size="sm"
                      className="text-xs font-medium"
                      onClick={() => handleVerifyPayment(booking)}
                      disabled={verifyLoading === booking.id}
                    >
                      {verifyLoading === booking.id ? "Verifying..." : "Verify Payment"}
                    </Button>
                  )}
                  {booking.status === "confirmed" && (
                    <Button
                      size="sm"
                      className="text-xs font-medium"
                      onClick={() =>
                        router.push(`/dashboard/room?room=${booking.jitsi_room_uuid}&bookingId=${booking.id}`)
                      }
                    >
                      <VideoCamera size={14} weight="bold" />
                      Join Session
                    </Button>
                  )}
                  {booking.status === "completed" && !isConsultant && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-medium"
                      onClick={() => {
                        setReviewModal({
                          bookingId: booking.id,
                          rating: booking.review?.rating ?? 5,
                          comment: booking.review?.comment ?? "",
                        });
                        setIsEditReview(!!booking.review);
                      }}
                    >
                      <Star size={14} weight={booking.review ? "fill" : "regular"} />
                      {booking.review ? "Edit Review" : "Write Review"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination ──────────────────────────────────────────── */}
        {meta && meta.last_page > 1 && (
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
              Page {meta.current_page} of {meta.last_page}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.last_page}
              onClick={() => setPage((p) => p + 1)}
            >
              <ArrowRight size={14} />
            </Button>
          </div>
        )}

        {/* ── Review Modal ──────────────────────────────────────────── */}
        {reviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !reviewLoading && (setReviewModal(null), setIsEditReview(false))}>
            <div className="w-full max-w-sm border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
                {isEditReview ? "Edit Review" : "Write a Review"}
              </h2>
              <div className="mb-5 flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewModal({ ...reviewModal, rating: star })}
                    className="transition-colors hover:scale-110"
                  >
                    <Star
                      size={28}
                      weight={star <= reviewModal.rating ? "fill" : "regular"}
                      className={star <= reviewModal.rating ? "text-amber-500" : "text-muted-foreground"}
                    />
                  </button>
                ))}
              </div>
              <textarea
                value={reviewModal.comment}
                onChange={(e) => setReviewModal({ ...reviewModal, comment: e.target.value })}
                placeholder="Share your experience (optional)"
                rows={4}
                className="mb-5 w-full border border-border bg-background px-4 py-3 font-sans text-sm text-foreground outline-none resize-none focus:border-primary transition-colors"
              />
              <div className="flex gap-3">
                <Button variant="outline" size="sm" className="flex-1 text-xs font-medium" onClick={() => { setReviewModal(null); setIsEditReview(false); }} disabled={reviewLoading}>
                  Cancel
                </Button>
                <Button size="sm" className="flex-1 text-xs font-medium" onClick={handleSubmitReview} disabled={reviewLoading}>
                  {reviewLoading ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
