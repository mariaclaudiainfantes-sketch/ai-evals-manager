import { useState } from "react";
import { Plus, X, Dices, FileText, Trash2, Cpu, ChevronDown, ChevronUp, CheckSquare, Square } from "lucide-react";

interface Dimension {
    id: string;
    name: string;
    values: string[];
}

export interface QueryItem {
    id: string;
    tuple: Record<string, string>;
    text: string;
    selected?: boolean;
    error?: boolean;
}

interface Props {
    queries: QueryItem[];
    setQueries: React.Dispatch<React.SetStateAction<QueryItem[]>>;
}

export function SyntheticDataGenerator({ queries, setQueries }: Props) {
    const [dimensions, setDimensions] = useState<Dimension[]>([
        { id: "1", name: "Feature", values: ["Dashboard", "Onboarding"] },
        { id: "2", name: "Persona", values: ["Admin", "New User"] },
        { id: "3", name: "Scenario", values: ["Fast internet", "Error mode"] },
    ]);

    const [inputValue, setInputValue] = useState<Record<string, string>>({});
    const [tuples, setTuples] = useState<Record<string, string>[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const [expectedSchema, setExpectedSchema] = useState("");
    const [generationContext, setGenerationContext] = useState("");
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

    const addValue = (dimId: string) => {
        const val = (inputValue[dimId] || "").trim();
        if (!val) return;
        setDimensions(dims => dims.map(d =>
            d.id === dimId && (!d.values.includes(val))
                ? { ...d, values: [...d.values, val] }
                : d
        ));
        setInputValue(prev => ({ ...prev, [dimId]: "" }));
    };

    const removeValue = (dimId: string, valToRemove: string) => {
        setDimensions(dims => dims.map(d =>
            d.id === dimId
                ? { ...d, values: d.values.filter(v => v !== valToRemove) }
                : d
        ));
    };

    const updateDimName = (dimId: string, newName: string) => {
        setDimensions(dims => dims.map(d => d.id === dimId ? { ...d, name: newName } : d));
    };

    const generateTuples = () => {
        let results: Record<string, string>[] = [{}];

        for (const dim of dimensions) {
            if (dim.values.length === 0) continue;
            const nextResults: Record<string, string>[] = [];
            for (const res of results) {
                for (const val of dim.values) {
                    nextResults.push({ ...res, [dim.name]: val });
                }
            }
            results = nextResults;
        }

        if (results.length === 1 && Object.keys(results[0]).length === 0) {
            setTuples([]);
            return;
        }

        const shuffled = [...results].sort(() => 0.5 - Math.random());
        setTuples(shuffled.slice(0, 15));
        setQueries([]);
    };

    const generateNaturalLanguage = async () => {
        if (tuples.length === 0) return;
        const key = localStorage.getItem("OPENAI_API_KEY");
        if (!key) {
            setErrorMsg("Necesitas una API Key de OpenAI para generar las consultas con IA.");
            return;
        }

        setIsGenerating(true);
        setErrorMsg("");

        try {
            const newQueries: QueryItem[] = [];

            for (const tuple of tuples) {
                const tupleStr = JSON.stringify(tuple);
                let currentContext = generationContext || "Generate a realistic user query.";
                currentContext = currentContext.replace(/{{tuple}}/g, tupleStr).replace(/{{expected_schema}}/g, expectedSchema);

                const systemPadding = `CRITICAL: You MUST output ONLY valid JSON. Your generated JSON MUST strictly adhere to the exact structure in the <expected_schema>. Do not add conversational text.`;

                const prompt = `
Context: ${currentContext}
<expected_schema>
${expectedSchema || "A simple string representing the user query."}
</expected_schema>

Generate 1 item for this combination: ${tupleStr}
${systemPadding}
`;

                const res = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${key}`
                    },
                    body: JSON.stringify({
                        model: "gpt-4o-mini",
                        messages: [
                            { role: "system", content: "You are a synthetic data generator. Output ONLY minified JSON." },
                            { role: "user", content: prompt }
                        ],
                        temperature: 0.7
                    })
                });

                if (!res.ok) throw new Error("Error fetching from OpenAI");

                const data = await res.json();
                const text = data.choices[0].message.content.trim();
                const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();

                let parsed;
                let hasError = false;
                try {
                    parsed = JSON.parse(cleanedText);
                } catch (e) {
                    parsed = cleanedText;
                    hasError = true;
                }

                newQueries.push({
                    id: Math.random().toString(36).substring(7),
                    tuple,
                    text: typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2),
                    selected: true,
                    error: hasError
                });
            }

            setQueries(newQueries);
        } catch (e: any) {
            console.error(e);
            setErrorMsg("Error al generar texto. Revisa la consola o tu clave de API.");
        } finally {
            setIsGenerating(false);
        }
    };

    const deleteQuery = (id: string) => {
        setQueries(qs => qs.filter(q => q.id !== id));
    };

    const toggleSelect = (id: string) => {
        setQueries(qs => qs.map(q => q.id === id ? { ...q, selected: !q.selected } : q));
    };

    const toggleExpand = (id: string) => {
        setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const selectAll = () => setQueries(qs => qs.map(q => ({ ...q, selected: true })));
    const deselectAll = () => setQueries(qs => qs.map(q => ({ ...q, selected: false })));

    return (
        <div className="flex flex-col xl:flex-row gap-6">
            {/* Config Panel */}
            <div className="w-full xl:w-2/5 space-y-6">
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <LayersIcon className="w-4 h-4" /> Dimensiones
                    </h3>

                    <div className="space-y-3">
                        {dimensions.map(dim => (
                            <div key={dim.id} className="bg-gray-800/50 border border-gray-700/60 rounded-xl p-3">
                                <input
                                    value={dim.name}
                                    onChange={e => updateDimName(dim.id, e.target.value)}
                                    className="bg-transparent border-none text-sm font-bold text-indigo-300 focus:outline-none focus:ring-0 mb-2 w-full"
                                />
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {dim.values.map(v => (
                                        <span key={v} className="bg-gray-900 border border-gray-700 text-gray-300 text-xs px-2 py-1 rounded-md flex items-center gap-1 group">
                                            {v}
                                            <button onClick={() => removeValue(dim.id, v)} className="text-gray-500 hover:text-red-400">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={inputValue[dim.id] || ""}
                                        onChange={e => setInputValue(prev => ({ ...prev, [dim.id]: e.target.value }))}
                                        onKeyDown={e => e.key === "Enter" && addValue(dim.id)}
                                        placeholder="Nuevo valor..."
                                        className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:ring-1 focus:ring-indigo-500 outline-none flex-1"
                                    />
                                    <button onClick={() => addValue(dim.id)} className="bg-gray-700 hover:bg-gray-600 p-1.5 rounded-lg text-gray-300 transition-colors">
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={generateTuples}
                        className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-sm font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <Dices className="w-4 h-4 text-indigo-400" />
                        Mezclar y generar Tuplas
                    </button>
                </div>

                {/* New Config Fields */}
                <div className="space-y-4 pt-4 border-t border-gray-800">
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                            Expected Input Format / Example (JSON)
                        </label>
                        <textarea
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-xs text-gray-300 font-mono focus:ring-1 focus:ring-indigo-500 outline-none h-32"
                            placeholder='{"query": "string", "context": "string"}'
                            value={expectedSchema}
                            onChange={e => setExpectedSchema(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                            Generation Context & Instructions
                        </label>
                        <textarea
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-xs text-gray-300 focus:ring-1 focus:ring-indigo-500 outline-none h-32"
                            placeholder="Ej: Somos un asistente de CV... Usa {{tuple}} para el contexto."
                            value={generationContext}
                            onChange={e => setGenerationContext(e.target.value)}
                        />
                        <p className="text-[10px] text-gray-500 italic">Disponibles: {"{{tuple}}"}, {"{{expected_schema}}"}</p>
                    </div>
                </div>
            </div>

            {/* Results Panel */}
            <div className="w-full xl:w-3/5 bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex flex-col">
                {errorMsg && (
                    <div className="mb-4 bg-red-950/40 border border-red-700/50 text-red-400 text-xs px-3 py-2 rounded-lg">
                        {errorMsg}
                    </div>
                )}

                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Consultas de Prueba ({queries.length || tuples.length})
                    </h3>

                    <div className="flex items-center gap-2">
                        {queries.length > 0 && (
                            <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-1 mr-2">
                                <button onClick={selectAll} className="px-2 py-1 text-[10px] font-bold text-gray-400 hover:text-white transition-colors">Todo</button>
                                <div className="w-px bg-gray-700 mx-1" />
                                <button onClick={deselectAll} className="px-2 py-1 text-[10px] font-bold text-gray-400 hover:text-white transition-colors">Nada</button>
                            </div>
                        )}
                        <button
                            disabled={tuples.length === 0 || isGenerating}
                            onClick={generateNaturalLanguage}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg"
                        >
                            {isGenerating ? <span className="animate-spin">⟳</span> : <Cpu className="w-4 h-4" />}
                            Generar Texto IA
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 min-h-[400px]">
                    {queries.length > 0 ? (
                        queries.map(q => {
                            const tupleDesc = Object.entries(q.tuple).map(([k, v]) => `${k}: ${v}`).join(" | ");
                            const isExpanded = expandedItems[q.id];
                            return (
                                <div key={q.id} className={`bg-gray-800 border transition-colors rounded-xl overflow-hidden group ${q.error ? "border-red-500/50" : "border-gray-700 hover:border-gray-600"}`}>
                                    <div className="flex items-center px-4 py-3 cursor-pointer select-none" onClick={() => toggleExpand(q.id)}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleSelect(q.id); }}
                                            className="mr-3 text-indigo-400 hover:text-indigo-300"
                                        >
                                            {q.selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-gray-600" />}
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-300 truncate">{tupleDesc}</p>
                                            {q.error && <span className="text-[10px] text-red-400 font-semibold">Error de parseo JSON</span>}
                                        </div>

                                        <div className="flex items-center gap-2 ml-4">
                                            <button onClick={(e) => { e.stopPropagation(); deleteQuery(q.id); }} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="px-4 pb-4 pt-1 border-t border-gray-700/50">
                                            <pre className="mt-2 bg-gray-950 rounded-lg p-3 text-[11px] text-indigo-300 font-mono overflow-auto max-h-96 leading-relaxed">
                                                <code>{q.text}</code>
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : tuples.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                            {tuples.map((t, i) => (
                                <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs">
                                    {Object.entries(t).map(([k, v]) => (
                                        <div key={k}><strong className="text-gray-500">{k}:</strong> <span className="text-indigo-300">{v}</span></div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600">
                            <Dices className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-sm">No hay combinaciones generadas.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function LayersIcon(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 12 12 17 22 12" />
            <polyline points="2 17 12 22 22 17" />
        </svg>
    );
}
