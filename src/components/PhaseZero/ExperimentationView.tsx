import { useState, useEffect } from "react";
import { SettingsModal } from "./SettingsModal";
import { SyntheticDataGenerator, type QueryItem } from "./SyntheticDataGenerator";
import { Playground, type EvaluationResult } from "./Playground";
import { PairwiseComparison } from "./PairwiseComparison";
import { Settings } from "lucide-react";

export function ExperimentationView() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [hasKeys, setHasKeys] = useState(true);
    const [queries, setQueries] = useState<QueryItem[]>([]);
    const [results, setResults] = useState<EvaluationResult[]>([]);

    // Check keys on mount and when modal closes
    const checkKeys = () => {
        const openAi = localStorage.getItem("OPENAI_API_KEY");
        const anthropic = localStorage.getItem("ANTHROPIC_API_KEY");
        const valid = !!(openAi && anthropic);
        setHasKeys(valid);
        if (!valid && !isSettingsOpen) {
            // Small delay to ensure render
            setTimeout(() => setIsSettingsOpen(true), 100);
        }
    };

    useEffect(() => {
        checkKeys();
    }, []);

    return (
        <div className="h-full bg-gray-950 overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-gray-900/90 backdrop-blur-md px-6 py-4 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">🧪</span> Fase 0: Experimentation & Pre-Deployment
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Genera datos sintéticos, prueba modelos en paralelo y evalúa comparaciones.
                    </p>
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
                    <Playground queries={queries} onResultsGenerated={setResults} />
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
    );
}
