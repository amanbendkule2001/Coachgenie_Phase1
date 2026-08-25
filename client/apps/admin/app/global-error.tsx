"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white px-4 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Application Error</h1>
          <p className="text-sm text-slate-400">
            A critical system error occurred. Please refresh the page or return to safety.
          </p>
          <div className="pt-2">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-500 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
