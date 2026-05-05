import { Search } from 'lucide-react';

export default function PublicListingsLoading() {
  return (
    <main className="min-h-screen bg-[#FAFAF9] px-5 py-10 text-[#1C1917] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="h-10 w-36 rounded-full bg-muted" />
        <div className="mt-10 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              <div className="h-5 w-24 rounded bg-muted" />
            </div>
            <div className="mt-5 space-y-4">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index}>
                  <div className="h-3 w-20 rounded bg-muted" />
                  <div className="mt-2 h-10 rounded-xl bg-muted" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
              >
                <div className="aspect-[4/3] bg-muted" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-2/3 rounded bg-muted" />
                  <div className="h-5 w-full rounded bg-muted" />
                  <div className="h-4 w-1/2 rounded bg-muted" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-14 rounded-xl bg-muted" />
                    <div className="h-14 rounded-xl bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
