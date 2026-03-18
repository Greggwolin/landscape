import { useState, useEffect, useCallback } from "react";

const INTENTS = [
  { key: "structured_ingestion", label: "Extract", color: "#4f46e5", bgActive: "#4f46e5", destination: "Project DMS", destIcon: "📂", destColor: "#4f46e5" },
  { key: "global_intelligence", label: "Knowledge", color: "#0891b2", bgActive: "#0891b2", destination: "Knowledge Base", destIcon: "🧠", destColor: "#0891b2" },
  { key: "dms_only", label: "Store", color: "#6b7280", bgActive: "#6b7280", destination: "Project DMS", destIcon: "📂", destColor: "#6b7280" },
];

const DEST_INFO = {
  structured_ingestion: { label: "Project DMS + Workbench", icon: "📂", color: "#a78bfa", note: "Visible in project files, opens field review" },
  global_intelligence: { label: "Knowledge Base only", icon: "🧠", color: "#22d3ee", note: "Not visible in project files" },
  dms_only: { label: "Project DMS", icon: "📂", color: "#9ca3af", note: "Visible in project files, no processing" },
};

const FILE_ICONS = { xlsx: "📊", xls: "📊", csv: "📊", pdf: "📄", doc: "📝", docx: "📝", jpg: "🖼️", png: "🖼️", txt: "📎" };

function getIcon(name) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return FILE_ICONS[ext] || "📎";
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function classifyFile(name) {
  const n = name.toLowerCase();
  if (n.includes("rent") || n.includes("t-12") || n.includes("t12") || n.includes("operating"))
    return { docType: "Operating Statement", intent: "structured_ingestion", confidence: 0.85 };
  if (n.includes("costar") || n.includes("mf") || n.includes("offering") || n.includes("om"))
    return { docType: "Property Data", intent: "structured_ingestion", confidence: 0.6 };
  if (n.includes("appraisal") || n.includes("market") || n.includes("bov"))
    return { docType: "Appraisal", intent: "global_intelligence", confidence: 0.8 };
  if (n.includes("survey") || n.includes("title") || n.includes("legal") || n.includes("plat"))
    return { docType: "Legal", intent: "dms_only", confidence: 0.5 };
  return { docType: "General", intent: "global_intelligence", confidence: 0.35 };
}

function confLabel(c) {
  if (c >= 0.7) return { text: "High", color: "#16a34a", bg: "rgba(34,197,94,0.12)" };
  if (c >= 0.45) return { text: "Med", color: "#ca8a04", bg: "rgba(234,179,8,0.12)" };
  return { text: "Low", color: "#6b7280", bg: "rgba(156,163,175,0.12)" };
}

const COLLISIONS = {
  "Budget_Draft_v2.xlsx": { matchType: "filename", existingVersion: 1 },
};

const SAMPLE_FILES = [
  { name: "Costar_MF_partial.xlsx", size: 12700 },
  { name: "Chadron_Appraisal.pdf", size: 2200000 },
  { name: "Title_Report.pdf", size: 891000 },
  { name: "Rent_Roll_Q1.xlsx", size: 45200 },
  { name: "Budget_Draft_v2.xlsx", size: 28400 },
];

function IntentButton({ intent, active, onClick, disabled }) {
  const i = INTENTS.find((x) => x.key === intent);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontSize: "0.7rem",
        padding: "3px 10px",
        borderRadius: 4,
        border: active ? "none" : "1px solid #444",
        backgroundColor: active ? i.bgActive : "transparent",
        color: active ? "#fff" : "#999",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        fontWeight: active ? 600 : 400,
        transition: "all 0.15s ease",
      }}
    >
      {i.label}
    </button>
  );
}

function DestinationBadge({ intent }) {
  const d = DEST_INFO[intent];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        marginTop: 4,
        marginLeft: 36,
      }}
    >
      <span style={{ fontSize: "0.65rem" }}>{d.icon}</span>
      <span
        style={{
          fontSize: "0.6rem",
          color: d.color,
          fontWeight: 500,
        }}
      >
        → {d.label}
      </span>
      <span
        style={{
          fontSize: "0.55rem",
          color: "#555",
          marginLeft: 4,
        }}
      >
        {d.note}
      </span>
    </div>
  );
}

