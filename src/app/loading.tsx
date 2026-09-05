export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 bg-white">
      <div className="flex h-16 w-16 animate-[shopka-pulse_1.4s_ease-in-out_infinite] items-center justify-center rounded-2xl bg-brand text-2xl font-medium text-white">
        S
      </div>
      <p className="text-lg font-medium text-gray-800">Shopka</p>
      <div className="flex gap-1.5">
        <span
          className="h-2 w-2 animate-[shopka-bounce_1s_ease-in-out_infinite] rounded-full bg-brand"
          style={{ animationDelay: "0s" }}
        />
        <span
          className="h-2 w-2 animate-[shopka-bounce_1s_ease-in-out_infinite] rounded-full bg-brand"
          style={{ animationDelay: "0.15s" }}
        />
        <span
          className="h-2 w-2 animate-[shopka-bounce_1s_ease-in-out_infinite] rounded-full bg-brand"
          style={{ animationDelay: "0.3s" }}
        />
      </div>
    </div>
  );
}
