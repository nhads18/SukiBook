import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

/** Root error boundary — a runtime crash shows a readable card instead of a white screen. */
class Boundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  render() {
    if (this.state.err) {
      return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f1f2ea", fontFamily: "Instrument Sans, sans-serif", padding: 24 }}>
          <div style={{ maxWidth: 460, background: "#fcfcf7", border: "1px solid #e0e2d2", borderRadius: 14, padding: 28, boxShadow: "0 20px 50px -20px rgba(11,39,27,.35)" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#d98a0b" }}>SukiBook · runtime error</p>
            <h1 style={{ margin: "8px 0 10px", fontFamily: "Bricolage Grotesque, sans-serif", fontSize: 24, color: "#1b2a21" }}>Something broke on load</h1>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#4c5c51" }}>
              The ledger hit a snag. This is usually a stale cache — try a hard refresh. If it persists, the detail below pinpoints it:
            </p>
            <pre style={{ margin: "14px 0 0", padding: 12, borderRadius: 10, background: "#0b271b", color: "#f6a81c", fontSize: 11, lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre-wrap" }}>
              {String(this.state.err?.message ?? this.state.err)}
            </pre>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => window.location.reload()} style={{ flex: 1, border: 0, borderRadius: 10, background: "#f6a81c", color: "#0b271b", fontWeight: 800, padding: "10px 0", cursor: "pointer", fontFamily: "inherit" }}>
                Reload app
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem("sukibook:v3");
                  } catch {
                    /* ignore */
                  }
                  window.location.reload();
                }}
                style={{ flex: 1, border: "1px solid #e0e2d2", borderRadius: 10, background: "#fcfcf7", color: "#1b2a21", fontWeight: 700, padding: "10px 0", cursor: "pointer", fontFamily: "inherit" }}
              >
                Clear local data & reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Boundary>
    <App />
  </Boundary>,
);

// PWA: cache the app shell so cached reports stay readable offline (spec §9).
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