function FileRow({ file, onSetIntent, onRemove }) {
  const cl = classifyFile(file.name);
  const conf = confLabel(cl.confidence);
  const collision = COLLISIONS[file.name] || null;
  const isCollision = !!collision;

  return (
    <div
      style={{
        padding: "10px 16px",
        borderBottom: "1px solid #2a2a2a",
        backgroundColor: file.status === "complete" ? "rgba(34,197,94,0.04)" : file.status === "error" ? "rgba(239,68,68,0.04)" : "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Icon */}
        <span style={{ fontSize: "1.2rem", width: 24, textAlign: "center" }}>{getIcon(file.name)}</span>

        {/* File info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.85rem", color: "#e5e5e5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file.name}
          </div>
          <div style={{ fontSize: "0.7rem", color: "#888", marginTop: 2 }}>{formatSize(file.size)}</div>
        </div>

        {/* Doc type badge */}
        <div
          style={{
            fontSize: "0.7rem",
            padding: "2px 8px",
            borderRadius: 4,
            backgroundColor: "#1e1e2e",
            color: "#ccc",
            border: "1px solid #333",
            whiteSpace: "nowrap",
          }}
        >
          {cl.docType}
        </div>

        {/* Confidence */}
        <span
          style={{
            fontSize: "0.65rem",
            padding: "2px 6px",
            borderRadius: 10,
            backgroundColor: conf.bg,
            color: conf.color,
            whiteSpace: "nowrap",
          }}
        >
          {conf.text}
        </span>

        {/* Intent buttons */}
        <div style={{ display: "flex", gap: 4 }}>
          {INTENTS.map((i) => (
            <IntentButton key={i.key} intent={i.key} active={file.intent === i.key} onClick={() => onSetIntent(file.id, i.key)} disabled={isCollision || file.status === "uploading" || file.status === "complete"} />
          ))}
        </div>

        {/* Status / Cancel */}
        {file.status === "analyzing" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#888", fontSize: "0.7rem" }}>
            <div style={{ width: 12, height: 12, border: "2px solid #444", borderTopColor: "#888", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            Analyzing...
          </div>
        )}
        {file.status === "uploading" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#0891b2", fontSize: "0.7rem" }}>
            <div style={{ width: 12, height: 12, border: "2px solid #164e63", borderTopColor: "#0891b2", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            Uploading...
          </div>
        )}
        {file.status === "complete" && <span style={{ color: "#16a34a", fontSize: "1rem" }}>✓</span>}
        {file.status === "error" && <span style={{ color: "#ef4444", fontSize: "0.7rem" }}>Failed</span>}
        {(file.status === "ready" || file.status === "analyzing") && (
          <button
            onClick={() => onRemove(file.id)}
            style={{
              fontSize: "0.7rem",
              padding: "3px 8px",
              border: "1px solid #444",
              borderRadius: 4,
              backgroundColor: "transparent",
              color: "#999",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Destination indicator */}
      {file.status !== "complete" && file.status !== "error" && !isCollision && (
        <DestinationBadge intent={file.intent} />
      )}

      {/* Collision warning */}
      {isCollision && (
        <div style={{ marginTop: 6, marginLeft: 36, fontSize: "0.7rem", color: "#ca8a04" }}>
          ⚠ V{collision.existingVersion} already exists
          {collision.matchType === "both" || collision.matchType === "content" ? " — exact duplicate, no differences detected." : " — saving as new version."}
        </div>
      )}

      {/* Complete destination confirmation */}
      {file.status === "complete" && (
        <div style={{ marginTop: 4, marginLeft: 36, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: "0.6rem" }}>{DEST_INFO[file.intent].icon}</span>
          <span style={{ fontSize: "0.6rem", color: "#16a34a" }}>
            Saved to {DEST_INFO[file.intent].label}
          </span>
        </div>
      )}
    </div>
  );
}

export default function UnifiedIntakeModal() {
  const [files, setFiles] = useState([]);
  const [phase, setPhase] = useState("staging");

  useEffect(() => {
    const initial = SAMPLE_FILES.map((f, i) => ({
      ...f,
      id: `file-${i}`,
      status: "analyzing",
      intent: classifyFile(f.name).intent,
    }));
    setFiles(initial);

    initial.forEach((f, i) => {
      setTimeout(() => {
        setFiles((prev) => prev.map((p) => (p.id === f.id ? { ...p, status: "ready" } : p)));
      }, 600 + i * 400);
    });
  }, []);

  const setIntent = useCallback((id, intent) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, intent } : f)));
  }, []);

  const removeFile = useCallback((id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const setAllIntent = useCallback((intent) => {
    setFiles((prev) => prev.map((f) => (COLLISIONS[f.name] ? f : { ...f, intent })));
  }, []);

  const handleUpload = useCallback(() => {
    setPhase("uploading");
    const readyFiles = files.filter((f) => f.status === "ready");
    readyFiles.forEach((f, i) => {
      setTimeout(() => {
        setFiles((prev) => prev.map((p) => (p.id === f.id ? { ...p, status: "uploading" } : p)));
        setTimeout(() => {
          setFiles((prev) => prev.map((p) => (p.id === f.id ? { ...p, status: "complete" } : p)));
        }, 800 + Math.random() * 600);
      }, i * 500);
    });
    setTimeout(() => setPhase("complete"), readyFiles.length * 500 + 1500);
  }, [files]);

  const readyCount = files.filter((f) => f.status === "ready").length;
  const allDone = files.length > 0 && files.every((f) => f.status === "complete" || f.status === "error");

  // Destination summary
  const destCounts = files.reduce((acc, f) => {
    if (f.intent === "global_intelligence") acc.knowledge++;
    else acc.project++;
    return acc;
  }, { project: 0, knowledge: 0 });

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <div
        style={{
          width: "100%",
          maxWidth: 820,
          backgroundColor: "#141418",
          borderRadius: 12,
          border: "1px solid #2a2a2a",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #2a2a2a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#e5e5e5" }}>Upload Documents to Peoria Lakes MPC</div>
            <div style={{ fontSize: "0.7rem", color: "#888", marginTop: 2 }}>
              {files.length} file{files.length !== 1 ? "s" : ""} staged
              {allDone ? " — all complete" : ""}
            </div>
          </div>
          <button
            style={{
              width: 28, height: 28, borderRadius: 6, border: "1px solid #333",
              backgroundColor: "transparent", color: "#888", cursor: "pointer", fontSize: "1rem",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* Batch controls */}
        {phase === "staging" && files.length > 1 && (
          <div
            style={{
              padding: "10px 20px",
              borderBottom: "1px solid #2a2a2a",
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "#18181f",
            }}
          >
            <span style={{ fontSize: "0.7rem", color: "#888" }}>Set all to:</span>
            {INTENTS.map((i) => (
              <button
                key={i.key}
                onClick={() => setAllIntent(i.key)}
                style={{
                  fontSize: "0.7rem", padding: "4px 12px", borderRadius: 4,
                  border: "1px solid #333", backgroundColor: "transparent",
                  color: "#ccc", cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.target.style.backgroundColor = i.bgActive + "22"; e.target.style.borderColor = i.bgActive; }}
                onMouseLeave={(e) => { e.target.style.backgroundColor = "transparent"; e.target.style.borderColor = "#333"; }}
              >
                {i.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />

            {/* Destination summary pills */}
            <div style={{ display: "flex", gap: 6 }}>
              {destCounts.project > 0 && (
                <span style={{ fontSize: "0.6rem", padding: "2px 8px", borderRadius: 10, backgroundColor: "rgba(79,70,229,0.1)", color: "#a78bfa", border: "1px solid rgba(79,70,229,0.25)" }}>
                  📂 {destCounts.project} → Project
                </span>
              )}
              {destCounts.knowledge > 0 && (
                <span style={{ fontSize: "0.6rem", padding: "2px 8px", borderRadius: 10, backgroundColor: "rgba(8,145,178,0.1)", color: "#22d3ee", border: "1px solid rgba(8,145,178,0.25)" }}>
                  🧠 {destCounts.knowledge} → Knowledge only
                </span>
              )}
            </div>
          </div>
        )}

        {/* Column headers */}
        <div
          style={{
            padding: "6px 20px",
            borderBottom: "1px solid #222",
            display: "flex",
            alignItems: "center",
            gap: 12,
            backgroundColor: "#111116",
          }}
        >
          <span style={{ width: 24 }} />
          <span style={{ flex: 1, fontSize: "0.6rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>File</span>
          <span style={{ width: 80, fontSize: "0.6rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Type</span>
          <span style={{ width: 36, fontSize: "0.6rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Conf</span>
          <span style={{ width: 180, fontSize: "0.6rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Intent</span>
          <span style={{ width: 56 }} />
        </div>

        {/* File list */}
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          {files.map((f) => (
            <FileRow key={f.id} file={f} onSetIntent={setIntent} onRemove={removeFile} />
          ))}
          {files.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#555", fontSize: "0.85rem" }}>
              No files staged. Drag files here or use the Upload button.
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid #2a2a2a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#18181f",
          }}
        >
          {/* Destination legend */}
          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: "0.7rem" }}>📂</span>
              <span style={{ fontSize: "0.6rem", color: "#666" }}>Project DMS — visible in project files</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: "0.7rem" }}>🧠</span>
              <span style={{ fontSize: "0.6rem", color: "#666" }}>Knowledge Base — AI-searchable, not in project files</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={{
                fontSize: "0.8rem", padding: "8px 16px", borderRadius: 6,
                border: "1px solid #333", backgroundColor: "transparent",
                color: "#999", cursor: "pointer",
              }}
            >
              Cancel
            </button>
            {!allDone && (
              <button
                onClick={handleUpload}
                disabled={readyCount === 0 || phase === "uploading"}
                style={{
                  fontSize: "0.8rem", padding: "8px 20px", borderRadius: 6, border: "none",
                  backgroundColor: readyCount > 0 && phase !== "uploading" ? "#4f46e5" : "#333",
                  color: readyCount > 0 && phase !== "uploading" ? "#fff" : "#666",
                  cursor: readyCount > 0 && phase !== "uploading" ? "pointer" : "not-allowed",
                  fontWeight: 600,
                }}
              >
                {phase === "uploading" ? "Uploading..." : `Upload ${readyCount} Document${readyCount !== 1 ? "s" : ""}`}
              </button>
            )}
            {allDone && (
              <button
                style={{
                  fontSize: "0.8rem", padding: "8px 20px", borderRadius: 6, border: "none",
                  backgroundColor: "#16a34a", color: "#fff", cursor: "pointer", fontWeight: 600,
                }}
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
