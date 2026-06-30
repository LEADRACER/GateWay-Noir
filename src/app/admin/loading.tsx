export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-xs text-zinc-600 typewriter-label">Loading HQ...</p>
      </div>
    </div>
  );
}
