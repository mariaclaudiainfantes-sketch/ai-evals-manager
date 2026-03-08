import { useState, useEffect, useCallback } from "react";
import Papa from "papaparse";

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE  (swap the two lines below to enable localStorage in your own env)
// ─────────────────────────────────────────────────────────────────────────────
const store = {
  get: (k)      => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set: (k, v)   => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del: (k)      => { try { localStorage.removeItem(k); } catch {} },
};
// In-memory fallback (used automatically if localStorage throws):
const _mem = {};
const memStore = {
  get: (k)    => _mem[k] ?? null,
  set: (k, v) => { _mem[k] = v; },
  del: (k)    => { delete _mem[k]; },
};
function safeStore() {
  try { localStorage.setItem("__test__","1"); localStorage.removeItem("__test__"); return store; }
  catch { return memStore; }
}
const db = safeStore();
const SESSIONS_KEY = "aievals_sessions";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const BUILTIN_FM = [
  { id:1, title:"Alucinación de Datos",   definition:"La IA inventó datos que no existían." },
  { id:2, title:"Tono Inadecuado",        definition:"El tono no es apropiado para el contexto." },
  { id:3, title:"Pérdida de Información", definition:"Se omitió información relevante." },
  { id:4, title:"Formato Roto",           definition:"El formato de salida no es correcto." },
  { id:5, title:"Exageración de Logros",  definition:"La IA amplificó logros más allá de lo indicado." },
];
const VIEWS = [
  { id:"home",     icon:"🏠", label:"Sesiones",        sub:"Home" },
  { id:"ingest",   icon:"📥", label:"Ingest Data",     sub:"CSV" },
  { id:"review",   icon:"🔍", label:"Trace Review",    sub:"Analyze" },
  { id:"taxonomy", icon:"🗂️", label:"Taxonomy",        sub:"Axial Coding" },
  { id:"judge",    icon:"⚖️", label:"Judge Studio",    sub:"Measure" },
  { id:"golden",   icon:"🛡️", label:"Golden Dataset",  sub:"Improve" },
  { id:"dashboard",icon:"📊", label:"Dashboard",       sub:"Statistics" },
];

