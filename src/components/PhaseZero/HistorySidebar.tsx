import { useState, useEffect } from "react";
import { X, Clock, Zap, FileText, ChevronRight, AlertCircle } from "lucide-react";
import { supabase } from "../../supabaseClient";
import type { EvaluationResult } from "./Playground";

interface Props {
    onLoadExperiment: (configA: any, configB: any, results: EvaluationResult[]) => void;
    onClose: () => void;
}

export function HistorySidebar({ onLoadExperiment, onClose }: Props) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: sbError } = await supabase
                .from("traces")
                .select("*")
                .in("source", ["phase_0_experiment", "phase_0_pairwise"])
                .order("created_at", { ascending: false });

            if (sbError) throw sbError;
            setHistory(data || []);
        } catch (err: any) {
            console.error("Error fetching history:", err);
            setError(err.message || "No se pudo cargar el historial");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const formatSnippet = (text: string) => {
        if (!text) return "Sin descripción";
        return text.length > 50 ? text.substring(0, 50) + "..." : text;
    };

    const getJudgmentBadge = (judgment: string) => {
        const baseClass = "text-[10px] px-1.5 py-0.5 rounded border font-bold ";
        if (judgment === "A") return <span className={baseClass + "bg-blue-900/30 text-blue-400 border-blue-500/20"}>GANA A</span>;
        if (judgment === "B") return <span className={baseClass + "bg-orange-900/30 text-orange-400 border-orange-500/20"}>GANA B</span>;
        if (judgment === "Tie") return <span className={baseClass + "bg-gray-700/50 text-gray-400 border-gray-600/30"}>EMPATE</span>;
        return <span className={baseClass + "bg-indigo-900/20 text-indigo-400 border-indigo-500/10"}>EXPERIMENTO</span>;
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <h2 className="font-bold text-gray-200 text-sm">Historial de Trazas</h2>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-3">
                        <span className="animate-spin text-indigo-500">⟳</span>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Cargando...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                        <AlertCircle className="w-6 h-6 text-red-500/50 mb-2" />
                        <p className="text-xs text-red-400">{error}</p>
                        <button onClick={fetchHistory} className="mt-3 text-[10px] text-indigo-400 underline font-bold uppercase tracking-tighter">Reintentar</button>
                    </div>
                ) : history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                        <FileText className="w-8 h-8 text-gray-700 mb-2" />
                        <p className="text-xs text-gray-500 italic">No hay registros aún.</p>
                    </div>
                ) : (
                    history.map((item) => {
                        const config = item.model_config || {};
                        let results = [];
                        try {
                            results = typeof item.output_data === 'string' ? JSON.parse(item.output_data) : (item.output_data || []);
                        } catch (e) {
                            console.warn("Error parseando data para registro:", item.id);
                        }
                        const date = new Date(item.created_at).toLocaleString();

                        return (
                            <div
                                key={item.id}
                                className="group bg-gray-800/40 border border-gray-700/50 rounded-xl p-3 hover:border-indigo-500/50 hover:bg-gray-800/80 transition-all flex flex-col gap-2 relative cursor-pointer shadow-sm overflow-hidden"
                                onClick={() => onLoadExperiment(config.configA, config.configB, results)}
                            >
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronRight className="w-4 h-4 text-indigo-400" />
                                </div>

                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-mono text-gray-500">{date}</span>
                                    {getJudgmentBadge(item.judgment)}
                                </div>

                                <div className="space-y-1 pr-6">
                                    <h3 className="text-[11px] font-bold text-gray-200 line-clamp-2 leading-tight">
                                        {formatSnippet(item.input_query)}
                                    </h3>

                                    {item.source === "phase_0_experiment" && (
                                        <div className="flex gap-1.5 flex-wrap mt-2">
                                            <div className="bg-gray-900 border border-gray-800 rounded-md px-1.5 py-0.5 text-[9px] flex items-center gap-1">
                                                <Zap className="w-2.5 h-2.5 text-blue-400" />
                                                <span className="text-gray-400">A: {config.configA?.model}</span>
                                            </div>
                                            <div className="bg-gray-900 border border-gray-800 rounded-md px-1.5 py-0.5 text-[9px] flex items-center gap-1">
                                                <Zap className="w-2.5 h-2.5 text-orange-400" />
                                                <span className="text-gray-400">B: {config.configB?.model}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {config.configA?.systemPrompt && (
                                    <p className="text-[10px] text-gray-500 italic line-clamp-1 border-l-2 border-gray-700/50 pl-2 mt-1">
                                        {formatSnippet(config.configA.systemPrompt)}
                                    </p>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
