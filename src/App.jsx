import { useState, useCallback, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

// ─────────────────────────────────────────────────────────────
// 1. DESIGN SYSTEM & DATA (Tetap sama seperti asli)
// ─────────────────────────────────────────────────────────────
const P = {
  bg: "#06090F", surface: "#0C1220", surfaceHigh: "#111B2E",
  border: "#1A2840", cyan: "#22D3EE", green: "#34D399",
  red: "#F87171", amber: "#FBBF24", purple: "#A78BFA",
  text: "#E2E8F0", sub: "#94A3B8", muted: "#475569",
};

// Data Default (Akan di-override jika ada data di localStorage)
const RAW_DEFAULT = [
  { b: "Jul'24", p: 285, e: 198 }, { b: "Agu'24", p: 312, e: 215 },
  { b: "Sep'24", p: 298, e: 225 }, { b: "Okt'24", p: 340, e: 210 },
  { b: "Nov'24", p: 378, e: 235 }, { b: "Des'24", p: 425, e: 280 },
  { b: "Jan'25", p: 310, e: 295 }, { b: "Feb'25", p: 295, e: 305 },
  { b: "Mar'25", p: 335, e: 285 },
];

const processData = (raw) => raw.map(d => ({
  bulan: d.b, pendapatan: d.p, beban: d.e,
  laba: d.p - d.e,
  gpm: parseFloat(((d.p - d.e) / d.p * 100).toFixed(1)),
  anomali: d.e > d.p * 0.9,
}));

// ─────────────────────────────────────────────────────────────
// 2. KOMPONEN UI KECIL (Helper Components)
// ─────────────────────────────────────────────────────────────
const CTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: P.surfaceHigh, border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 14px" }}>
      <div style={{ fontSize: 11, color: P.muted, fontWeight: 700, marginBottom: 6, letterSpacing: "0.06em" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, color: p.color, marginBottom: 2 }}>
          {p.name}: <span style={{ fontFamily: "monospace", fontWeight: 700 }}>Rp {p.value} Jt</span>
        </div>
      ))}
    </div>
  );
};

const KCard = ({ label, value, unit, d, accent = P.cyan, alert, sub }) => {
  const dNum = parseFloat(d);
  return (
    <div style={{
      background: P.surface, border: `1px solid ${alert ? P.amber + "88" : P.border}`,
      borderRadius: 12, padding: "14px 16px", position: "relative", overflow: "hidden",
      boxShadow: alert ? `0 0 16px ${P.amber}18` : "none",
    }}>
      {alert && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: P.amber }} />}
      <div style={{ fontSize: 10, color: P.muted, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, color: accent, lineHeight: 1 }}>
        {value}{unit && <span style={{ fontSize: 12, color: P.sub, marginLeft: 3 }}>{unit}</span>}
      </div>
      {d !== undefined && (
        <div style={{ fontSize: 11, color: dNum >= 0 ? P.green : P.red, marginTop: 5 }}>
          {dNum >= 0 ? "▲" : "▼"} {Math.abs(dNum)}% vs bln lalu
        </div>
      )}
      {sub && <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
};

const SecTitle = ({ icon, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
    <span style={{ fontSize: 14 }}>{icon}</span>
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: P.muted, textTransform: "uppercase" }}>{children}</span>
    <div style={{ flex: 1, height: "0.5px", background: P.border }} />
  </div>
);

