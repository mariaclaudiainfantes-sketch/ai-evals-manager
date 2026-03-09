import { useState, useEffect } from "react";
import { SettingsModal } from "./SettingsModal";
import { SyntheticDataGenerator, type QueryItem } from "./SyntheticDataGenerator";
import { Playground, type EvaluationResult } from "./Playground";
import { PairwiseComparison } from "./PairwiseComparison";
import { Settings, History as HistoryIcon } from "lucide-react";
import { HistorySidebar } from "./HistorySidebar";

const DEFAULT_PROMPT = "You are a helpful assistant. Reply exactly to what the user asks.";

export function ExperimentationView() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [hasKeys, setHasKeys] = useState(true);
    const [queries, setQueries] = useState<QueryItem[]>([]);
    const [results, setResults] = useState<EvaluationResult[]>([]);

    // State lifted from Playground for history restoration
    const [configA, setConfigA] = useState<any>({
        provider: "openai",
        model: "gpt-4o-mini",
        systemPrompt: DEFAULT_PROMPT,
        temperature: 0.7,
        maxTokens: 500
    });

    const [configB, setConfigB] = useState<any>({
        provider: "anthropic",
        model: "claude-3-5-sonnet-latest",
        systemPrompt: DEFAULT_PROMPT,
        temperature: 0.7,
        maxTokens: 500
    });

    // Check keys on mount and when modal closes
    const checkKeys = () => {
        const openAi = localStorage.getItem("OPENAI_API_KEY");
        const anthropic = localStorage.getItem("ANTHROPIC_API_KEY");
        const gemini = localStorage.getItem("GEMINI_API_KEY");
        const valid = !!(openAi || anthropic || gemini);
        setHasKeys(valid);
    };

    useEffect(() => {
        checkKeys();
    }, []);

    const handleLoadExperiment = (savedConfigA: any, savedConfigB: any, savedResults: EvaluationResult[]) => {
        setConfigA(savedConfigA);
        setConfigB(savedConfigB);
        setResults(savedResults || []);
        setIsHistoryOpen(false);
    };

    return (
        <div className="h-full bg-gray-950 flex overflow-hidden">
            {/* History Sidebar */}
            {isHistoryOpen && (
                <div className="w-80 border-r border-gray-800 bg-gray-900/50 flex-shrink-0 flex flex-col">
                    <HistorySidebar onLoadExperiment={handleLoadExperiment} onClose={() => setIsHistoryOpen(false)} />
                </div>
            )}

            <div className="flex-1 flex flex-col overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-gray-900/90 backdrop-blur-md px-6 py-4 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                            className={`p-2 rounded-lg transition-colors ${isHistoryOpen ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}
                            title="Historial de Experimentos"
                        >
                            <HistoryIcon className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="text-2xl">🧪</span> Fase 0: Experimentation & Pre-Deployment
                            </h1>
                            <p className="text-sm text-gray-400 mt-1">
                                Genera datos sintéticos, prueba modelos en paralelo y evalúa comparaciones.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {!hasKeys && (
                            <span className="text-xs bg-red-900/40 border border-red-700 text-red-300 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1">
                                ⚠️ API Keys faltan
                            </span>
                        )}
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors border border-gray-700"
                        >
                            <Settings className="w-4 h-4" />
                            Configuración API
                        </button>
                    </div>
                </div>

                {/* Main Content Areas */}
                <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
                    {/* Synthetic Data Generator Section */}
                    <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-white mb-4">1. Generador de Datos Sintéticos</h2>
                        <SyntheticDataGenerator queries={queries} setQueries={setQueries} />
                    </section>

                    {/* A/B Playground Section */}
                    <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-white mb-4">2. A/B Prompt & Model Playground</h2>
                        <Playground
                            queries={queries}
                            onResultsGenerated={setResults}
                            configA={configA}
                            setConfigA={setConfigA}
                            configB={configB}
                            setConfigB={setConfigB}
                            results={results}
                        />
                    </section>

                    {/* Pairwise Comparison Section */}
                    <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-sm mb-12">
                        <h2 className="text-lg font-bold text-white mb-4">3. Pairwise Comparison Canvas</h2>
                        {results.length > 0 ? (
                            <PairwiseComparison results={results} />
                        ) : (
                            <div className="text-gray-500 text-sm h-64 flex items-center justify-center border-2 border-dashed border-gray-800 rounded-xl">
                                Ejecuta consultas para ver comparaciones
                            </div>
                        )}
                    </section>
                </div>

                <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => {
                        setIsSettingsOpen(false);
                        checkKeys();
                    }}
                />
            </div>
        </div>
    );
}
