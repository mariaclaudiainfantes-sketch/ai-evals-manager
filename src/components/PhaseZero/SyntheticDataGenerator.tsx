import { useState } from "react";
import { Plus, X, Dices, FileText, Trash2, Cpu } from "lucide-react";

interface Dimension {
    id: string;
    name: string;
    values: string[];
}

export interface QueryItem {
    id: string;
    tuple: Record<string, string>;
    text: string;
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

        // Si no hay valores en ninguna dimension
        if (results.length === 1 && Object.keys(results[0]).length === 0) {
            setTuples([]);
            return;
        }

        // Seleccionamos al azar o mostramos todas. Para un playground, podemos limitarlas
        // a una mezcla aleatoria de maximo 10 para probar o todas.
        const shuffled = [...results].sort(() => 0.5 - Math.random());
        setTuples(shuffled.slice(0, 15)); // max 15 tuples to avoid token spam
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
            // Creamos un prompt batch
            const prompt = `Given these combinations of contexts, generate 1 realistic user query for each. Output exactly a valid JSON array of strings in the same order.\Combinations:\n${JSON.stringify(tuples, null, 2)}`;

            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{ role: "system", content: "You generate synthetic queries based on dimensions. Always reply with raw JSON array of strings like [\"query 1\", \"query 2\"]." }, { role: "user", content: prompt }],
                    temperature: 0.7
                })
            });

            if (!res.ok) throw new Error("Error fetching from OpenAI");

            const data = await res.json();
            const text = data.choices[0].message.content.trim();

            // Intentar limpiar JSON por si devolvio markdown ```json [ ... ] ```
            const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const generatedStrings = JSON.parse(cleanedText);

            if (Array.isArray(generatedStrings)) {
                const newQueries = generatedStrings.map((qs, i) => ({
                    id: Math.random().toString(36).substring(7),
                    tuple: tuples[i],
                    text: qs
                }));
                setQueries(newQueries);
            }
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

    return (
        <div className="flex flex-col xl:flex-row gap-6">
            {/* Dimensiones Config */}
            <div className="w-full xl:w-2/5 space-y-4">
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

            {/* Resultados & Queries */}
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
                    <button
                        disabled={tuples.length === 0 || isGenerating}
                        onClick={generateNaturalLanguage}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg"
                    >
                        {isGenerating ? <span className="animate-spin">⟳</span> : <Cpu className="w-4 h-4" />}
                        Generar texto IA
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 min-h-[200px]">
                    {queries.length > 0 ? (
                        queries.map(q => (
                            <div key={q.id} className="bg-gray-800 border border-gray-700 rounded-xl p-3 group">
                                <div className="flex justify-between items-start gap-4">
                                    <p className="text-sm text-gray-200 leading-relaxed font-medium">{q.text}</p>
                                    <button onClick={() => deleteQuery(q.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {Object.entries(q.tuple).map(([k, v]) => (
                                        <span key={k} className="text-[10px] bg-gray-900 border border-gray-700 text-gray-400 px-1.5 py-0.5 rounded font-mono">
                                            {k}: <span className="text-indigo-300">{v}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))
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