// ─── FITUR BARU: Alert Banner ────────────────────────────────
const AlertBanner = ({ alerts }) => {
  if (alerts.length === 0) return null;
  return (
    <div style={{ padding: "12px 16px", background: P.surface, borderBottom: `1px solid ${P.border}` }}>
      {alerts.map((alert, i) => (
        <div key={i} style={{
          display: "flex", gap: 10, alignItems: "flex-start",
          padding: "10px 12px", borderRadius: 8, marginBottom: 8,
          background: alert.type === "critical" ? `${P.red}15` : `${P.amber}15`,
          border: `1px solid ${alert.type === "critical" ? P.red + "40" : P.amber + "40"}`,
          borderLeft: `3px solid ${alert.type === "critical" ? P.red : P.amber}`
        }}>
          <span style={{ fontSize: 14 }}>{alert.type === "critical" ? "🚨" : "⚠️"}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: P.text }}>{alert.title}</div>
            <div style={{ fontSize: 11, color: P.sub, marginTop: 2 }}>{alert.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── FITUR BARU: Goal Tracker Card ───────────────────────────
const GoalCard = ({ label, current, target, unit, color }) => {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const isMet = current >= target;
  return (
    <div style={{
      background: P.surface, border: `1px solid ${P.border}`,
      borderRadius: 12, padding: "14px 16px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: P.muted, fontWeight: 700 }}>{label}</span>
        <span style={{ 
          fontSize: 10, color: isMet ? P.green : P.amber, 
          background: isMet ? `${P.green}15` : `${P.amber}15`,
          padding: "2px 6px", borderRadius: 4, fontWeight: 700 
        }}>
          {isMet ? "✓ Tercapai" : `${pct}%`}
        </span>
      </div>
      <div style={{ height: 6, background: P.border, borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: isMet ? P.green : color,
          transition: "width 0.4s ease"
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
        <span style={{ fontFamily: "monospace", color: P.text }}>{current}{unit}</span>
        <span style={{ color: P.muted }}>Target: {target}{unit}</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 3. KOMPONEN UTAMA (Dashboard, AI, Proyeksi)
// ─────────────────────────────────────────────────────────────

function Dashboard({ onImportCSV, importStatus, goals }) {
  // Data diakses dari props atau context (disini kita pakai window untuk simplifikasi demo)
  const DATA = window.__APP_DATA || [];
  const LATEST = DATA[DATA.length - 1] || {};
  const PREV = DATA[DATA.length - 2] || {};
  const KAS = 1290;
  const RUNWAY = Math.floor(KAS / (LATEST.beban || 1));
  const ANOMALIES = DATA.filter(d => d.anomali);

  const pct = (a, b) => b ? (((a - b) / b) * 100).toFixed(1) : 0;

  return (
    <div style={{ padding: "16px" }}>
      {/* FITUR: Import CSV */}
      <SecTitle icon="📊">Ringkasan — {LATEST.bulan || "Mar 2025"}</SecTitle>
      <div style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{
          background: P.surface, border: `1px dashed ${P.border}`,
          borderRadius: 10, padding: "10px 14px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: P.sub
        }}>
          <span>📥</span> Import CSV
          <input type="file" accept=".csv" onChange={onImportCSV} style={{ display: "none" }} />
        </label>
        {importStatus === "loading" && <span style={{ fontSize: 11, color: P.cyan }}>⏳ Memproses...</span>}
        {importStatus?.startsWith("success") && <span style={{ fontSize: 11, color: P.green }}>✅ Data diperbarui!</span>}
        {importStatus?.startsWith("error") && <span style={{ fontSize: 11, color: P.red }}>❌ {importStatus.split(':')[1]}</span>}
        <a href={`data:text/csv;charset=utf-8,${encodeURIComponent('bulan,pendapatan,beban\nJul\'24,285,198')}`} 
           download="template_keuangan.csv"
           style={{ fontSize: 10, color: P.muted, textDecoration: "none", marginLeft: "auto" }}>
           📄 Download Template
        </a>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        <KCard label="Pendapatan" value={LATEST.pendapatan || 0} unit="Jt" d={pct(LATEST.pendapatan, PREV.pendapatan)} accent={P.cyan} />
        <KCard label="Laba Bersih" value={LATEST.laba || 0} unit="Jt" d={pct(LATEST.laba, PREV.laba)} accent={LATEST.laba > 0 ? P.green : P.red} />
        <KCard label="Gross Margin" value={`${LATEST.gpm || 0}%`} accent={LATEST.gpm > 20 ? P.green : P.amber} />
        <KCard label="Burn Rate" value={LATEST.beban || 0} unit="Jt/bln" accent={P.amber} />
        <KCard label="Kas Tersedia" value="1.290" unit="Jt" accent={P.cyan} />
        <KCard label="Runway" value={RUNWAY} unit="bulan" accent={RUNWAY > 6 ? P.green : P.red}
          alert={RUNWAY <= 6} sub={`Aman s/d ${["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][((2 + RUNWAY) % 12)]} '25`} />
      </div>

      {/* FITUR: Goal Tracker */}
      <SecTitle icon="🎯">Target vs Aktual</SecTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        <GoalCard label="Pendapatan Bulanan" current={LATEST.pendapatan || 0} target={goals.pendapatan} unit="Jt" color={P.cyan} />
        <GoalCard label="Gross Margin" current={LATEST.gpm || 0} target={goals.gpm} unit="%" color={P.green} />
        <GoalCard label="Runway Minimum" current={RUNWAY} target={goals.runway} unit="bln" color={RUNWAY >= goals.runway ? P.green : P.red} />
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`,
          borderRadius: 12, padding: "14px 16px",
          display: "flex", flexDirection: "column", justifyContent: "center",
          alignItems: "center", textAlign: "center"
        }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>⚙️</div>
          <div style={{ fontSize: 10, color: P.muted }}>Edit target di kode</div>
          <div style={{ fontSize: 9, color: P.sub, marginTop: 2 }}>App.jsx line 260</div>
        </div>
      </div>

      {/* Charts */}
      <SecTitle icon="📈">Tren Pendapatan vs Beban</SecTitle>
      <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: "16px 4px 8px", marginBottom: 20 }}>
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={DATA} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={P.cyan} stopOpacity={0.35} />
                <stop offset="95%" stopColor={P.cyan} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={P.red} stopOpacity={0.3} />
                <stop offset="95%" stopColor={P.red} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={P.border} strokeDasharray="3 3" />
            <XAxis dataKey="bulan" tick={{ fill: P.muted, fontSize: 9 }} />
            <YAxis tick={{ fill: P.muted, fontSize: 9 }} tickFormatter={v => `${v}`} />
            <Tooltip content={<CTip />} />
            <Area type="monotone" dataKey="pendapatan" name="Pendapatan" stroke={P.cyan} fill="url(#gP)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="beban" name="Beban" stroke={P.red} fill="url(#gE)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 4 }}>
          {[{ c: P.cyan, l: "Pendapatan" }, { c: P.red, l: "Beban" }].map(x => (
            <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: P.sub }}>
              <div style={{ width: 20, height: 2, background: x.c, borderRadius: 1 }} /> {x.l}
            </div>
          ))}
        </div>
      </div>

      <SecTitle icon="💰">Laba Bersih per Bulan</SecTitle>
      <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: "16px 4px 8px", marginBottom: 20 }}>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={DATA} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid stroke={P.border} strokeDasharray="3 3" />
            <XAxis dataKey="bulan" tick={{ fill: P.muted, fontSize: 9 }} />
            <YAxis tick={{ fill: P.muted, fontSize: 9 }} />
            <Tooltip content={<CTip />} />
            <Bar dataKey="laba" name="Laba Bersih" radius={[4, 4, 0, 0]}>
              {DATA.map((d, i) => <Cell key={i} fill={d.laba >= 0 ? P.green : P.red} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {ANOMALIES.length > 0 && (
        <>
          <SecTitle icon="⚠️">Deteksi Anomali</SecTitle>
          {ANOMALIES.map((d, i) => (
            <div key={i} style={{
              background: `${P.amber}12`, border: `1px solid ${P.amber}40`,
              borderRadius: 10, padding: "12px 14px", marginBottom: 8,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: P.amber }}>{d.bulan}</div>
                <div style={{ fontSize: 11, color: P.sub, marginTop: 2 }}>
                  Beban = {((d.beban / d.pendapatan) * 100).toFixed(0)}% dari pendapatan
                </div>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 12, color: d.laba >= 0 ? P.green : P.red, fontWeight: 700 }}>
                Laba Rp {d.laba}Jt
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function AnalisisAI({ aiText, aiLoading, callAI }) {
  const DATA = window.__APP_DATA || [];
  const LATEST = DATA[DATA.length - 1] || {};
  const RUNWAY = 4; // Dummy for safety if data empty
  const ANOMALIES = DATA.filter(d => d.anomali);

  return (
    <div style={{ padding: "16px" }}>
      <SecTitle icon="🤖">Executive Summary AI</SecTitle>
      <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: P.sub, lineHeight: 1.7, marginBottom: 18, textAlign: "center" }}>
          AI akan menganalisis data keuangan 9 bulan dan menghasilkan ringkasan eksekutif, deteksi risiko, dan rekomendasi aksi spesifik.
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button onClick={callAI} disabled={aiLoading} style={{
            background: aiLoading ? P.border : P.cyan, color: aiLoading ? P.muted : P.bg,
            border: "none", borderRadius: 8, padding: "11px 28px",
            fontSize: 13, fontWeight: 700, cursor: aiLoading ? "not-allowed" : "pointer",
            fontFamily: "inherit", transition: "opacity 0.2s",
          }}>
            {aiLoading ? "⏳ Menganalisis data..." : "⚡ Generate Analisis AI"}
          </button>
        </div>
      </div>

      {aiLoading && (
        <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: 28, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: P.muted }}>AI sedang membaca data keuangan Anda...</div>
          <div style={{ marginTop: 12, display: "flex", gap: 6, justifyContent: "center" }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: "50%", background: P.cyan,
                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
          <style>{`@keyframes pulse { 0%,80%,100%{opacity:0.2} 40%{opacity:1} }`}</style>
        </div>
      )}

      {aiText && !aiLoading && (
        <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: "20px 18px" }}>
          <div style={{ fontSize: 11, color: P.muted, letterSpacing: "0.08em", marginBottom: 14, textTransform: "uppercase", fontWeight: 700 }}>
            ● Hasil Analisis CFO AI
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.85, color: P.text, whiteSpace: "pre-wrap" }}>
            {aiText}
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <SecTitle icon="📋">Data Input ke AI</SecTitle>
        {DATA.map((d, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "9px 0", borderBottom: `1px solid ${P.border}`, fontSize: 12,
          }}>
            <div style={{ color: P.sub, width: 60 }}>{d.bulan}</div>
            <div style={{ color: P.cyan, fontFamily: "monospace" }}>Rp {d.pendapatan}Jt</div>
            <div style={{ color: P.red, fontFamily: "monospace" }}>Rp {d.beban}Jt</div>
            <div style={{ color: d.laba >= 0 ? P.green : P.red, fontFamily: "monospace", fontWeight: 700 }}>
              {d.laba >= 0 ? "+" : ""}{d.laba}Jt
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Proyeksi() {
  const [mode, setMode] = useState("base");
  const DATA = window.__APP_DATA || [];
  const LATEST = DATA[DATA.length - 1] || {};
  
  // Simple forecast logic
  const last3p = DATA.slice(-3).map(d => d.pendapatan);
  const last3e = DATA.slice(-3).map(d => d.beban);
  const trendP = (last3p[2] - last3p[0]) / 2;
  const trendE = (last3e[2] - last3e[0]) / 2;
  
  const FCAST = ["Apr'25", "Mei'25", "Jun'25"].map((bulan, i) => {
    const p = Math.round((LATEST.pendapatan || 0) + trendP * (i + 1));
    const e = Math.round((LATEST.beban || 0) + trendE * (i + 1));
    return { bulan, pendapatan: p, beban: e, laba: p - e, forecast: true };
  });

  const mult = mode === "optimis" ? 1.18 : mode === "pesimis" ? 0.82 : 1.0;
  const adj = FCAST.map(f => ({
    ...f,
    pendapatan: Math.round(f.pendapatan * mult),
    laba: Math.round(f.laba * mult),
  }));
  const chartData = [...DATA.slice(-4).map(d => ({ ...d, type: "aktual" })), ...adj.map(d => ({ ...d, type: "proyeksi" }))];

  return (
    <div style={{ padding: "16px" }}>
      <SecTitle icon="🔮">Proyeksi 3 Bulan</SecTitle>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["base", "📊 Base"], ["optimis", "🚀 Optimis (+18%)"], ["pesimis", "📉 Pesimis (−18%)"]].map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)} style={{
            flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 10, fontWeight: 700,
            border: `1px solid ${mode === k ? P.cyan : P.border}`,
            background: mode === k ? `${P.cyan}18` : P.surface,
            color: mode === k ? P.cyan : P.muted, cursor: "pointer", fontFamily: "inherit",
          }}>{l}</button>
        ))}
      </div>

      <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: "16px 4px 8px", marginBottom: 20 }}>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="gFP" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={P.cyan} stopOpacity={0.3} />
                <stop offset="95%" stopColor={P.cyan} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={P.border} strokeDasharray="3 3" />
            <XAxis dataKey="bulan" tick={{ fill: P.muted, fontSize: 9 }} />
            <YAxis tick={{ fill: P.muted, fontSize: 9 }} />
            <Tooltip content={<CTip />} />
            <Area type="monotone" dataKey="pendapatan" name="Pendapatan" stroke={P.cyan}
              fill="url(#gFP)" strokeWidth={2} dot={false} />
            <Bar dataKey="laba" name="Laba" radius={[3, 3, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.laba >= 0 ? P.green : P.red}
                  fillOpacity={d.type === "proyeksi" ? 0.5 : 0.85} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="beban" name="Beban" stroke={P.red}
              strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <SecTitle icon="📋">Tabel Proyeksi</SecTitle>
      <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "10px 14px", background: P.surfaceHigh, fontSize: 10, color: P.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <div>Bulan</div><div>Pendapatan</div><div>Beban</div><div>Laba Est.</div>
        </div>
        {adj.map((f, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "11px 14px", borderTop: `1px solid ${P.border}`, fontSize: 12 }}>
            <div style={{ color: P.amber, fontWeight: 700 }}>{f.bulan}</div>
            <div style={{ fontFamily: "monospace", color: P.cyan }}>{f.pendapatan}Jt</div>
            <div style={{ fontFamily: "monospace", color: P.red }}>{f.beban}Jt</div>
            <div style={{ fontFamily: "monospace", color: f.laba >= 0 ? P.green : P.red, fontWeight: 700 }}>{f.laba}Jt</div>
          </div>
        ))}
      </div>

      <SecTitle icon="💡">What-If Analysis</SecTitle>
      <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, padding: "14px 16px" }}>
        <div style={{ fontSize: 12, color: P.sub, lineHeight: 1.7 }}>
          <div style={{ marginBottom: 8, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ color: P.green, fontSize: 14 }}>✓</span>
            <span><strong style={{ color: P.text }}>Skenario Optimis (+18%):</strong> Pendapatan bisa mencapai Rp {Math.round(adj[2].pendapatan)}Jt di Jun'25 jika kampanye marketing efektif.</span>
          </div>
          <div style={{ marginBottom: 8, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ color: P.red, fontSize: 14 }}>✗</span>
            <span><strong style={{ color: P.text }}>Skenario Pesimis (−18%):</strong> Runway bisa memendek signifikan jika tren Jan-Feb'25 berulang.</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ color: P.amber, fontSize: 14 }}>!</span>
            <span><strong style={{ color: P.text }}>Prioritas:</strong> Tekan burn rate di bawah Rp 260Jt/bulan agar GPM kembali ke zona aman ≥20%.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. MAIN APP COMPONENT (Logic Integrasi)
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);
  
  // Target Goals
  const [goals] = useState({
    pendapatan: 400,
    gpm: 25,
    runway: 6
  });

  // Load Data (LocalStorage or Default)
  const [DATA, setDATA] = useState(() => {
    const saved = localStorage.getItem('financial_data');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) { console.error(e); }
    }
    return processData(RAW_DEFAULT);
  });

  // Make data accessible globally for child components (Simple Demo Pattern)
  useEffect(() => {
    window.__APP_DATA = DATA;
  }, [DATA]);

  // Derived Metrics
  const LATEST = DATA[DATA.length - 1] || {};
  const PREV = DATA[DATA.length - 2] || {};
  const KAS = 1290;
  const RUNWAY = Math.floor(KAS / (LATEST.beban || 1));
  const ANOMALIES = DATA.filter(d => d.anomali);

  // ─── FITUR: Alert System Logic ─────────────────────────────
  const checkAlerts = useCallback(() => {
    const newAlerts = [];
    if (!LATEST.pendapatan) return;

    if (LATEST.gpm < 15) {
      newAlerts.push({ type: "warning", title: "⚠️ Margin Tipis", message: `GPM ${LATEST.gpm}% di bawah target 15%. Segera review struktur beban.` });
    }
    if (RUNWAY < 3) {
      newAlerts.push({ type: "critical", title: "🚨 Runway Kritis", message: `Kas hanya cukup untuk ${RUNWAY} bulan. Prioritaskan fundraising atau cut cost.` });
    }
    const burnGrowth = PREV.beban ? ((LATEST.beban - PREV.beban) / PREV.beban) * 100 : 0;
    if (burnGrowth > 10) {
      newAlerts.push({ type: "warning", title: "📈 Burn Rate Naik", message: `Beban naik ${burnGrowth.toFixed(1)}% vs bulan lalu. Cek pos pengeluaran.` });
    }
    const last2Loss = DATA.slice(-2).every(d => d.laba < 0);
    if (last2Loss) {
      newAlerts.push({ type: "critical", title: "🔴 Rugi Beruntun", message: "Laba negatif 2 bulan berturut-turut. Evaluasi model bisnis segera." });
    }
    setAlerts(newAlerts);
  }, [LATEST, PREV, RUNWAY, DATA]);

  useEffect(() => { checkAlerts(); }, [checkAlerts]);

  // ─── FITUR: Export WhatsApp ────────────────────────────────
  const exportToWA = useCallback(() => {
    const summary = `📊 *LAPORAN KEUANGAN - ${LATEST.bulan}*
🏢 Logika Financial AI

💰 *Ringkasan*
• Pendapatan: Rp ${LATEST.pendapatan}Jt
• Beban: Rp ${LATEST.beban}Jt
• Laba Bersih: Rp ${LATEST.laba}Jt
• Gross Margin: ${LATEST.gpm}%

⚠️ *Metrik Kritis*
• Burn Rate: Rp ${LATEST.beban}Jt/bln
• Runway: ${RUNWAY} bulan
• Kas Tersedia: Rp ${KAS}Jt

${ANOMALIES.length > 0 ? `🚨 *Anomali Terdeteksi*: ${ANOMALIES.map(a => a.bulan).join(', ')}` : '✅ *Tidak ada anomali*'}

📈 *Tren 3 Bulan Terakhir*
${DATA.slice(-3).map(d => `• ${d.bulan}: Laba Rp ${d.laba}Jt (${d.gpm}%)`).join('\n')}

---
Generated by Logika Financial AI
${new Date().toLocaleDateString('id-ID')}`;

    const encoded = encodeURIComponent(summary);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }, [LATEST, RUNWAY, KAS, ANOMALIES, DATA]);

  // ─── FITUR: Import CSV Logic ───────────────────────────────
  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const pIdx = headers.findIndex(h => h.includes('pendapatan') || h === 'p');
    const eIdx = headers.findIndex(h => h.includes('beban') || h === 'e');
    const bIdx = headers.findIndex(h => h.includes('bulan') || h === 'b');
    
    if (pIdx === -1 || eIdx === -1) throw new Error("Format CSV tidak valid. Harus ada kolom: bulan, pendapatan, beban");
    
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim());
      const p = parseFloat(vals[pIdx]) || 0;
      const e = parseFloat(vals[eIdx]) || 0;
      return {
        b: vals[bIdx] || "", p, e,
        laba: p - e,
        gpm: p > 0 ? parseFloat(((p - e) / p * 100).toFixed(1)) : 0,
        anomali: e > p * 0.9
      };
    });
  };

  const handleImportCSV = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus("loading");
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = parseCSV(evt.target.result);
        if (parsed.length === 0) throw new Error("Data kosong");
        localStorage.setItem('financial_data', JSON.stringify(parsed));
        setDATA(parsed);
        setImportStatus("success");
        setTimeout(() => setImportStatus(null), 2000);
      } catch (err) {
        setImportStatus("error: " + err.message);
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  // ─── FITUR: AI Call Logic ──────────────────────────────────
  const callAI = useCallback(async () => {
    setAiLoading(true);
    setAiText("");
    try {
      const prompt = `Kamu adalah CFO AI untuk perusahaan menengah Indonesia. Berikan executive summary keuangan dalam Bahasa Indonesia yang tajam dan actionable.

DATA KEUANGAN 9 BULAN (Jul 2024 – Mar 2025):
${DATA.map(d => `${d.bulan}: Pendapatan Rp${d.pendapatan}Jt | Beban Rp${d.beban}Jt | Laba Rp${d.laba}Jt | GPM ${d.gpm}%`).join("\n")}

METRIK KRITIS:
- Burn Rate saat ini: Rp${LATEST.beban}Jt/bulan
- Runway: ${RUNWAY} bulan ke depan
- Kas tersedia: Rp${KAS}Jt
- Bulan anomali (beban > 90% pendapatan): ${ANOMALIES.map(a => a.bulan).join(", ") || "Tidak ada"}
- GPM terbaik: ${Math.max(...DATA.map(d => d.gpm))}% | GPM terburuk: ${Math.min(...DATA.map(d => d.gpm))}%

Format response PERSIS seperti ini (gunakan emoji, bahasa eksekutif, tegas):

🏦 KONDISI BISNIS
[2-3 kalimat ringkas kondisi finansial saat ini]

⚠️ RISIKO UTAMA
• [Risiko 1 dengan angka spesifik]
• [Risiko 2 dengan angka spesifik]
• [Risiko 3 dengan angka spesifik]

✅ REKOMENDASI AKSI
• [Aksi 1 — spesifik, ada target angka]
• [Aksi 2 — spesifik, ada target angka]
• [Aksi 3 — spesifik, ada timeline]

📈 OUTLOOK 3 BULAN
[2 kalimat proyeksi Apr–Jun 2025 berdasarkan tren data]`;

      // ⚠️ Ganti dengan endpoint backend Anda di production
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "Gagal mendapat respons.";
      setAiText(text);
    } catch {
      setAiText("❌ Koneksi ke AI gagal. Coba lagi.");
    }
    setAiLoading(false);
  }, [DATA, LATEST, RUNWAY, KAS, ANOMALIES]);

  const tabs = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "analisis", icon: "🤖", label: "AI Analisis" },
    { id: "proyeksi", icon: "🔮", label: "Proyeksi" },
  ];

  return (
    <div style={{ background: P.bg, minHeight: "100dvh", fontFamily: "system-ui, -apple-system, sans-serif", color: P.text, paddingBottom: 72 }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${P.bg}; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: ${P.border}; border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{
        background: P.surface, borderBottom: `1px solid ${P.border}`,
        padding: "14px 16px 12px", position: "sticky", top: 0, zIndex: 100,
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: P.muted, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>
              Logika Financial AI
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: P.text, marginTop: 1 }}>
              Laporan Keuangan
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {/* FITUR: Tombol Export WA */}
              <button onClick={exportToWA} style={{
                background: "#25D366", color: "#06090F",
                border: "none", borderRadius: 8,
                padding: "6px 12px", fontSize: 10, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 4,
                boxShadow: "0 2px 8px rgba(37,211,102,0.3)"
              }}>
                <span>📤</span> Export WA
              </button>
              <div style={{
                background: `${P.green}20`, border: `1px solid ${P.green}44`,
                borderRadius: 20, padding: "3px 9px", fontSize: 10, color: P.green, fontWeight: 700,
              }}>● DEMO LIVE</div>
            </div>
            <div style={{ fontSize: 10, color: P.muted }}>{LATEST.bulan || "Mar 2025"}</div>
          </div>
        </div>
      </div>

      {/* FITUR: Alert Banner */}
      {alerts.length > 0 && <AlertBanner alerts={alerts} />}

      {/* Content */}
      {tab === "dashboard" && <Dashboard onImportCSV={handleImportCSV} importStatus={importStatus} goals={goals} />}
      {tab === "analisis" && <AnalisisAI aiText={aiText} aiLoading={aiLoading} callAI={callAI} />}
      {tab === "proyeksi" && <Proyeksi />}

      {/* Bottom Nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: P.surface, borderTop: `1px solid ${P.border}`,
        display: "flex", zIndex: 9999,
        paddingBottom: "env(safe-area-inset-bottom)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px 0 8px", background: "none", border: "none",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            color: tab === t.id ? P.cyan : P.muted, cursor: "pointer",
            fontFamily: "inherit", transition: "color 0.15s",
            borderTop: tab === t.id ? `2px solid ${P.cyan}` : "2px solid transparent",
          }}>
            <span style={{ fontSize: 17 }}>{t.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}