// ─────────────────────────────────────────────────────────────────────────────
// GUIDE CONTENT
// ─────────────────────────────────────────────────────────────────────────────
const GUIDE = {
  review: {
    phase:"Fase ANALYZE — Open Coding",
    what:"Lee el CV original (Input) y el resultado de la IA (Output). Decide si pasa o falla (Pass/Fail) y deja una nota rápida explicando el porqué.",
    why:"La IA comete errores inesperados. Leer datos reales es la única forma de descubrir cómo falla en nuestro caso de uso específico.",
    next:"Cuando evalúes ~30 trazas, ve a 'Taxonomy Builder' para agrupar tus notas en categorías.",
  },
  taxonomy: {
    phase:"Fase ANALYZE — Axial Coding",
    what:"Arrastra tus notas libres a nuevas categorías estructuradas (Failure Modes), como 'Alucinación' o 'Tono Inadecuado'.",
    why:"Necesitamos traducir quejas vagas en reglas binarias claras. El SME usará estas categorías para establecer el estándar de calidad.",
    next:"Ve a 'Judge Studio' para automatizar la detección de estas categorías.",
  },
  judge: {
    phase:"Fase MEASURE — LLM-as-a-Judge",
    what:"Escribe un prompt para que un LLM evalúe un 'Failure Mode' específico. Usa ejemplos evaluados por el SME (👑) para enseñarle al juez qué está bien y qué está mal.",
    why:"Fase de 'Measure'. No podemos revisar miles de CVs a mano cada día. Necesitamos un juez automático validado para medir nuestra tasa de error real en producción.",
    next:"Ajusta el prompt hasta que el TPR y TNR estén en verde. Luego ve al Dashboard.",
  },
  golden: {
    phase:"Fase IMPROVE — Golden Dataset & Dashboard",
    what:"Revisa los casos donde la IA falló estrepitosamente y expórtalos como 'Golden Dataset'.",
    why:"Fase de 'Improve'. Estos datos se enviarán al equipo de ingeniería para que los usen en sus pruebas (CI/CD) y eviten que estos mismos errores vuelvan a ocurrir.",
    next:"Repetir el ciclo a medida que se lancen nuevas versiones de la IA.",
  },
  dashboard: {
    phase:"Fase IMPROVE — Golden Dataset & Dashboard",
    what:"Revisa los casos donde la IA falló estrepitosamente y expórtalos como 'Golden Dataset'.",
    why:"Fase de 'Improve'. Estos datos se enviarán al equipo de ingeniería para que los usen en sus pruebas (CI/CD) y eviten que estos mismos errores vuelvan a ocurrir.",
    next:"Repetir el ciclo a medida que se lancen nuevas versiones de la IA.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GUIDE PANEL  (collapsible)
// ─────────────────────────────────────────────────────────────────────────────
function GuidePanel({ viewId }) {
  const g = GUIDE[viewId];
  const storageKey = `guide_hidden_${viewId}`;
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(storageKey) !== "1"; } catch { return true; }
  });
  if (!g) return null;
  const toggle = () => {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(storageKey, next ? "0" : "1"); } catch {}
  };
  return (
    <div className="flex-shrink-0 border-b border-gray-800">
      <button onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-2 bg-gray-900/80 hover:bg-gray-800/80 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{g.phase}</span>
          <span className="text-xs text-gray-600">· Guía didáctica</span>
        </div>
        <span className="text-xs text-gray-600 flex items-center gap-1">{open ? "▾ ocultar" : "▸ mostrar guía"}</span>
      </button>
      {open && (
        <div className="bg-indigo-950/20 border-t border-indigo-900/30 px-5 py-3 grid grid-cols-3 gap-4">
          {[
            { icon:"📌", label:"Qué hacer", text:g.what, color:"text-indigo-300" },
            { icon:"💡", label:"Por qué importa", text:g.why, color:"text-yellow-300" },
            { icon:"➡️", label:"Siguiente paso", text:g.next, color:"text-emerald-300" },
          ].map(col => (
            <div key={col.label} className="flex gap-2">
              <span className="text-base flex-shrink-0 mt-0.5">{col.icon}</span>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${col.color}`}>{col.label}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{col.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// ROLE SELECTOR
// ─────────────────────────────────────────────────────────────────────────────
function RoleSelector({ role, onChange }) {
  return (
    <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl p-1">
      {[
        { val:"sme",      label:"👑 SME",      sub:"Experto de Dominio" },
        { val:"reviewer", label:"👤 Reviewer", sub:"Revisor" },
      ].map(r => (
        <button key={r.val} onClick={() => onChange(r.val)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${role===r.val?"bg-indigo-600 text-white shadow":"text-gray-400 hover:text-white"}`}>
          <span className="text-sm font-bold">{r.label}</span>
          <span className={`text-xs ${role===r.val?"text-indigo-200":"text-gray-600"}`}>{r.sub}</span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATA  (multi-input aware)
// ─────────────────────────────────────────────────────────────────────────────
const DEMO_TRACES = [
  { id:0, input_timestamp:"2024-01-15T10:00:00Z", output_timestamp:"2024-01-15T10:00:05Z",
    usage:"cv_improvement", dataset_split:"Train",
    inputs:[
      { source:"input_user_context", data:{ target_role:"Product Manager", industry:"FinTech", target_company:"Stripe", language:"es" }},
      { source:"input_file_content", data:{ personalInfo:{ name:"Ana García", email:"ana@email.com", location:"Barcelona" }, about_me:"PM con 5 años de experiencia en B2B SaaS.", experience:[{ role:"Product Manager", company:"Acme Corp", startDate:"2020-01", endDate:"2024-01", description:"<ul><li>Lideré roadmap de 3 productos</li><li>Incrementé conversión un 25%</li></ul>" }], education:[{ degree:"MBA", institution:"ESADE", year:2019 }], skills:["Jira","SQL","Figma","Amplitude"] }},
    ],
    output_json:{ personalInfo:{ name:"Ana García", email:"ana@email.com", location:"Barcelona" }, about_me:"PM orientada a datos con 5 años liderando productos B2B SaaS.", experience:[{ role:"Senior Product Manager", company:"Acme Corp", startDate:"2020-01", endDate:"2024-01", description:"<ul><li>Definí roadmap priorizando con ICE y RICE</li><li>Incrementé conversión un 25% mediante A/B</li><li>Coordiné equipo de 8 personas cross-funcional</li></ul>" }], education:[{ degree:"MBA", institution:"ESADE", year:2019 }], skills:["Jira","SQL","Figma","Amplitude","OKRs"] },
    output_error:false,
  },
  { id:1, input_timestamp:"2024-01-15T11:00:00Z", output_timestamp:"2024-01-15T11:00:06Z",
    usage:"cover_letter", dataset_split:"Dev",
    inputs:[
      { source:"input_user_context", data:{ target_role:"UX Designer", target_company:"Zalando", tone:"professional" }},
      { source:"input_file_content", data:{ personalInfo:{ name:"Carlos Ruiz", location:"Madrid" }, skills:["Figma","Prototyping","User Research"], experience:[{ role:"UX Designer", company:"StartupX", startDate:"2021-03", endDate:"2024-01", description:"Diseñé flujos de onboarding. Reduje abandono un 18%." }] }},
    ],
    output_json:{ type:"cover_letter", content:"Estimado equipo de Zalando,\n\nMe dirijo a ustedes con interés en la posición de UX Designer. En StartupX rediseñé el onboarding reduciendo el abandono un 18%.\n\nQuedo a su disposición,\nCarlos Ruiz" },
    output_error:false,
  },
  { id:2, input_timestamp:"2024-01-16T09:00:00Z", output_timestamp:"2024-01-16T09:00:08Z",
    usage:"cv_improvement", dataset_split:"Dev",
    inputs:[
      { source:"input_file_content", data:{ personalInfo:{ name:"Marta López", email:"marta@email.com" }, studies:[{ title:"Estadística", institution:"UV", year:2018 }], experience:[{ role:"Analyst", company:"RetailCo", startDate:"2019-06", endDate:"2023-12", description:"Análisis de ventas." }], skills:["Excel","Python","Tableau"] }},
    ],
    output_json:{ personalInfo:{ name:"Marta López", email:"marta@email.com" }, studies:[{ title:"Estadística", institution:"UV", year:2018 }], experience:[{ role:"Senior Data Analyst", company:"RetailCo", startDate:"2017-06", endDate:"2023-12", description:"<ul><li>Lideré análisis para 200 tiendas</li><li>Dashboards Tableau usados por C-level</li></ul>" }], skills:["Excel","Python","Tableau","SQL","Power BI"] },
    output_error:false,
  },
];
const DEMO_ANNOTATIONS = {
  0:{ judgment:"Pass", critique:"Mejora sólida, mantiene datos reales", failure_mode_id:null },
  1:{ judgment:"Fail", critique:"Tono genérico, no personalizado para Zalando", failure_mode_id:2 },
  2:{ judgment:"Fail", critique:"Cambió fecha de inicio de 2019 a 2017, dato inventado", failure_mode_id:1 },
};

// ─────────────────────────────────────────────────────────────────────────────
// JSON CLEANING
// ─────────────────────────────────────────────────────────────────────────────
function cleanAndParse(raw) {
  if (!raw || typeof raw !== "string") return { ok:false, data:null, raw:raw||"" };
  if (typeof raw === "object") return { ok:true, data:raw, raw:"" };
  try { return { ok:true, data:JSON.parse(raw), raw }; } catch {}
  try {
    const cleaned = raw
      .replace(/\r\n/g,"\\n").replace(/\r/g,"\\n").replace(/\n/g,"\\n")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,"")
      .replace(/""/g,'\\"');
    return { ok:true, data:JSON.parse(cleaned), raw };
  } catch {}
  return { ok:false, data:null, raw };
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE READER  — configurable encoding
// ─────────────────────────────────────────────────────────────────────────────
function readFileWithEncoding(file, encoding = "UTF-8") {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Error leyendo archivo"));
    reader.readAsText(file, encoding);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSE CSV  — exact case-insensitive match: input1, input2, output
// ─────────────────────────────────────────────────────────────────────────────
function parseCSV(text) {
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header:true, skipEmptyLines:true,
      complete: (results) => {
        if (!results.data.length) { reject(new Error("CSV vacío")); return; }

        const headers = Object.keys(results.data[0]);
        // Build a lowercase → original key map for exact matching
        const lcMap = {};
        headers.forEach(h => { lcMap[h.toLowerCase()] = h; });

        // Input columns: exact match on "input1", "input2" (extend if needed)
        const INPUT_NAMES = ["input1","input2","input_1","input_2","input_file_content"];
        const inputCols = INPUT_NAMES
          .filter(n => lcMap[n])
          .map(n => lcMap[n]);

        // Fallback: any column containing "input" if none of the above matched
        const effectiveInputCols = inputCols.length > 0
          ? inputCols
          : headers.filter(h => h.toLowerCase().includes("input"));

        // Output column: exact lowercase === "output"
        const outputCol = lcMap["output"] || null;

        const traces = []; let skipped = 0;

        results.data.forEach((row, idx) => {
          // --- INPUTS ---
          const inputs = effectiveInputCols.map(col => {
            const raw = row[col] || "";
            const p   = cleanAndParse(raw);
            return { source: col, data: p.ok ? p.data : null, error: !p.ok, raw };
          }).filter(i => i.data !== null || i.raw.trim() !== "");

          if (!inputs.length) { skipped++; return; }

          // --- OUTPUT (always present, never discarded) ---
          const rawOut = outputCol ? (row[outputCol] ?? "") : "";
          let output_json = null;
          let output_raw  = rawOut;   // always keep the raw string
          let output_error = false;

          if (rawOut.trim() !== "") {
            try {
              output_json  = JSON.parse(rawOut);
              output_error = false;
            } catch {
              // Not valid JSON — store raw, flag it, but KEEP the trace
              output_json  = null;
              output_error = true;
            }
            // Second attempt with cleaning if first JSON.parse failed
            if (output_error) {
              const p = cleanAndParse(rawOut);
              if (p.ok) { output_json = p.data; output_error = false; }
            }
          }

          traces.push({
            id: idx,
            input_timestamp:  row.input_timestamp  || row.timestamp || "",
            output_timestamp: row.output_timestamp || "",
            usage:        row.usage || row.type || "unknown",
            dataset_split: "Unlabeled",
            inputs,
            output_json,
            output_raw,
            output_error,
          });
        });

        resolve({ traces, skipped });
      },
      error: err => reject(new Error(err.message)),
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function loadSessions() { return db.get(SESSIONS_KEY) || []; }
function saveSessions(sessions) { db.set(SESSIONS_KEY, sessions); }
function createSession(traces, filename) {
  return {
    id: `session_${Date.now()}`,
    name: `Análisis — ${new Date().toLocaleString("es-ES",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}`,
    filename: filename || "unknown.csv",
    createdAt: new Date().toISOString(),
    traces,
    annotations: {},
    failureModes: BUILTIN_FM,
    judgeResults: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function metricColor(v) { if(v===null||v===undefined) return "text-gray-400"; if(v>=0.9) return "text-emerald-400"; if(v>=0.8) return "text-yellow-400"; return "text-red-400"; }
function metricBg(v)    { if(v===null||v===undefined) return "bg-gray-800 border-gray-700"; if(v>=0.9) return "bg-emerald-950 border-emerald-700"; if(v>=0.8) return "bg-yellow-950 border-yellow-700"; return "bg-red-950 border-red-700"; }
function rogaGladen(raw,tpr,tnr) { const d=tpr+tnr-1; if(Math.abs(d)<0.001) return null; return Math.max(0,Math.min(1,(raw+tnr-1)/d)); }
function pct(v,d=1) { return v===null||v===undefined?"—":`${(v*100).toFixed(d)}%`; }
function simulateLLMJudge() { return Math.random()>0.45?"Pass":"Fail"; }
const KNOWN_KEYS = new Set(["role","target_role","targetrole","about_me","aboutme","summary","profile","about","skills","studies","education","experience","experiencia","personalinfo","personal","name","fullname","email","phone","location","target_company","targetcompany","industry","type","content","body","letter","text"]);
function normalizeKey(k) { return k.toLowerCase().replace(/[_\s-]/g,""); }
function isKnown(k) { return KNOWN_KEYS.has(normalizeKey(k)); }

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC VALUE RENDERER
// ─────────────────────────────────────────────────────────────────────────────
function renderValue(val, depth=0) {
  if (val===null||val===undefined) return <span className="text-gray-500 italic text-xs">null</span>;
  if (typeof val==="boolean")      return <span className="text-purple-400 text-xs font-mono">{String(val)}</span>;
  if (typeof val==="number")       return <span className="text-blue-400 text-xs font-mono">{val}</span>;
  if (typeof val==="string") {
    if (val.includes("<")&&val.includes(">"))
      return <div className="text-xs text-gray-300 leading-relaxed prose prose-xs max-w-none prose-invert" dangerouslySetInnerHTML={{__html:val}}/>;
    if (val.includes("\n"))
      return <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{val}</p>;
    return <span className="text-xs text-gray-200">{val}</span>;
  }
  if (Array.isArray(val)) {
    if (val.every(i=>typeof i==="string"||typeof i==="number"))
      return <div className="flex flex-wrap gap-1">{val.map((s,i)=><span key={i} className="bg-gray-700 text-gray-200 rounded px-2 py-0.5 text-xs">{s}</span>)}</div>;
    return (
      <div className={`space-y-2 ${depth>0?"pl-3 border-l border-gray-700":""}`}>
        {val.map((item,i)=>(
          <div key={i} className="bg-gray-800/60 rounded-lg p-2">
            {typeof item==="object"&&item!==null
              ? Object.entries(item).map(([k,v])=><div key={k} className="flex gap-2 mb-1 last:mb-0"><span className="text-gray-500 text-xs font-medium flex-shrink-0 capitalize">{k}:</span><div className="flex-1 min-w-0">{renderValue(v,depth+1)}</div></div>)
              : renderValue(item,depth+1)}
          </div>
        ))}
      </div>
    );
  }
  if (typeof val==="object") {
    return (
      <div className={`space-y-1 ${depth>0?"pl-3 border-l border-gray-700":""}`}>
        {Object.entries(val).map(([k,v])=>(
          <div key={k} className="flex gap-2"><span className="text-gray-500 text-xs font-medium flex-shrink-0 capitalize">{k}:</span><div className="flex-1 min-w-0">{renderValue(v,depth+1)}</div></div>
        ))}
      </div>
    );
  }
  return <span className="text-xs text-gray-400">{String(val)}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// COLLAPSIBLE SECTION
// ─────────────────────────────────────────────────────────────────────────────
function Section({ title, icon, children, defaultOpen=true, accent=false }) {
  const [open,setOpen]=useState(defaultOpen);
  return (
    <div className={`rounded-xl border mb-2 overflow-hidden ${accent?"border-indigo-700/50 bg-indigo-950/20":"border-gray-700/50 bg-gray-800/30"}`}>
      <button onClick={()=>setOpen(o=>!o)} className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-700/30 transition-colors">
        <span className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-wide">{icon&&<span>{icon}</span>}{title}</span>
        <span className="text-gray-500 text-xs">{open?"▾":"▸"}</span>
      </button>
      {open&&<div className="px-4 pb-3 pt-1">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIVERSAL VIEWER  (single JSON blob)
// ─────────────────────────────────────────────────────────────────────────────
function UniversalViewer({ data, parseError, rawText, side="input" }) {
  if (parseError) return (
    <div className="p-4">
      <div className="bg-red-950/40 border border-red-700 rounded-xl p-4 mb-3">
        <p className="text-red-400 text-xs font-semibold mb-1">⚠️ Error de parseo JSON — texto crudo</p>
        <p className="text-red-300 text-xs">El evaluador puede continuar, pero el formato del output es incorrecto.</p>
      </div>
      <pre className="text-xs text-gray-400 bg-gray-900 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap border border-gray-700 leading-relaxed">{rawText}</pre>
    </div>
  );
  if (!data) return <div className="p-4 text-gray-500 text-sm">Sin datos</div>;

  const get = (...keys) => { for (const k of keys) { const f=Object.entries(data).find(([key])=>normalizeKey(key)===normalizeKey(k)); if(f&&f[1]!==undefined&&f[1]!==null&&f[1]!=="") return f[1]; } return null; };

  const docType    = get("type");
  const role       = get("role","target_role");
  const company    = get("target_company","targetcompany");
  const industry   = get("industry");
  const personal   = get("personalInfo","personal");
  const nameRaw    = personal?.name||personal?.fullName||get("name","fullname");
  const name       = typeof nameRaw==="string"?nameRaw:null;
  const emailRaw   = personal?.email||get("email");
  const email      = typeof emailRaw==="string"?emailRaw:null;
  const locRaw     = personal?.location||get("location");
  const location   = locRaw?(typeof locRaw==="object"?`${locRaw.city||""} ${locRaw.country||""}`.trim():String(locRaw)):null;
  const phoneRaw   = personal?.phone||get("phone");
  const phone      = typeof phoneRaw==="string"?phoneRaw:null;
  const roleStr    = typeof role==="string"?role:null;
  const companyStr = typeof company==="string"?company:null;
  const industryStr= typeof industry==="string"?industry:null;
  const docTypeStr = typeof docType==="string"?docType:null;
  const aboutMeRaw = get("about_me","aboutme","summary","profile","about");
  const aboutMe    = typeof aboutMeRaw==="string"?aboutMeRaw:aboutMeRaw?JSON.stringify(aboutMeRaw):null;
  const skills     = get("skills");
  const studies    = get("studies","education");
  const experience = get("experience","experiencia");
  const content    = get("content","body","letter","text");
  const unknownEntries = Object.entries(data).filter(([k])=>!isKnown(k));
  const accentColor = side==="output"?"text-indigo-300":"text-gray-100";

  const hasHeader = name||roleStr||email||phone||location||industryStr||docTypeStr;

  return (
    <div className="p-3 space-y-0">
      {hasHeader && (
        <div className={`rounded-xl border mb-3 p-3 ${side==="output"?"bg-indigo-950/30 border-indigo-700/40":"bg-gray-800/50 border-gray-700/50"}`}>
          {name    && <h2 className={`text-base font-bold leading-tight ${accentColor}`}>{name}</h2>}
          {roleStr && <p className={`text-xs font-semibold mt-0.5 ${side==="output"?"text-indigo-300":"text-gray-300"}`}>{roleStr}{companyStr?` → ${companyStr}`:""}</p>}
          <div className="flex flex-wrap gap-2 mt-1.5">
            {email      && <span className="text-xs text-gray-400">✉ {email}</span>}
            {phone      && <span className="text-xs text-gray-400">📞 {phone}</span>}
            {location   && <span className="text-xs text-gray-400">📍 {location}</span>}
            {industryStr&& <span className="text-xs text-gray-400">🏢 {industryStr}</span>}
            {docTypeStr && <span className={`text-xs px-2 py-0.5 rounded-full border ${side==="output"?"bg-purple-900/40 border-purple-700 text-purple-300":"bg-gray-700 border-gray-600 text-gray-300"}`}>{docTypeStr}</span>}
          </div>
        </div>
      )}
      {content   && <Section title="Contenido"        icon="📝" defaultOpen accent={side==="output"}><p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{content}</p></Section>}
      {aboutMe   && <Section title="Sobre mí / Summary" icon="💬" defaultOpen accent={side==="output"}><p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{aboutMe}</p></Section>}
      {skills&&Array.isArray(skills)&&skills.length>0 && (
        <Section title="Skills" icon="🛠️" defaultOpen accent={side==="output"}>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s,i)=><span key={i} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${side==="output"?"bg-indigo-900/40 border-indigo-700/50 text-indigo-200":"bg-gray-700 border-gray-600 text-gray-200"}`}>{typeof s==="string"?s:s.name||JSON.stringify(s)}</span>)}
          </div>
        </Section>
      )}
      {experience&&(Array.isArray(experience)?experience:experience?.jobs||[]).length>0 && (
        <Section title="Experiencia" icon="💼" defaultOpen accent={side==="output"}>
          <div className="space-y-3">
            {(Array.isArray(experience)?experience:experience?.jobs||[]).map((job,i)=>(
              <div key={i} className={`pl-3 border-l-2 ${side==="output"?"border-indigo-500":"border-gray-600"}`}>
                <p className="font-semibold text-gray-200 text-xs">{job.role||job.title||job.position}</p>
                <p className="text-gray-400 text-xs">{job.company||job.organization?.name||job.employer}</p>
                <p className="text-gray-500 text-xs">{job.startDate||job.start} → {job.endDate||job.finishDate||job.end||"Presente"}</p>
                {job.description&&<div className="mt-1 text-xs text-gray-400 leading-relaxed prose prose-xs prose-invert max-w-none" dangerouslySetInnerHTML={{__html:job.description}}/>}
              </div>
            ))}
          </div>
        </Section>
      )}
      {studies&&(Array.isArray(studies)?studies:[studies]).length>0 && (
        <Section title="Educación / Studies" icon="🎓" defaultOpen={false} accent={side==="output"}>
          <div className="space-y-2">
            {(Array.isArray(studies)?studies:[studies]).map((e,i)=>(
              <div key={i} className="flex justify-between items-start">
                <div><p className="text-xs font-medium text-gray-200">{e.degree||e.title||e.name}</p><p className="text-xs text-gray-500">{e.institution||e.school||e.university}</p></div>
                {(e.year||e.startDate)&&<span className="text-xs text-gray-500 ml-2 flex-shrink-0">{e.year||e.startDate}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}
      {unknownEntries.map(([key,val])=>(
        <Section key={key} title={key} icon="📌" defaultOpen={false}>{renderValue(val)}</Section>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-INPUT PANEL  (left side of review)
// ─────────────────────────────────────────────────────────────────────────────
function MultiInputPanel({ inputs }) {
  if (!inputs||!inputs.length) return <div className="p-4 text-gray-500 text-sm">Sin inputs</div>;
  return (
    <div className="h-full overflow-y-auto">
      {inputs.map((inp, i) => (
        <div key={i} className="mb-1 last:mb-0">
          <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur px-4 py-1.5 border-b border-gray-800 flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${i===0?"bg-indigo-900/60 text-indigo-300 border border-indigo-700":"bg-gray-800 text-gray-400 border border-gray-700"}`}>
              Input {i+1}
            </span>
            <span className="text-xs text-gray-600 font-mono truncate">{inp.source}</span>
            {inp.error && <span className="text-xs bg-red-900/50 border border-red-700 text-red-300 rounded px-2 py-0.5 ml-auto">⚠ JSON inválido</span>}
          </div>
          <UniversalViewer data={inp.data} parseError={inp.error} rawText={inp.raw} side="input"/>
          {i < inputs.length-1 && <div className="mx-4 border-b border-gray-800/60"/>}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────
function Sidebar({ view, setView, session, role, setRole }) {
  const annotated = session ? Object.keys(session.annotations).length : 0;
  const total     = session?.traces?.length || 0;
  const progress  = total ? annotated/total : 0;
  return (
    <div className="w-52 bg-gray-950 flex flex-col h-full flex-shrink-0 border-r border-gray-800">
      <div className="px-4 pt-5 pb-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-black">E</div>
          <div><p className="text-white font-bold text-sm leading-tight">AI Evals</p><p className="text-gray-500 text-xs">Manager v5</p></div>
        </div>
        {session && <p className="text-gray-600 text-xs mt-2 truncate" title={session.name}>{session.name}</p>}
      <div className="mt-3">
        <p className="text-gray-600 text-xs mb-1.5 uppercase tracking-wide font-semibold">Evaluando como:</p>
        <RoleSelector role={role} onChange={setRole}/>
      </div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {VIEWS.map(v=>(
          <button key={v.id} onClick={()=>setView(v.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${view===v.id?"bg-indigo-600 text-white":"text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
            <span className="text-base flex-shrink-0">{v.icon}</span>
            <div className="min-w-0">
              <p className={`text-xs font-semibold leading-tight truncate ${view===v.id?"text-white":"text-gray-300"}`}>{v.label}</p>
              <p className={`text-xs leading-tight ${view===v.id?"text-indigo-200":"text-gray-600"}`}>{v.sub}</p>
            </div>
          </button>
        ))}
      </nav>
      {session && (
        <div className="px-4 py-3 border-t border-gray-800">
          <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Progreso</span><span>{annotated}/{total}</span></div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full transition-all" style={{width:`${progress*100}%`}}/></div>
          <div className="flex gap-2 mt-2 text-xs">
            <span className="text-emerald-500">✓ {Object.values(session.annotations).filter(a=>a.judgment==="Pass").length}</span>
            <span className="text-red-400">✗ {Object.values(session.annotations).filter(a=>a.judgment==="Fail").length}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME / SESSIONS  — with inline name editing
// ─────────────────────────────────────────────────────────────────────────────
function SessionsHome({ sessions, onContinue, onDelete, onNew, onRename }) {
  const [editingId, setEditingId] = useState(null);
  const [editVal,   setEditVal]   = useState("");

  const startEdit = (s, e) => { e.stopPropagation(); setEditingId(s.id); setEditVal(s.name); };
  const commitEdit = (id) => { if(editVal.trim()) onRename(id, editVal.trim()); setEditingId(null); };
  const onKeyDown  = (e, id) => { if(e.key==="Enter") commitEdit(id); if(e.key==="Escape") setEditingId(null); };

  return (
    <div className="h-full bg-gray-950 overflow-y-auto p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">🏠 Sesiones de Evaluación</h1>
            <p className="text-gray-400 text-sm mt-1">Retoma una sesión anterior o inicia un nuevo análisis</p>
          </div>
          <button onClick={onNew} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg">+ Nueva Sesión</button>
        </div>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-6xl mb-4">📂</span>
            <h2 className="text-lg font-semibold text-gray-400 mb-2">No hay sesiones guardadas</h2>
            <p className="text-gray-600 text-sm mb-6">Sube un CSV para comenzar tu primera evaluación</p>
            <button onClick={onNew} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all">→ Subir CSV</button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => {
              const annotated = Object.keys(s.annotations||{}).length;
              const total     = s.traces?.length||0;
              const progress  = total ? Math.round((annotated/total)*100) : 0;
              const passes    = Object.values(s.annotations||{}).filter(a=>a.judgment==="Pass").length;
              const fails     = Object.values(s.annotations||{}).filter(a=>a.judgment==="Fail").length;
              const date      = new Date(s.createdAt).toLocaleString("es-ES",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
              const isEditing = editingId === s.id;
              return (
                <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Editable name */}
                      <div className="flex items-center gap-2 mb-0.5">
                        {isEditing ? (
                          <input autoFocus className="bg-gray-800 border border-indigo-500 text-white text-base font-bold rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72"
                            value={editVal} onChange={e=>setEditVal(e.target.value)}
                            onBlur={()=>commitEdit(s.id)} onKeyDown={e=>onKeyDown(e,s.id)}
                            onClick={e=>e.stopPropagation()}/>
                        ) : (
                          <>
                            <h3 className="font-bold text-white text-base truncate">{s.name}</h3>
                            <button onClick={e=>startEdit(s,e)} className="text-gray-600 hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0" title="Renombrar sesión">
                              ✏️
                            </button>
                          </>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs">📁 {s.filename} · {date}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progreso</span><span className="font-mono">{annotated}/{total} ({progress}%)</span>
                          </div>
                          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{width:`${progress}%`}}/>
                          </div>
                        </div>
                        <div className="flex gap-3 text-xs flex-shrink-0">
                          <span className="text-emerald-400 font-semibold">✓ {passes}</span>
                          <span className="text-red-400 font-semibold">✗ {fails}</span>
                          <span className="text-gray-600">{total-annotated} pend.</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <button onClick={()=>onDelete(s.id)} className="text-gray-700 hover:text-red-400 text-xs px-2 py-1.5 rounded-lg hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100">🗑</button>
                      <button onClick={()=>onContinue(s)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all">
                        {annotated===0?"Iniciar →":"Continuar →"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INGEST
// ─────────────────────────────────────────────────────────────────────────────
function IngestView({ onLoad }) {
  const [dragging, setDragging] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [encoding, setEncoding] = useState("UTF-8");

  const processFile = async f => {
    setError(""); setLoading(true);
    try {
      const text = await readFileWithEncoding(f, encoding);
      const { traces, skipped } = await parseCSV(text);
      onLoad(traces, skipped, f.name);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const onDrop = useCallback(e=>{ e.preventDefault(); setDragging(false); const f=e.dataTransfer.files[0]; if(f) processFile(f); },[encoding]);

  return (
    <div className="h-full flex flex-col items-center justify-center p-12 bg-gray-950">
      <h2 className="text-2xl font-bold text-white mb-2">Nueva Sesión</h2>
      <p className="text-gray-400 text-sm mb-6">Importa un CSV — columnas <code className="bg-gray-800 px-1 rounded text-xs">input*</code> detectadas automáticamente</p>

      {/* Encoding selector */}
      <div className="flex items-center gap-3 mb-6 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3">
        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Codificación del archivo:</span>
        <div className="flex gap-2">
          {[["UTF-8","UTF-8 (estándar)"],["ISO-8859-1","Excel / ANSI (Windows)"]].map(([val,label])=>(
            <button key={val} onClick={()=>setEncoding(val)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-all ${encoding===val?"bg-indigo-600 text-white border-indigo-600":"bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"}`}>
              {label}
            </button>
          ))}
        </div>
        {encoding==="ISO-8859-1" && <span className="text-xs text-yellow-400">⚠ Útil para CSVs exportados desde Excel en Windows</span>}
      </div>

      <div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={onDrop}
        className={`w-full max-w-md border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all ${dragging?"border-indigo-400 bg-indigo-900/20":"border-gray-700 bg-gray-900 hover:border-indigo-500"}`}
        onClick={()=>document.getElementById("csvInput").click()}>
        {loading
          ? <><span className="text-4xl animate-spin">⟳</span><p className="text-white font-semibold">Procesando con {encoding}...</p></>
          : <><span className="text-5xl">📂</span><p className="text-white font-semibold">Arrastra tu CSV aquí o haz clic</p>
              <p className="text-gray-500 text-xs text-center">Codificación activa: <span className="text-indigo-400 font-mono">{encoding}</span></p></>}
        <input id="csvInput" type="file" accept=".csv" className="hidden" onChange={e=>{if(e.target.files[0]) processFile(e.target.files[0]);}}/>
      </div>
      {error && <p className="mt-4 text-red-400 text-sm bg-red-900/20 border border-red-700 rounded-lg px-4 py-2">{error}</p>}
      <div className="mt-6 flex gap-3">
        <button className="text-xs text-gray-500 border border-gray-700 rounded-lg px-4 py-2 hover:text-white hover:border-gray-500 transition-all" onClick={()=>onLoad(DEMO_TRACES,0,"demo.csv")}>→ Demo sin anotaciones</button>
        <button className="text-xs text-indigo-400 border border-indigo-700 rounded-lg px-4 py-2 hover:bg-indigo-900/30 transition-all" onClick={()=>onLoad(DEMO_TRACES,0,"demo.csv","withAnnotations")}>→ Demo con anotaciones</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRACE REVIEW
// ─────────────────────────────────────────────────────────────────────────────
function TraceReview({ session, updateSession, role }) {
  const { traces, annotations, failureModes } = session;
  const [idx,setIdx]  = useState(0);
  const [ann,setAnn]  = useState({judgment:"",critique:"",failure_mode_id:null});
  const trace = traces[idx];

  useEffect(()=>{ if(trace) setAnn(annotations[trace.id]||{judgment:"",critique:"",failure_mode_id:null}); },[idx,traces.length]);
  useEffect(()=>{
    const h=e=>{ if(e.target.tagName==="TEXTAREA"||e.target.tagName==="INPUT") return;
      if(e.key==="p"||e.key==="P") setAnn(a=>({...a,judgment:"Pass"}));
      if(e.key==="f"||e.key==="F") setAnn(a=>({...a,judgment:"Fail"}));
      if(e.key==="s"||e.key==="S") setAnn(a=>({...a,judgment:"Skip"}));
    }; window.addEventListener("keydown",h); return()=>window.removeEventListener("keydown",h);
  },[]);

  if (!trace) return <div className="flex items-center justify-center h-full text-gray-500">Sin trazas</div>;

  const save = () => {
    const split = ann._split||trace.dataset_split;
    const newAnnotations = {
      ...annotations,
      [trace.id]: {
        judgment: ann.judgment,
        critique: ann.critique,
        failure_mode_id: ann.failure_mode_id,
        is_sme: role === "sme",
        evaluated_by: role,
      }
    };
    const newTraces = traces.map(t=>t.id===trace.id?{...t,dataset_split:split}:t);
    updateSession({ traces:newTraces, annotations:newAnnotations });
    if(idx<traces.length-1) setIdx(i=>i+1);
  };

  const existingAnn = annotations[trace.id];
  const smeAlreadyEvaluated = existingAnn?.is_sme && role !== "sme";

  const annotated = Object.keys(annotations).length;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-950">
      <GuidePanel viewId="review"/>
      <div className="bg-gray-900 px-4 py-1.5 flex items-center gap-2 flex-shrink-0 border-b border-gray-800">
        <button disabled={idx===0} onClick={()=>setIdx(i=>i-1)} className="text-gray-500 hover:text-white disabled:opacity-30 text-xs px-2 py-1 bg-gray-800 rounded border border-gray-700">← Ant</button>
        <div className="flex gap-1 overflow-x-auto flex-1 px-1">
          {traces.map((t,i)=>{ const a=annotations[t.id]; const col=!a?"bg-gray-700":a.judgment==="Pass"?"bg-emerald-500":a.judgment==="Fail"?"bg-red-500":"bg-gray-500"; return <button key={t.id} onClick={()=>setIdx(i)} className={`w-5 h-5 rounded-sm flex-shrink-0 transition-all ${col} ${i===idx?"ring-2 ring-white scale-110":"opacity-60 hover:opacity-100"}`} title={`#${t.id} ${a?.judgment||"—"}`}/>; })}
        </div>
        <span className="text-xs text-gray-500 font-mono flex-shrink-0">{idx+1}/{traces.length} · {annotated} eval.</span>
        <div className="h-1.5 w-20 bg-gray-800 rounded-full overflow-hidden flex-shrink-0"><div className="h-full bg-indigo-500 rounded-full" style={{width:`${(annotated/traces.length)*100}%`}}/></div>
        <button disabled={idx===traces.length-1} onClick={()=>setIdx(i=>i+1)} className="text-gray-500 hover:text-white disabled:opacity-30 text-xs px-2 py-1 bg-gray-800 rounded border border-gray-700">Sig →</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: multi-input */}
        <div className="flex-1 flex flex-col border-r border-gray-800 overflow-hidden">
          <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">📄 Inputs ({trace.inputs?.length||0})</span>
            <span className="ml-auto text-xs text-gray-600">{trace.input_timestamp}</span>
          </div>
          <MultiInputPanel inputs={trace.inputs}/>
        </div>

        {/* RIGHT: output — ALWAYS rendered */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-gray-900 px-4 py-2 border-b border-indigo-900/40 flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">✨ Output IA</span>
            {trace.output_error && (
              <span className="text-xs bg-red-900/60 border border-red-600 text-red-300 rounded px-2 py-0.5 font-semibold">
                ⚠ Output inválido — texto crudo
              </span>
            )}
            {!trace.output_json && !trace.output_error && !trace.output_raw && (
              <span className="text-xs bg-yellow-900/40 border border-yellow-700 text-yellow-400 rounded px-2 py-0.5">
                ⚠ Sin output en CSV
              </span>
            )}
            <span className="ml-auto text-xs text-gray-600">{trace.output_timestamp}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {trace.output_json ? (
              /* Valid JSON → use domain-aware viewer */
              <UniversalViewer data={trace.output_json} parseError={false} rawText="" side="output"/>
            ) : trace.output_raw ? (
              /* Raw / broken output → always show it */
              <div className="p-4">
                <div className="bg-red-950/40 border border-red-700 rounded-xl p-3 mb-3">
                  <p className="text-red-400 text-xs font-semibold mb-0.5">⚠ Output no es JSON válido</p>
                  <p className="text-red-300 text-xs">La IA devolvió texto plano o un error. Puedes evaluar la traza igualmente.</p>
                </div>
                <pre className="text-xs text-gray-300 bg-gray-900 border border-gray-700 rounded-xl p-4 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                  {trace.output_raw}
                </pre>
              </div>
            ) : (
              /* No output at all */
              <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
                <span className="text-3xl">🕳</span>
                <p className="text-sm">Columna "output" no encontrada en el CSV</p>
                <p className="text-xs text-gray-700">Verifica que el archivo tenga una columna llamada exactamente "output"</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border-t border-gray-800 p-4 flex flex-col gap-3 flex-shrink-0">
        {/* SME verdict banner — shown to reviewers when SME has already judged */}
        {smeAlreadyEvaluated && (
          <div className="flex items-center gap-3 bg-yellow-950/40 border border-yellow-700/50 rounded-xl px-4 py-2.5">
            <span className="text-lg">👑</span>
            <div>
              <p className="text-xs font-bold text-yellow-300">SME Verdict: <span className={existingAnn.judgment==="Pass"?"text-emerald-300":"text-red-300"}>{existingAnn.judgment}</span></p>
              {existingAnn.critique && <p className="text-xs text-yellow-200/70 mt-0.5">"{existingAnn.critique}"</p>}
            </div>
            <span className="ml-auto text-xs text-yellow-700">Referencia de Ground Truth</span>
          </div>
        )}
        {role === "sme" && (
          <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-950/20 border border-yellow-800/40 rounded-lg px-3 py-1.5">
            <span>👑</span><span className="font-semibold">Evaluando como SME</span><span className="text-yellow-700">— tu veredicto es Ground Truth</span>
          </div>
        )}
        <div className="flex gap-2">
          {[{v:"Pass",l:"👍 Pass",c:ann.judgment==="Pass"?"bg-emerald-600 text-white border-emerald-600":"bg-gray-800 text-emerald-400 border-emerald-700 hover:bg-emerald-900/40"},
            {v:"Fail",l:"👎 Fail",c:ann.judgment==="Fail"?"bg-red-600 text-white border-red-600":"bg-gray-800 text-red-400 border-red-700 hover:bg-red-900/40"},
            {v:"Skip",l:"⏭️ Skip",c:ann.judgment==="Skip"?"bg-gray-600 text-white border-gray-500":"bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700"}
          ].map(b=><button key={b.v} className={`flex-1 py-2 rounded-lg font-semibold text-sm border transition-all ${b.c}`} onClick={()=>setAnn(a=>({...a,judgment:b.v}))}>{b.l}</button>)}
        </div>
        <textarea className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600" rows={2} placeholder="Critique / Open Code — P · F · S hotkeys activos..." value={ann.critique} onChange={e=>setAnn(a=>({...a,critique:e.target.value}))}/>
        <div className="flex items-center gap-3">
          <div className="flex flex-wrap gap-1 flex-1">
            {failureModes.slice(0,6).map(fm=><button key={fm.id} className={`text-xs px-2 py-1 rounded-full border transition-all ${ann.failure_mode_id===fm.id?"bg-indigo-600 text-white border-indigo-600":"bg-gray-800 text-gray-400 border-gray-700 hover:border-indigo-500"}`} onClick={()=>setAnn(a=>({...a,failure_mode_id:a.failure_mode_id===fm.id?null:fm.id}))}>{fm.title}</button>)}
          </div>
          <select className="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded px-2 py-1" value={ann._split||trace.dataset_split} onChange={e=>setAnn(a=>({...a,_split:e.target.value}))}>
            {["Train","Dev","Test","Unlabeled"].map(s=><option key={s}>{s}</option>)}
          </select>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-40 transition-all" disabled={!ann.judgment} onClick={save}>Guardar →</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAXONOMY BUILDER
// ─────────────────────────────────────────────────────────────────────────────
function TaxonomyBuilder({ session, updateSession }) {
  const { traces, annotations, failureModes } = session;
  const [dragging,setDragging]=useState(null);
  const [newTitle,setNewTitle]=useState(""); const [newDef,setNewDef]=useState(""); const [showForm,setShowForm]=useState(false);
  const [preview,setPreview]=useState(null);
  const uncategorized = Object.entries(annotations).filter(([,a])=>a.critique&&!a.failure_mode_id&&(a.judgment==="Pass"||a.judgment==="Fail"));
  const categorized   = failureModes.map(fm=>({...fm,items:Object.entries(annotations).filter(([,a])=>a.failure_mode_id===fm.id&&a.critique)}));
  const createFm=()=>{ if(!newTitle.trim()) return; updateSession({failureModes:[...failureModes,{id:nextFmId(),title:newTitle.trim(),definition:newDef.trim()}]}); setNewTitle(""); setNewDef(""); setShowForm(false); };
  const drop=fmId=>{ if(dragging===null) return; updateSession({annotations:{...annotations,[parseInt(dragging)]:{...annotations[parseInt(dragging)],failure_mode_id:fmId}}}); setDragging(null); };
  const getT=id=>traces.find(t=>t.id===parseInt(id));
  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-950">
      <GuidePanel viewId="taxonomy"/>
      <div className="px-6 py-4 border-b border-gray-800 bg-gray-900 flex items-center justify-between flex-shrink-0">
        <div><h2 className="font-bold text-white text-lg">🗂️ Taxonomy Builder</h2><p className="text-xs text-gray-500">Axial Coding — arrastra critiques a Failure Modes</p></div>
        <button onClick={()=>setShowForm(s=>!s)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">+ Nuevo FM</button>
      </div>
      {showForm&&<div className="px-6 py-3 bg-indigo-950/40 border-b border-indigo-800 flex gap-3 items-end flex-shrink-0">
        <div className="flex-1"><label className="text-xs font-semibold text-indigo-400 block mb-1">Título</label><input className="w-full bg-gray-800 border border-indigo-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="ej. Alucinación de Fechas" value={newTitle} onChange={e=>setNewTitle(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createFm()}/></div>
        <div className="flex-1"><label className="text-xs font-semibold text-indigo-400 block mb-1">Definición</label><input className="w-full bg-gray-800 border border-indigo-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="La IA inventó fechas..." value={newDef} onChange={e=>setNewDef(e.target.value)}/></div>
        <button onClick={createFm} className="bg-indigo-600 text-white px-4 py-1.5 rounded text-sm font-semibold">Crear</button>
        <button onClick={()=>setShowForm(false)} className="text-gray-500 px-2">✕</button>
      </div>}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 p-6 h-full" style={{minWidth:`${(categorized.length+1)*272}px`}}>
          <div className="flex flex-col w-64 flex-shrink-0" onDragOver={e=>e.preventDefault()} onDrop={()=>drop(null)}>
            <div className="bg-gray-700 rounded-t-xl px-3 py-2 flex items-center justify-between"><span className="text-xs font-bold text-gray-300 uppercase tracking-wide">Sin categorizar</span><span className="bg-gray-500 text-white text-xs rounded-full px-2 py-0.5">{uncategorized.length}</span></div>
            <div className="flex-1 bg-gray-900 rounded-b-xl p-2 overflow-y-auto space-y-2 min-h-32 border border-gray-700 border-t-0">
              {uncategorized.length===0&&<p className="text-xs text-gray-600 text-center mt-4">¡Todas categorizadas!</p>}
              {uncategorized.map(([tid,a])=>{ const t=getT(tid); return <div key={tid} draggable onDragStart={()=>setDragging(tid)} className="bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-grab hover:border-gray-500 transition-all"><div className="flex items-center justify-between mb-1"><span className={`text-xs font-bold px-1.5 py-0.5 rounded ${a.judgment==="Pass"?"bg-emerald-900/60 text-emerald-300":"bg-red-900/60 text-red-300"}`}>{a.judgment}</span><button onClick={()=>setPreview(t)} className="text-xs text-gray-600 hover:text-indigo-400">👁</button></div><p className="text-xs text-gray-300 leading-relaxed">{a.critique}</p>{t&&<p className="text-xs text-gray-600 mt-1 truncate">#{t.id} · {t.usage}</p>}</div>; })}
            </div>
          </div>
          {categorized.map(fm=>(
            <div key={fm.id} className="flex flex-col w-64 flex-shrink-0" onDragOver={e=>e.preventDefault()} onDrop={()=>drop(fm.id)}>
              <div className="bg-indigo-700 rounded-t-xl px-3 py-2"><div className="flex items-center justify-between"><span className="text-xs font-bold text-white truncate">{fm.title}</span><span className="bg-indigo-500 text-white text-xs rounded-full px-2 py-0.5 ml-1 flex-shrink-0">{fm.items.length}</span></div>{fm.definition&&<p className="text-xs text-indigo-200 mt-0.5">{fm.definition}</p>}</div>
              <div className="flex-1 bg-indigo-950/30 rounded-b-xl p-2 overflow-y-auto space-y-2 min-h-32 border-2 border-dashed border-indigo-700/50">
                {fm.items.length===0&&<p className="text-xs text-indigo-700 text-center mt-4">Arrastra aquí</p>}
                {fm.items.map(([tid,a])=>{ const t=getT(tid); return <div key={tid} draggable onDragStart={()=>setDragging(tid)} className="bg-gray-800 border border-indigo-700/40 rounded-lg p-3 cursor-grab hover:border-indigo-500 transition-all"><div className="flex items-center justify-between mb-1"><span className={`text-xs font-bold px-1.5 py-0.5 rounded ${a.judgment==="Pass"?"bg-emerald-900/60 text-emerald-300":"bg-red-900/60 text-red-300"}`}>{a.judgment}</span><button onClick={()=>setPreview(t)} className="text-xs text-gray-600 hover:text-indigo-400">👁</button></div><p className="text-xs text-gray-300 leading-relaxed">{a.critique}</p>{t&&<p className="text-xs text-gray-600 mt-1 truncate">#{t.id} · {t.usage}</p>}</div>; })}
              </div>
            </div>
          ))}
        </div>
      </div>
      {preview&&<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={()=>setPreview(null)}><div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between px-6 py-4 border-b border-gray-800"><h3 className="font-bold text-white">Traza #{preview.id}</h3><button onClick={()=>setPreview(null)} className="text-gray-500 hover:text-white">✕</button></div><div className="flex flex-1 overflow-hidden"><div className="flex-1 overflow-y-auto border-r border-gray-800"><MultiInputPanel inputs={preview.inputs}/></div><div className="flex-1 overflow-y-auto"><UniversalViewer data={preview.output_json} parseError={preview.output_error} rawText={preview.output_raw} side="output"/></div></div></div></div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JUDGE STUDIO
// ─────────────────────────────────────────────────────────────────────────────
function JudgeStudio({ session, updateSession, role }) {
  const { traces, annotations, failureModes, judgeResults } = session;
  const [fmId,setFmId]=useState(failureModes[0]?.id||null);
  const [prompt,setPrompt]=useState(`Eres un evaluador experto de CVs mejorados por IA.\n\nDetermina si el failure mode "{{failure_mode}}" está presente.\n\n## Input(s) del usuario:\n{{input}}\n\n## Output de la IA:\n{{output}}\n\nResponde únicamente: PASS o FAIL`);
  const [running,setRunning]=useState(false);
  const devT   = traces.filter(t=>t.dataset_split==="Dev");
  // Few-shot: only SME-evaluated train traces
  const trainT = traces.filter(t=>t.dataset_split==="Train" && annotations[t.id]?.is_sme);
  const allTrainT = traces.filter(t=>t.dataset_split==="Train");

  // Metrics: prefer SME annotations; fall back to all if no SME annotations exist
  const devAnnotated = devT.filter(t=>annotations[t.id]?.judgment && annotations[t.id].judgment!=="Skip");
  const smeDevAnnotated = devAnnotated.filter(t=>annotations[t.id]?.is_sme);
  const metricsBase = smeDevAnnotated.length > 0 ? smeDevAnnotated : devAnnotated;
  const metricsLabel = smeDevAnnotated.length > 0 ? "👑 SME" : "todos";
  const injectFS=()=>{ const ex=trainT.filter(t=>annotations[t.id]?.judgment).slice(0,2).map((t,i)=>`### Ejemplo ${i+1}\nInput: Traza #${t.id}\nRespuesta: ${annotations[t.id].judgment.toUpperCase()}`).join("\n\n"); if(ex) setPrompt(p=>p+`\n\n## Few-Shot:\n${ex}`); };
  const run=async()=>{ setRunning(true); await new Promise(r=>setTimeout(r,900));
    const res=devT.filter(t=>annotations[t.id]?.judgment&&annotations[t.id].judgment!=="Skip").map(t=>({traceId:t.id,humanJudgment:annotations[t.id].judgment,llmJudgment:simulateLLMJudge(),critique:annotations[t.id].critique||"",usage:t.usage}));
    updateSession({judgeResults:res}); setRunning(false);
  };
  const m = judgeResults ? (() => { const hp=judgeResults.filter(r=>r.humanJudgment==="Pass"); const hf=judgeResults.filter(r=>r.humanJudgment==="Fail"); const tp=hp.filter(r=>r.llmJudgment==="Pass").length; const tn=hf.filter(r=>r.llmJudgment==="Fail").length; return {tpr:hp.length?tp/hp.length:null,tnr:hf.length?tn/hf.length:null,tp,tn,hpLen:hp.length,hfLen:hf.length,total:judgeResults.length,disagreements:judgeResults.filter(r=>r.humanJudgment!==r.llmJudgment)}; })() : null;
  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-950">
      <GuidePanel viewId="judge"/>
      <div className="px-6 py-4 border-b border-gray-800 bg-gray-900 flex-shrink-0 flex items-center justify-between">
        <div><h2 className="font-bold text-white text-lg">⚖️ LLM-as-a-Judge Studio</h2><p className="text-xs text-gray-500">Fase MEASURE — valida tu prompt contra etiquetas humanas</p></div>
        <div className="flex items-center gap-3"><label className="text-xs text-gray-500">Failure Mode:</label>
          <select className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none" value={fmId||""} onChange={e=>setFmId(parseInt(e.target.value))}>{failureModes.map(fm=><option key={fm.id} value={fm.id}>{fm.title}</option>)}</select>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 flex flex-col border-r border-gray-800 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prompt Editor</span>
            <button onClick={injectFS} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700 px-3 py-1 rounded transition-all">💉 Few-Shot ({trainT.length})</button>
          </div>
          <div className="p-3 flex-1 flex flex-col overflow-hidden">
            <textarea className="flex-1 w-full bg-gray-900 text-gray-200 border border-gray-700 rounded-lg px-4 py-3 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed" value={prompt} onChange={e=>setPrompt(e.target.value)}/>
            <div className="mt-2 flex gap-1">{["{{input}}","{{output}}","{{failure_mode}}"].map(v=><span key={v} className="bg-gray-800 text-indigo-400 text-xs px-2 py-0.5 rounded font-mono cursor-pointer hover:bg-gray-700 border border-gray-700" onClick={()=>setPrompt(p=>p+` ${v}`)}>{v}</span>)}</div>
          </div>
        </div>
        <div className="w-1/2 flex flex-col overflow-hidden bg-gray-900">
          <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dev Set ({devT.length})</span>
            <button onClick={run} disabled={running||devT.length===0} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold px-4 py-1.5 rounded-lg flex items-center gap-2 transition-all">{running?<><span className="animate-spin inline-block">⟳</span> Evaluando...</>:"▶ Run Dev Set"}</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!m&&<div className="flex flex-col items-center justify-center h-40 text-gray-700"><span className="text-3xl mb-2">⚖️</span><p className="text-sm">Pulsa Run Dev Set</p></div>}
            {m&&<>
              <div className="grid grid-cols-2 gap-3">
                {[{l:"TPR",v:m.tpr,s:`${m.tp}/${m.hpLen}`},{l:"TNR",v:m.tnr,s:`${m.tn}/${m.hfLen}`}].map(c=>(
                  <div key={c.l} className={`rounded-xl border p-4 ${metricBg(c.v)}`}><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{c.l}</p><p className={`text-4xl font-black ${metricColor(c.v)}`}>{pct(c.v,0)}</p><p className="text-xs text-gray-500 mt-1">{c.s}</p><div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden"><div className={`h-full rounded-full ${c.v>=0.9?"bg-emerald-400":c.v>=0.8?"bg-yellow-400":"bg-red-400"}`} style={{width:`${(c.v||0)*100}%`}}/></div></div>
                ))}
              </div>
              <div className="bg-gray-800 rounded-xl p-4 grid grid-cols-4 gap-3 text-center border border-gray-700">
                {[{l:"Total",v:m.total,c:"text-white"},{l:"Acuerdos",v:m.total-m.disagreements.length,c:"text-emerald-400"},{l:"Desacuerdos",v:m.disagreements.length,c:"text-red-400"},{l:"Accuracy",v:`${Math.round(((m.total-m.disagreements.length)/m.total)*100)}%`,c:"text-indigo-400"}].map(s=><div key={s.l}><p className={`text-xl font-black ${s.c}`}>{s.v}</p><p className="text-xs text-gray-500">{s.l}</p></div>)}
              </div>
              {m.disagreements.length>0&&<div><h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">🔍 Desacuerdos</h3><div className="space-y-2">{m.disagreements.map((d,i)=><div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-3"><div className="flex items-center gap-2 mb-1.5"><span className="text-xs font-mono text-gray-500">#{d.traceId}</span><span className={`text-xs px-2 py-0.5 rounded font-semibold ${d.humanJudgment==="Pass"?"bg-emerald-900 text-emerald-300":"bg-red-900 text-red-300"}`}>H:{d.humanJudgment}</span><span className={`text-xs px-2 py-0.5 rounded font-semibold ${d.llmJudgment==="Pass"?"bg-emerald-900 text-emerald-300":"bg-red-900 text-red-300"}`}>LLM:{d.llmJudgment}</span><span className="text-xs px-2 py-0.5 rounded bg-yellow-900 text-yellow-300 font-semibold ml-auto">{d.humanJudgment==="Pass"&&d.llmJudgment==="Fail"?"FN":"FP"}</span></div>{d.critique&&<p className="text-xs text-gray-400 bg-gray-900 rounded px-2 py-1.5">💬 {d.critique}</p>}</div>)}</div></div>}
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GOLDEN DATASET
// ─────────────────────────────────────────────────────────────────────────────
function GoldenDataset({ session }) {
  const { traces, annotations, failureModes } = session;
  const [selected,setSelected]=useState(new Set());
  const [filterJ,setFilterJ]=useState("all"); const [filterFm,setFilterFm]=useState("all");
  const evaluated=traces.filter(t=>annotations[t.id]?.judgment&&annotations[t.id].judgment!=="Skip");
  const filtered=evaluated.filter(t=>{ const a=annotations[t.id]; if(filterJ!=="all"&&a.judgment!==filterJ) return false; if(filterFm!=="all"&&String(a.failure_mode_id)!==filterFm) return false; return true; });
  const toggleAll=()=>{ if(selected.size===filtered.length){ setSelected(new Set()); } else { setSelected(new Set(filtered.map(t=>t.id))); }};
  const toggle=id=>{ const s=new Set(selected); if(s.has(id)) s.delete(id); else s.add(id); setSelected(s); };
  const exportDs=()=>{
    const rows=traces.filter(t=>selected.has(t.id)).map(t=>{ const a=annotations[t.id]; const fm=failureModes.find(f=>f.id===a?.failure_mode_id); const firstInput=t.inputs?.[0]?.data||{}; const meta=firstInput.metadata||firstInput; return { id:t.id,usage:t.usage,dataset_split:t.dataset_split,context:{target_role:meta.target_role||meta.role||null,industry:meta.industry||null},annotation:{judgment:a?.judgment||null,critique:a?.critique||null,failure_mode:fm?{id:fm.id,title:fm.title}:null},inputs:t.inputs?.map(i=>i.data),expected_output_quality:a?.judgment==="Pass"?"acceptable":"unacceptable"}; });
    const blob=new Blob([JSON.stringify({version:"1.0",exported_at:new Date().toISOString(),total_cases:rows.length,golden_cases:rows},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="golden_dataset.json"; a.click(); URL.revokeObjectURL(url);
  };
  const getFmTitle=id=>failureModes.find(f=>f.id===id)?.title||null;
  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-950">
      <GuidePanel viewId="golden"/>
      <div className="px-6 py-4 border-b border-gray-800 bg-gray-900 flex items-center justify-between flex-shrink-0">
        <div><h2 className="font-bold text-white text-lg">🛡️ Golden Dataset Manager</h2><p className="text-xs text-gray-500">Curate y exporta casos para CI/CD</p></div>
        <button disabled={selected.size===0} onClick={exportDs} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-all">
          ⬇️ Export {selected.size>0&&<span className="bg-emerald-500 text-white text-xs rounded-full px-2 py-0.5">{selected.size}</span>}
        </button>
      </div>
      <div className="px-6 py-2.5 border-b border-gray-800 bg-gray-900 flex items-center gap-4 flex-shrink-0">
        <select className="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded px-2 py-1.5" value={filterJ} onChange={e=>setFilterJ(e.target.value)}><option value="all">Todos</option><option value="Pass">Pass</option><option value="Fail">Fail</option></select>
        <select className="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded px-2 py-1.5" value={filterFm} onChange={e=>setFilterFm(e.target.value)}><option value="all">Todos los FM</option>{failureModes.map(fm=><option key={fm.id} value={String(fm.id)}>{fm.title}</option>)}</select>
        <span className="text-xs text-gray-600 ml-auto">{filtered.length} filas · {selected.size} sel.</span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-900 sticky top-0 border-b border-gray-800">
            <tr>{[""," ID","Contexto","Inputs","Split","Failure Mode","Critique","Judgment"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h==""?<input type="checkbox" checked={selected.size===filtered.length&&filtered.length>0} onChange={toggleAll} className="rounded"/>:h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((t)=>{ const a=annotations[t.id]; const firstIn=t.inputs?.[0]?.data||{}; const meta=firstIn.metadata||firstIn; const fm=getFmTitle(a?.failure_mode_id); return (
              <tr key={t.id} className={`border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors ${selected.has(t.id)?"bg-indigo-950/30":""}`} onClick={()=>toggle(t.id)}>
                <td className="px-4 py-3"><input type="checkbox" checked={selected.has(t.id)} onChange={()=>toggle(t.id)} onClick={e=>e.stopPropagation()} className="rounded"/></td>
                <td className="px-4 py-3"><span className="font-mono text-xs text-gray-500">#{t.id}</span></td>
                <td className="px-4 py-3"><p className="text-xs text-gray-300">{meta.target_role||meta.role||"—"}</p><p className="text-xs text-gray-600">{meta.industry||""}</p></td>
                <td className="px-4 py-3"><span className="text-xs bg-gray-800 text-gray-400 border border-gray-700 rounded px-2 py-0.5">{t.inputs?.length||1} input{t.inputs?.length>1?"s":""}</span></td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded font-medium ${t.dataset_split==="Train"?"bg-blue-900/50 text-blue-300":t.dataset_split==="Dev"?"bg-purple-900/50 text-purple-300":t.dataset_split==="Test"?"bg-orange-900/50 text-orange-300":"bg-gray-800 text-gray-500"}`}>{t.dataset_split}</span></td>
                <td className="px-4 py-3">{fm?<span className="text-xs bg-indigo-900/50 text-indigo-300 rounded-full px-2 py-0.5 border border-indigo-700/50">{fm}</span>:<span className="text-xs text-gray-600">—</span>}</td>
                <td className="px-4 py-3"><p className="text-xs text-gray-400 max-w-xs truncate">{a?.critique||"—"}</p></td>
                <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full ${a?.judgment==="Pass"?"bg-emerald-900/60 text-emerald-300":"bg-red-900/60 text-red-300"}`}>{a?.judgment==="Pass"?"✓ Pass":"✗ Fail"}</span></td>
              </tr>
            );})}
            {filtered.length===0&&<tr><td colSpan={8} className="px-4 py-12 text-center text-gray-600 text-sm">Sin trazas evaluadas con estos filtros</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
const RAW_PASS_RATE = 0.75;
function Dashboard({ session }) {
  const { traces, annotations, failureModes, judgeResults } = session;
  const evaluated    = Object.values(annotations).filter(a=>a.judgment&&a.judgment!=="Skip");
  const passes       = evaluated.filter(a=>a.judgment==="Pass").length;
  const fails        = evaluated.filter(a=>a.judgment==="Fail").length;
  const humanPassRate= evaluated.length?passes/evaluated.length:null;
  const m = judgeResults ? (() => { const hp=judgeResults.filter(r=>r.humanJudgment==="Pass"); const hf=judgeResults.filter(r=>r.humanJudgment==="Fail"); const tp=hp.filter(r=>r.llmJudgment==="Pass").length; const tn=hf.filter(r=>r.llmJudgment==="Fail").length; return {tpr:hp.length?tp/hp.length:null,tnr:hf.length?tn/hf.length:null}; })() : {tpr:null,tnr:null};
  const adjusted     = m.tpr!==null&&m.tnr!==null?rogaGladen(RAW_PASS_RATE,m.tpr,m.tnr):null;
  const fmCounts     = failureModes.map(fm=>({...fm,count:Object.values(annotations).filter(a=>a.failure_mode_id===fm.id).length})).filter(f=>f.count>0).sort((a,b)=>b.count-a.count);
  const splitCounts  = ["Train","Dev","Test","Unlabeled"].map(s=>({label:s,count:traces.filter(t=>t.dataset_split===s).length}));
  const maxFm        = Math.max(...fmCounts.map(f=>f.count),1);
  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-950">
      <GuidePanel viewId="dashboard"/>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div><h2 className="font-bold text-white text-xl">📊 Dashboard</h2><p className="text-gray-500 text-sm">{session.name}</p></div>
        <div className="grid grid-cols-4 gap-4">
        {[{l:"Total Trazas",v:traces.length,s:"en el dataset",c:"text-white",bg:"bg-gray-800 border-gray-700"},{l:"Evaluadas",v:evaluated.length,s:`${traces.length?Math.round((evaluated.length/traces.length)*100):0}%`,c:"text-indigo-400",bg:"bg-gray-800 border-gray-700"},{l:"Human Pass Rate",v:humanPassRate!==null?pct(humanPassRate,1):"—",s:`${passes} pass · ${fails} fail`,c:humanPassRate!==null?metricColor(humanPassRate):"text-gray-400",bg:humanPassRate!==null?metricBg(humanPassRate):"bg-gray-800 border-gray-700"},{l:"Failure Modes",v:failureModes.length,s:`${fmCounts.length} con datos`,c:"text-yellow-400",bg:"bg-gray-800 border-gray-700"}].map(k=>(
          <div key={k.l} className={`rounded-xl border p-5 ${k.bg}`}><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{k.l}</p><p className={`text-3xl font-black mt-1 ${k.c}`}>{k.v}</p><p className="text-xs text-gray-500 mt-1">{k.s}</p></div>
        ))}
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4"><div><h3 className="text-white font-bold">Corrección Rogan-Gladen</h3><p className="text-gray-500 text-xs">Ajusta la tasa bruta del LLM-Judge</p></div>{!judgeResults&&<span className="text-xs text-yellow-500 bg-yellow-900/30 border border-yellow-700 rounded-lg px-3 py-1.5">⚠️ Ejecuta Judge Studio primero</span>}</div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700"><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Raw Pass Rate</p><p className="text-3xl font-black text-white">{pct(RAW_PASS_RATE,0)}</p><p className="text-xs text-gray-500 mt-1">Tasa bruta (simulada)</p></div>
          <div className={`rounded-xl p-4 border ${metricBg(adjusted)}`}><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Adjusted Rate</p><p className={`text-3xl font-black ${adjusted!==null?metricColor(adjusted):"text-gray-500"}`}>{adjusted!==null?pct(adjusted,1):"—"}</p><p className="text-xs text-gray-500 mt-1">Estimación real (RG)</p></div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700"><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Δ Sesgo</p><p className={`text-3xl font-black ${adjusted!==null?(adjusted<RAW_PASS_RATE?"text-red-400":"text-emerald-400"):"text-gray-500"}`}>{adjusted!==null?`${adjusted<RAW_PASS_RATE?"-":"+"}${Math.abs(Math.round((adjusted-RAW_PASS_RATE)*100))}pp`:"—"}</p><p className="text-xs text-gray-500 mt-1">{adjusted!==null?(adjusted<RAW_PASS_RATE?"Sobreestima":"Subestima"):"Sin datos"}</p></div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700"><p className="text-xs text-gray-500 font-mono">RG = (Raw + TNR − 1) / (TPR + TNR − 1) = ({RAW_PASS_RATE} + {m.tnr!==null?m.tnr.toFixed(3):"TNR"} − 1) / ({m.tpr!==null?m.tpr.toFixed(3):"TPR"} + {m.tnr!==null?m.tnr.toFixed(3):"TNR"} − 1){adjusted!==null?` = ${adjusted.toFixed(3)}`:""}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[{l:"TPR",v:m.tpr,d:"LLM Pass / Human Pass"},{l:"TNR",v:m.tnr,d:"LLM Fail / Human Fail"}].map(c=>(
          <div key={c.l} className={`rounded-xl border p-5 ${metricBg(c.v)}`}><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{c.l}</p><p className={`text-4xl font-black mt-1 ${metricColor(c.v)}`}>{pct(c.v,0)}</p><p className="text-xs text-gray-500 mt-1">{c.d}</p>{c.v!==null&&<div className="mt-3 h-1.5 bg-gray-700 rounded-full overflow-hidden"><div className={`h-full rounded-full ${c.v>=0.9?"bg-emerald-400":c.v>=0.8?"bg-yellow-400":"bg-red-400"}`} style={{width:`${c.v*100}%`}}/></div>}</div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5"><h3 className="text-white font-bold text-sm mb-4">Failure Modes</h3>{fmCounts.length===0?<p className="text-gray-600 text-xs text-center py-4">Sin datos aún</p>:<div className="space-y-3">{fmCounts.map(fm=><div key={fm.id}><div className="flex justify-between mb-1"><span className="text-xs text-gray-300">{fm.title}</span><span className="text-xs text-gray-500 font-mono">{fm.count}</span></div><div className="h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{width:`${(fm.count/maxFm)*100}%`}}/></div></div>)}</div>}</div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5"><h3 className="text-white font-bold text-sm mb-4">Dataset Splits</h3><div className="space-y-3">{splitCounts.map(s=>{ const cols={"Train":"bg-blue-500","Dev":"bg-purple-500","Test":"bg-orange-500","Unlabeled":"bg-gray-600"}; return <div key={s.label}><div className="flex justify-between mb-1"><span className="text-xs text-gray-300">{s.label}</span><span className="text-xs text-gray-500 font-mono">{s.count}/{traces.length}</span></div><div className="h-2 bg-gray-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${cols[s.label]}`} style={{width:traces.length?`${(s.count/traces.length)*100}%`:"0%"}}/></div></div>; })}</div></div>
      </div>
    </div>
  </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [sessions,   setSessions]   = useState(()=>loadSessions());
  const [activeSession, setActiveSession] = useState(null);
  const [view,       setView]       = useState("home");
  const [toast,      setToast]      = useState("");

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(""),3500); };

  // Persist sessions whenever they change
  useEffect(() => { saveSessions(sessions); }, [sessions]);

  const persistSession = (updated) => {
    setSessions(prev => prev.map(s => s.id===updated.id ? updated : s));
    setActiveSession(updated);
  };

  const updateSession = (patch) => {
    const updated = { ...activeSession, ...patch };
    persistSession(updated);
  };

  const onLoad = (traces, skipped, filename, mode) => {
    const s = createSession(traces, filename);
    if (mode==="withAnnotations") s.annotations = DEMO_ANNOTATIONS;
    setSessions(prev=>[s,...prev]);
    setActiveSession(s);
    setView("review");
    if(skipped>0) showToast(`⚠️ ${skipped} fila${skipped>1?"s":""} omitidas`);
    else showToast("✅ Sesión creada");
  };

  const onContinue = s => { setActiveSession(s); setView("review"); };
  const onDelete   = id => { setSessions(prev=>prev.filter(s=>s.id!==id)); if(activeSession?.id===id){ setActiveSession(null); setView("home"); } };
  const onRename   = (id, name) => { setSessions(prev=>prev.map(s=>s.id===id?{...s,name}:s)); if(activeSession?.id===id) setActiveSession(a=>({...a,name})); };
  const onNew      = () => setView("ingest");

  const noSession = !activeSession || !activeSession.traces?.length;

  return (
    <div className="h-screen flex bg-gray-950 font-sans overflow-hidden">
      <Sidebar view={view} setView={setView} session={activeSession}/>
      <div className="flex-1 overflow-hidden">
        {view==="home"     && <SessionsHome sessions={sessions} onContinue={onContinue} onDelete={onDelete} onNew={onNew} onRename={onRename}/>}
        {view==="ingest"   && <IngestView onLoad={onLoad}/>}
        {view==="review"   && (noSession
          ? <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-3"><span className="text-4xl">📥</span><p>Carga o selecciona una sesión primero</p><button onClick={()=>setView("home")} className="text-indigo-400 text-sm border border-indigo-700 rounded-lg px-4 py-2 hover:bg-indigo-900/30">→ Ver sesiones</button></div>
          : <TraceReview session={activeSession} updateSession={updateSession}/>)}
        {view==="taxonomy" && (noSession ? null : <TaxonomyBuilder session={activeSession} updateSession={updateSession}/>)}
        {view==="judge"    && (noSession ? null : <JudgeStudio session={activeSession} updateSession={updateSession}/>)}
        {view==="golden"   && (noSession ? null : <GoldenDataset session={activeSession}/>)}
        {view==="dashboard"&& (noSession ? null : <Dashboard session={activeSession}/>)}
      </div>
      {toast&&<div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm shadow-xl z-50 border border-gray-700">{toast}</div>}
    </div>
  );
}
