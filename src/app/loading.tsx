export default function RootLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="w-4 h-4 border-2 border-[#d97706] border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] text-zinc-600 typewriter-label">LOADING...</span>
      </div>
    </div>
  );
}
