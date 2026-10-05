"use client";

/** Last-resort error boundary: replaces the root layout, so it cannot rely on providers or CSS. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#eef2f7", margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ background: "#fff", border: "1px solid #d9dee8", borderRadius: 8, padding: 32, maxWidth: 440, textAlign: "center" }}>
          <h1 style={{ color: "#0c2340", fontSize: 20, margin: 0 }}>Something went wrong · कुछ गलत हो गया</h1>
          <p style={{ color: "#5b6476", fontSize: 14 }}>Please try again. · कृपया पुनः प्रयास करें।</p>
          <button
            type="button"
            onClick={reset}
            style={{ background: "#0c2340", color: "#fff", border: 0, borderRadius: 6, padding: "10px 18px", fontWeight: 600, cursor: "pointer" }}
          >
            Try again · पुनः प्रयास करें
          </button>
        </div>
      </body>
    </html>
  );
}
