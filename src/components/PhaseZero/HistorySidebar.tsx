import { useState, useEffect } from "react";
import { X, Clock, Zap, FileText, ChevronRight } from "lucide-react";
import { supabase } from "../../supabaseClient";
import type { EvaluationResult } from "./Playground";

interface Props {
    onLoadExperiment: (configA: any, configB: any, results: EvaluationResult[]) => void;
    onClose: () => void;
}

export function HistorySidebar({ onLoadExperiment, onClose }: Props) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("traces")
                .select("*")
                .eq("source", "phase_0_experiment")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setHistory(data || []);
        } catch (e) {
            console.error("Error fetching history:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const formatPrompt = (prompt: string) => {
        if (!prompt) return "N/A";
        return prompt.length > 60 ? prompt.substring(0, 60) + "..." : prompt;
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <h2 className="font-bold text-gray-200 text-sm">Historial de Experimentos</h2>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <span className="animate-spin text-indigo-500">⟳</span>
                    </div>
                ) : history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                        <FileText className="w-8 h-8 text-gray-700 mb-2" />
                        <p className="text-xs text-gray-500 italic">No hay experimentos guardados aún.</p>
                    </div>
                ) : (
                    history.map((item) => {
                        const config = item.model_config || {};
                        const results = JSON.parse(item.output_data || "[]");
                        const date = new Date(item.created_at).toLocaleString();

                        return (
                            <div key={item.id} className="group bg-gray-800/40 border border-gray-700/50 rounded-xl p-3 hover:border-indigo-500/50 hover:bg-gray-800/80 transition-all flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono text-gray-500">{date}</span>
                                    <span className="text-[10px] bg-indigo-900/30 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                        {results.length} results
                                    </span>
                                </div>

                                {/* Model Badges */}
                                <div className="flex gap-1.5 flex-wrap">
                                    <div className="bg-gray-900 border border-gray-700 rounded-md px-1.5 py-0.5 text-[9px] flex items-center gap-1">
                                        <Zap className="w-2.5 h-2.5 text-blue-400" />
                                        <span className="text-gray-300 font-medium">A: {config.configA?.model}</span>
                                    </div>
                                    <div className="bg-gray-900 border border-gray-700 rounded-md px-1.5 py-0.5 text-[9px] flex items-center gap-1">
                                        <Zap className="w-2.5 h-2.5 text-orange-400" />
                                        <span className="text-gray-300 font-medium">B: {config.configB?.model}</span>
                                    </div>
                                </div>

                                {/* Prompt Snippets */}
                                <div className="space-y-1">
                                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">Prompts Snippets</p>
                                    <div className="text-[10px] text-gray-400 italic bg-gray-900/50 rounded p-1.5 border border-gray-800/30 line-clamp-2">
                                        <span className="text-indigo-400 font-semibold not-italic mr-1">A:</span>
                                        "{formatPrompt(config.configA?.systemPrompt)}"
                                    </div>
                                    <div className="text-[10px] text-gray-400 italic bg-gray-900/50 rounded p-1.5 border border-gray-800/30 line-clamp-2">
                                        <span className="text-orange-400 font-semibold not-italic mr-1">B:</span>
                                        "{formatPrompt(config.configB?.systemPrompt)}"
                                    </div>
                                </div>

                                <button
                                    onClick={() => onLoadExperiment(config.configA, config.configB, results)}
                                    className="mt-1 w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold py-1.5 rounded-lg transition-colors shadow-sm"
                                >
                                    Cargar Experimento <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
