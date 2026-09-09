export default function SkeletonCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="aspect-square bg-gray-100" />

      <div className="flex flex-col gap-2 p-3">
        <div className="h-3 w-1/3 rounded bg-gray-100" />
        <div className="h-4 w-5/6 rounded bg-gray-200" />
        <div className="h-3 w-2/5 rounded bg-gray-100" />
        <div className="h-4 w-1/2 rounded bg-gray-200" />
        <div className="mt-1 h-9 rounded-xl bg-gray-100" />
      </div>

      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}