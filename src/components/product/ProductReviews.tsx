"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  Star, BadgeCheck, ThumbsUp, MessageCircle, ShieldCheck,
  RefreshCw, Truck, Lock, X, Upload, Play, ChevronDown,
} from "lucide-react";
import { formatDate } from "@/lib/utils/date";

interface ReviewMedia { id: string; url: string; type: "IMAGE" | "VIDEO" }
interface ReviewUser { id: string; firstName: string | null; lastName: string | null; profileImage: string | null }
interface ReviewData {
  id: string; userId: string; productId: string; rating: number;
  title: string | null; comment: string | null; isVerifiedPurchase: boolean;
  createdAt: string; media: ReviewMedia[]; user: ReviewUser;
}
interface RatingBreakdown { five: number; four: number; three: number; two: number; one: number }
interface ReviewSummaryData { averageRating: number; totalReviews: number; ratingBreakdown: RatingBreakdown }
interface QAItem {
  id: string; question: string; answer: string | null; answeredBy: string | null;
  answeredAt: string | null; createdAt: string; user: { firstName: string | null; lastName: string | null };
}
interface ProductReviewsProps {
  productId: string; initialReviews: ReviewData[];
  initialSummary: ReviewSummaryData; initialTotalPages: number;
}

function reviewerName(user: ReviewUser) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || "Shopka User";
}
function initials(user: ReviewUser) {
  return reviewerName(user).split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const BREAKDOWN_ROWS: { key: keyof RatingBreakdown; label: string }[] = [
  { key: "five", label: "5" }, { key: "four", label: "4" }, { key: "three", label: "3" },
  { key: "two", label: "2" }, { key: "one", label: "1" },
];

function StarSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
          className="p-0.5" aria-label={`${n} star`}>
          <Star size={28} className={`transition ${(hovered||value)>=n ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewData }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [lbType, setLbType] = useState<"IMAGE"|"VIDEO">("IMAGE");
  return (
    <div className="border-b border-gray-100 py-5 last:border-none">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand">
            {initials(review.user)}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{reviewerName(review.user)}</p>
            <p className="text-xs text-gray-400">{formatDate(review.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="flex items-center gap-1 rounded bg-brand px-2 py-0.5 text-xs font-bold text-white">
            {review.rating} <Star size={10} className="fill-white" />
          </span>
          {review.isVerifiedPurchase && (
            <span className="flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
              <BadgeCheck size={12} /> Verified Purchase
            </span>
          )}
        </div>
      </div>
      {review.title && <p className="mt-3 text-sm font-semibold text-gray-800">{review.title}</p>}
      {review.comment && <p className="mt-1 text-sm leading-relaxed text-gray-600">{review.comment}</p>}
      {review.media.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {review.media.map((m) => (
            <button key={m.id} onClick={() => { setLightbox(m.url); setLbType(m.type); }}
              className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              {m.type === "IMAGE"
                ? <Image src={m.url} alt="Review photo" fill sizes="80px" className="object-cover" />
                : <div className="flex h-full w-full items-center justify-center bg-gray-900"><Play size={24} className="fill-white text-white" /></div>}
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-gray-400">Helpful?</span>
        <button className="flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-500 hover:border-brand hover:text-brand">
          <ThumbsUp size={12} /> Yes
        </button>
      </div>
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setLightbox(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white" onClick={() => setLightbox(null)}><X size={20} /></button>
          {lbType === "IMAGE"
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={lightbox} alt="Review" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
            : <video src={lightbox} controls autoPlay className="max-h-[90vh] max-w-[90vw] rounded-lg" />}
        </div>
      )}
    </div>
  );
}

function WriteReviewModal({ productId, onClose, onSubmit }: { productId: string; onClose: () => void; onSubmit: (r: ReviewData) => void }) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [mediaItems, setMediaItems] = useState<{ url: string; publicId?: string; type: "IMAGE"|"VIDEO"; preview: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (mediaItems.length + files.length > 5) { setError("Max 5 files."); return; }
    setUploading(true); setError("");
    for (const file of files) {
      const fd = new FormData(); fd.append("file", file);
      try {
        const res = await fetch("/api/upload/review-media", { method: "POST", body: fd });
        const json = await res.json();
        if (!json.success) { setError(json.message ?? "Upload failed."); continue; }
        setMediaItems((prev) => [...prev, { ...json.data, preview: URL.createObjectURL(file) }]);
      } catch { setError("Upload failed."); }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit() {
    if (!rating) { setError("Please select a rating."); return; }
    if (!comment.trim()) { setError("Please write a review."); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title: title.trim()||undefined, comment: comment.trim(),
          mediaItems: mediaItems.map(({ url, publicId, type }) => ({ url, publicId, type })) }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.message ?? "Unable to submit."); return; }
      onSubmit(json.data); onClose();
    } catch { setError("Something went wrong."); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800">Write a Review</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="mb-4"><p className="mb-2 text-sm text-gray-600">Your rating *</p><StarSelector value={rating} onChange={setRating} /></div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Review title (optional)"
          className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand" />
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4}
          placeholder="Share your experience *"
          className="mb-3 w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand" />
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-gray-500">Add photos/videos (max 5, videos up to 15s)</p>
          <div className="flex flex-wrap gap-2">
            {mediaItems.map((m, i) => (
              <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200">
                {m.type==="IMAGE"
                  ? <Image src={m.preview} alt="" fill sizes="64px" className="object-cover" />
                  : <div className="flex h-full w-full items-center justify-center bg-gray-800"><Play size={20} className="fill-white text-white" /></div>}
                <button onClick={() => setMediaItems((p) => p.filter((_,j) => j!==i))}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5"><X size={10} className="text-white" /></button>
              </div>
            ))}
            {mediaItems.length < 5 && (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-brand hover:text-brand disabled:opacity-50">
                <Upload size={18} /><span className="text-[10px]">{uploading ? "..." : "Add"}</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
            multiple className="hidden" onChange={handleFileChange} />
        </div>
        {error && <p className="mb-3 text-xs font-medium text-red-600">{error}</p>}
        <button onClick={handleSubmit} disabled={submitting||uploading}
          className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {submitting ? "Submitting..." : "Submit Review"}
        </button>
      </div>
    </div>
  );
}

function QASection({ productId }: { productId: string }) {
  const [qas, setQas] = useState<QAItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState(false);

  async function load() {
    if (loaded) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/qa`);
      const json = await res.json();
      if (json.success) setQas(json.data);
    } finally { setLoading(false); setLoaded(true); }
  }

  async function handleAsk() {
    if (!question.trim()) { setError("Please enter your question."); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`/api/products/${productId}/qa`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.message ?? "Failed."); return; }
      setQas((prev) => [json.data, ...prev]);
      setQuestion("");
    } catch { setError("Something went wrong."); }
    finally { setSubmitting(false); }
  }

  const visible = showAll ? qas : qas.slice(0, 3);

  return (
    <section className="mt-6 rounded-xl border border-gray-100 bg-white p-5 sm:p-6">
      <button className="flex w-full items-center justify-between"
        onClick={() => { setOpen((v) => !v); load(); }}>
        <h2 className="flex items-center gap-2 font-semibold text-gray-800">
          <MessageCircle size={18} className="text-brand" /> Questions &amp; Answers
          {qas.length > 0 && <span className="text-sm font-normal text-gray-400">({qas.length})</span>}
        </h2>
        <ChevronDown size={16} className={`text-gray-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-4">
          {loading && <p className="text-sm text-gray-400">Loading...</p>}
          {loaded && visible.map((qa) => (
            <div key={qa.id} className="mb-4 last:mb-0">
              <div className="flex gap-2">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand">Q</span>
                <p className="text-sm font-medium text-gray-800">{qa.question}</p>
              </div>
              {qa.answer
                ? <div className="mt-2 flex gap-2 ml-1">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-50 text-xs font-bold text-green-700">A</span>
                    <div>
                      <p className="text-sm text-gray-600">{qa.answer}</p>
                      {qa.answeredBy && <span className="mt-1 inline-block rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">{qa.answeredBy}</span>}
                    </div>
                  </div>
                : <p className="mt-1 ml-8 text-xs text-gray-400">Awaiting answer from seller...</p>}
            </div>
          ))}
          {loaded && qas.length > 3 && !showAll && (
            <button onClick={() => setShowAll(true)} className="mt-2 text-sm font-medium text-brand hover:underline">
              View all {qas.length} questions
            </button>
          )}
          <div className="mt-4 flex gap-2">
            <input value={question} onChange={(e) => { setQuestion(e.target.value); setError(""); }}
              onFocus={load} placeholder="Ask a question about this product..."
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand" />
            <button onClick={handleAsk} disabled={submitting}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">Ask</button>
          </div>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </section>
  );
}

function ReturnPolicy() {
  return (
    <section className="mt-6 rounded-xl border border-gray-100 bg-white p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-800">
        <ShieldCheck size={18} className="text-brand" /> Return &amp; Buyer Protection
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: <RefreshCw size={18} className="text-brand" />, title: "7-Day Return", desc: "No questions asked" },
          { icon: <Truck size={18} className="text-brand" />, title: "Free Pickup", desc: "From your doorstep" },
          { icon: <ShieldCheck size={18} className="text-brand" />, title: "Full Refund", desc: "Within 5–7 days" },
          { icon: <Lock size={18} className="text-brand" />, title: "Secure Payment", desc: "256-bit SSL" },
        ].map((item) => (
          <div key={item.title} className="flex gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
            <div className="mt-0.5 shrink-0">{item.icon}</div>
            <div>
              <p className="text-xs font-semibold text-gray-800">{item.title}</p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-lg border border-brand/20 bg-brand-50/40 p-3">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-brand" />
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Shopka Buyer Promise</span> — Agar product expected jaisa nahi aaya, toh hum poora refund denge. Aapka trust humari priority hai. 🙏
        </p>
      </div>
    </section>
  );
}

export default function ProductReviews({ productId, initialReviews, initialSummary, initialTotalPages }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<ReviewData[]>(initialReviews);
  const [summary, setSummary] = useState<ReviewSummaryData>(initialSummary);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filter, setFilter] = useState("all");
  const [showWriteReview, setShowWriteReview] = useState(false);

  const maxBreakdown = Math.max(1, ...BREAKDOWN_ROWS.map((r) => summary.ratingBreakdown[r.key]));

  async function applyFilter(f: string) {
    setFilter(f); setPage(1);
    const res = await fetch(`/api/products/${productId}/reviews?page=1&limit=5&filter=${f}`);
    const json = await res.json();
    if (json.success) { setReviews(json.data.data); setTotalPages(json.data.totalPages); }
  }

  async function loadMore() {
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/products/${productId}/reviews?page=${nextPage}&limit=5&filter=${filter}`);
      const json = await res.json();
      if (json.success && json.data) { setReviews((prev) => [...prev, ...json.data.data]); setPage(nextPage); setTotalPages(json.data.totalPages); }
    } finally { setIsLoadingMore(false); }
  }

  function handleNewReview(review: ReviewData) {
    setReviews((prev) => [review, ...prev]);
    setSummary((prev) => ({
      ...prev, totalReviews: prev.totalReviews + 1,
      averageRating: parseFloat(((prev.averageRating * prev.totalReviews + review.rating) / (prev.totalReviews + 1)).toFixed(2)),
    }));
  }

  const FILTERS = [
    { label: `All (${summary.totalReviews})`, value: "all" },
    { label: "With Photos", value: "photos" },
    { label: "5 ★", value: "5" }, { label: "4 ★", value: "4" }, { label: "3 ★", value: "3" },
  ];

  return (
    <>
      <section className="mt-8 rounded-xl border border-gray-100 bg-white p-5 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-gray-800">
            <Star size={18} className="fill-amber-400 text-amber-400" /> Ratings &amp; Reviews
          </h2>
          <button onClick={() => setShowWriteReview(true)}
            className="rounded-lg border-2 border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand-50">
            Write Review
          </button>
        </div>

        {summary.totalReviews === 0 ? (
          <div className="py-8 text-center">
            <Star size={36} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400">No reviews yet — be the first!</p>
            <button onClick={() => setShowWriteReview(true)}
              className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Write a Review</button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex shrink-0 flex-col items-center gap-1">
                <p className="text-5xl font-bold text-gray-900">{summary.averageRating.toFixed(1)}</p>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map((n) => <Star key={n} size={14} className={summary.averageRating>=n ? "fill-amber-400 text-amber-400" : "text-gray-200"} />)}
                </div>
                <p className="text-xs text-gray-400">{summary.totalReviews} reviews</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {BREAKDOWN_ROWS.map((row) => {
                  const count = summary.ratingBreakdown[row.key];
                  const pct = (count / maxBreakdown) * 100;
                  return (
                    <button key={row.key} onClick={() => applyFilter(row.label)}
                      className="flex w-full items-center gap-2 text-xs hover:opacity-80">
                      <span className="w-6 shrink-0 text-right text-gray-500">{row.label}</span>
                      <Star size={10} className="shrink-0 fill-amber-400 text-amber-400" />
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 shrink-0 text-gray-400">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((f) => (
                <button key={f.value} onClick={() => applyFilter(f.value)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${filter===f.value ? "border-brand bg-brand-50 text-brand" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}>
                  {f.label}
                </button>
              ))}
            </div>

            <div>{reviews.map((r) => <ReviewCard key={r.id} review={r} />)}</div>
            {reviews.length === 0 && <p className="py-6 text-center text-sm text-gray-400">No reviews match this filter.</p>}
            {page < totalPages && (
              <button onClick={loadMore} disabled={isLoadingMore}
                className="mt-4 w-full rounded-lg border py-2.5 text-sm font-semibold text-brand hover:bg-brand-50 disabled:opacity-60">
                {isLoadingMore ? "Loading..." : "Load More Reviews"}
              </button>
            )}
          </>
        )}
      </section>

      <QASection productId={productId} />
      <ReturnPolicy />

      {showWriteReview && (
        <WriteReviewModal productId={productId} onClose={() => setShowWriteReview(false)} onSubmit={handleNewReview} />
      )}
    </>
  );
}
