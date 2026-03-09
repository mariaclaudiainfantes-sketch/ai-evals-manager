import { useState } from "react";
import type { EvaluationResult } from "./Playground";
import { Trophy, Handshake, Save, ChevronRight, ChevronLeft } from "lucide-react";
import { supabase } from "../../supabaseClient";

interface Props {
    results: EvaluationResult[];
}

export function PairwiseComparison({ results }: Props) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [critiques, setCritiques] = useState<Record<string, string>>({});
    const [winners, setWinners] = useState<Record<string, "A" | "B" | "Tie">>({});
    const [isSaving, setIsSaving] = useState(false);
    const [rawView, setRawView] = useState(false);

    if (!results || results.length === 0) return null;

    const res = results[currentIndex];
    const query = res.query;
    const currentCritique = critiques[res.id] || "";
    const currentWinner = winners[res.id] || null;

    const handleWinnerSelect = (w: "A" | "B" | "Tie") => {
        setWinners(prev => ({ ...prev, [res.id]: w }));
    };

    const handleSaveBaseline = async () => {
        if (!currentWinner || !currentCritique.trim()) return;

        setIsSaving(true);
        try {
            // Determines winning configuration and output
            let winnerOutput = null;
            let winnerConfig = null;

            if (currentWinner === "A") {
                winnerOutput = res.outputA;
                winnerConfig = res.configA;
            } else if (currentWinner === "B") {
                winnerOutput = res.outputB;
                winnerConfig = res.configB;
            } else {
                // En caso de empate, decidimos guardar A arbitrariamente o no guardar. 
                // Guardaremos A como base si eligen empate.
                winnerOutput = res.outputA;
                winnerConfig = res.configA;
            }

            // Preparar el objeto a guardar
            const payload = {
                input_user_context: query.tuple,
                input_query: query.text,
                output_data: winnerOutput,
                model_config: winnerConfig,
                judgment: currentWinner,
                critique: currentCritique,
                source: "phase_0_pairwise"
            };

            // Inserción en tabla 'traces' (o 'Traces' dependiendo de Postgres case folding, 
            // normalmente es minúsculas a menos que tenga comillas, usaremos 'traces')
            const { error } = await supabase.from("traces").insert([payload]);

            if (error) {
                // En caso de que la tabla se llame Traces mayuscula, intentamos con T mayuscula
                const fallback = await supabase.from("traces").insert([payload]);
                if (fallback.error) throw fallback.error;
            }

            alert("Ganador guardado como Baseline correctamente.");

            // Pasar al siguiente
            if (currentIndex < results.length - 1) {
                setCurrentIndex(i => i + 1);
            }
        } catch (e: any) {
            console.error(e);
            alert("Error al guardar en Supabase: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const OutputCard = ({
        label,
        output,
        error,
        isWinner,
        onSelect
    }: {
        label: "A" | "B";
        output: string | null;
        error: string | null;
        isWinner: boolean;
        onSelect: () => void;
    }) => {
        return (
            <div className={`flex-1 flex flex-col border rounded-xl overflow-hidden transition-all ${isWinner ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-950/10" : "border-gray-700 bg-gray-900"
                }`}>
                <div className="bg-gray-800/80 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
                    <span className="font-bold text-gray-200">Output {label}</span>
                    <button
                        onClick={onSelect}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${isWinner ? "bg-emerald-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                    >
                        <Trophy className="w-3.5 h-3.5" />
                        Elegir {label}
                    </button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto max-h-[400px]">
                    {error ? (
                        <div className="text-red-400 text-xs bg-red-950/40 p-3 rounded-lg border border-red-800">
                            Error ejecutando modelo: {error}
                        </div>
                    ) : rawView ? (
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap">{output}</pre>
                    ) : (
                        <div className="text-sm text-gray-300 whitespace-pre-wrap prose prose-invert prose-p:leading-relaxed prose-sm max-w-none">
                            {output || "Sin salida"}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const [isContextExpanded, setIsContextExpanded] = useState(true);

    const renderCleanQuery = (text: string) => {
        try {
            const parsed = JSON.parse(text);
            if (typeof parsed === "object" && parsed !== null) {
                return (
                    <div className="space-y-1">
                        {Object.entries(parsed).map(([key, value]) => (
                            <p key={key} className="text-gray-300">
                                <strong className="text-indigo-300">{key}:</strong> {String(value)}
                            </p>
                        ))}
                    </div>
                );
            }
        } catch (e) {
            // Fallback if not JSON
        }
        return <p className="text-lg text-gray-200 font-medium">{text}</p>;
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Top Nav */}
            <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-2">
                <div className="flex items-center gap-4">
                    <button
                        disabled={currentIndex === 0}
                        onClick={() => setCurrentIndex(i => i - 1)}
                        className="text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-semibold text-gray-300">
                        Comparando {currentIndex + 1} de {results.length}
                    </span>
                    <button
                        disabled={currentIndex === results.length - 1}
                        onClick={() => setCurrentIndex(i => i + 1)}
                        className="text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={rawView} onChange={e => setRawView(e.target.checked)} className="rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-0 focus:ring-offset-0" />
                    Ver crudo (Raw)
                </label>
            </div>

            {/* Query / Context - Collapsible Panel */}
            <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl overflow-hidden">
                <button
                    onClick={() => setIsContextExpanded(!isContextExpanded)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-indigo-900/10 hover:bg-indigo-900/20 transition-colors"
                >
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Contexto / User Query</span>
                    <span className="text-indigo-400 text-xs">{isContextExpanded ? "Ocultar" : "Mostrar"}</span>
                </button>

                {isContextExpanded && (
                    <div className="p-4 border-t border-indigo-900/30">
                        {rawView ? (
                            <pre className="bg-gray-950 p-3 rounded-lg text-xs text-gray-300 font-mono overflow-x-auto border border-gray-800">
                                <code>{query.text}</code>
                            </pre>
                        ) : (
                            renderCleanQuery(query.text)
                        )}

                        <div className="flex flex-wrap gap-2 mt-4">
                            {Object.entries(query.tuple).map(([k, v]) => (
                                <span key={k} className="bg-gray-900/80 border border-gray-700 text-xs text-gray-300 px-2 py-1 rounded-md">
                                    <strong className="text-gray-500">{k}:</strong> {v}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* A vs B */}
            <div className="flex flex-col lg:flex-row gap-4">
                <OutputCard
                    label="A"
                    output={res.outputA}
                    error={res.errorA}
                    isWinner={currentWinner === "A"}
                    onSelect={() => handleWinnerSelect("A")}
                />
                <OutputCard
                    label="B"
                    output={res.outputB}
                    error={res.errorB}
                    isWinner={currentWinner === "B"}
                    onSelect={() => handleWinnerSelect("B")}
                />
            </div>

            {/* Evaluation Controls */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col xl:flex-row gap-6 mt-2">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Critique / Notes <span className="text-red-400">*</span></label>
                    <textarea
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-3 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                        placeholder="Justifica por qué una versión es mejor que la otra..."
                        value={currentCritique}
                        onChange={e => setCritiques(prev => ({ ...prev, [res.id]: e.target.value }))}
                    />
                </div>

                <div className="flex flex-col gap-3 justify-end w-full xl:w-64 flex-shrink-0">
                    <button
                        onClick={() => handleWinnerSelect("Tie")}
                        className={`border px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${currentWinner === "Tie" ? "bg-blue-600 border-blue-500 text-white" : "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                            }`}
                    >
                        <Handshake className="w-4 h-4" /> Es un empate
                    </button>

                    <button
                        disabled={!currentWinner || !currentCritique.trim() || isSaving}
                        onClick={handleSaveBaseline}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-500 text-white px-4 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
                    >
                        {isSaving ? <span className="animate-spin">⟳</span> : <Save className="w-4 h-4" />}
                        Guardar como Baseline
                    </button>
                </div>
            </div>
        </div>
    );
}
