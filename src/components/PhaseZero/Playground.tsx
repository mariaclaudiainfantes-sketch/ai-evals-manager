import { useState } from "react";
import { Play, Settings2, AlertCircle } from "lucide-react";
import type { QueryItem } from "./SyntheticDataGenerator";

export interface ModelConfig {
    provider: "openai" | "anthropic";
    model: string;
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
}

export interface EvaluationResult {
    id: string;
    query: QueryItem;
    configA: ModelConfig;
    configB: ModelConfig;
    outputA: string | null;
    errorA: string | null;
    outputB: string | null;
    errorB: string | null;
}

interface Props {
    queries: QueryItem[];
    onResultsGenerated: (results: EvaluationResult[]) => void;
}

const DEFAULT_PROMPT = "You are a helpful assistant. Reply exactly to what the user asks.";

export function Playground({ queries, onResultsGenerated }: Props) {
    const [configA, setConfigA] = useState<ModelConfig>({
        provider: "openai",
        model: "gpt-4o-mini",
        systemPrompt: DEFAULT_PROMPT,
        temperature: 0.7,
        maxTokens: 500
    });

    const [configB, setConfigB] = useState<ModelConfig>({
        provider: "anthropic",
        model: "claude-3-5-sonnet-latest",
        systemPrompt: DEFAULT_PROMPT,
        temperature: 0.7,
        maxTokens: 500
    });

    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    const runOpenAI = async (queryText: string, config: ModelConfig, key: string) => {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    { role: "system", content: config.systemPrompt },
                    { role: "user", content: queryText }
                ],
                temperature: config.temperature,
                max_tokens: config.maxTokens
            })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || "OpenAI API Error");
        }
        const data = await res.json();
        return data.choices[0].message.content;
    };

    const runAnthropic = async (queryText: string, config: ModelConfig, key: string) => {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
                "anthropic-dangerously-allow-browser": "true" // Needed for client side fetch
            },
            body: JSON.stringify({
                model: config.model,
                system: config.systemPrompt,
                messages: [{ role: "user", content: queryText }],
                temperature: config.temperature,
                max_tokens: config.maxTokens
            })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || "Anthropic API Error");
        }
        const data = await res.json();
        return data.content[0].text;
    };

    const handleRun = async () => {
        if (queries.length === 0) return;
        const openAiKey = localStorage.getItem("OPENAI_API_KEY");
        const anthropicKey = localStorage.getItem("ANTHROPIC_API_KEY");

        setIsRunning(true);
        setProgress({ current: 0, total: queries.length });
        const results: EvaluationResult[] = [];

        for (let i = 0; i < queries.length; i++) {
            const q = queries[i];
            let outA = null, errA = null, outB = null, errB = null;

            // Run A
            try {
                if (configA.provider === "openai") {
                    if (!openAiKey) throw new Error("Missing OpenAI API Key");
                    outA = await runOpenAI(q.text, configA, openAiKey);
                } else {
                    if (!anthropicKey) throw new Error("Missing Anthropic API Key");
                    outA = await runAnthropic(q.text, configA, anthropicKey);
                }
            } catch (e: any) {
                errA = e.message;
            }

            // Run B
            try {
                if (configB.provider === "openai") {
                    if (!openAiKey) throw new Error("Missing OpenAI API Key");
                    outB = await runOpenAI(q.text, configB, openAiKey);
                } else {
                    if (!anthropicKey) throw new Error("Missing Anthropic API Key");
                    outB = await runAnthropic(q.text, configB, anthropicKey);
                }
            } catch (e: any) {
                errB = e.message;
            }

            results.push({
                id: Math.random().toString(36).substring(7),
                query: q,
                configA: { ...configA },
                configB: { ...configB },
                outputA: outA,
                errorA: errA,
                outputB: outB,
                errorB: errB
            });
            setProgress({ current: i + 1, total: queries.length });
        }

        onResultsGenerated(results);
        setIsRunning(false);
    };

    const renderConfig = (title: string, config: ModelConfig, setConfig: (c: ModelConfig) => void) => (
        <div className="flex-1 bg-gray-800/50 border border-gray-700/60 rounded-xl p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
                <Settings2 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-gray-200">{title}</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Provider</label>
                    <select
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-indigo-500"
                        value={config.provider}
                        onChange={e => setConfig({ ...config, provider: e.target.value as any, model: e.target.value === "openai" ? "gpt-4o" : "claude-3-5-sonnet-latest" })}
                    >
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Model</label>
                    <select
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-indigo-500"
                        value={config.model}
                        onChange={e => setConfig({ ...config, model: e.target.value })}
                    >
                        {config.provider === "openai" ? (
                            <>
                                <option value="gpt-4o">gpt-4o</option>
                                <option value="gpt-4o-mini">gpt-4o-mini</option>
                            </>
                        ) : (
                            <>
                                <option value="claude-3-5-sonnet-latest">claude-3-5-sonnet-latest</option>
                                <option value="claude-3-haiku-20240307">claude-3-haiku</option>
                            </>
                        )}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Temp ({config.temperature})</label>
                    <input
                        type="range" min="0" max="2" step="0.1"
                        className="w-full accent-indigo-500"
                        value={config.temperature}
                        onChange={e => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Max Tokens</label>
                    <input
                        type="number"
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-indigo-500"
                        value={config.maxTokens}
                        onChange={e => setConfig({ ...config, maxTokens: parseInt(e.target.value) || 500 })}
                    />
                </div>
            </div>

            <div className="flex-1 flex flex-col">
                <label className="block text-xs font-semibold text-gray-500 mb-1">System Prompt</label>
                <textarea
                    className="w-full flex-1 min-h-[120px] bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed resize-y"
                    value={config.systemPrompt}
                    onChange={e => setConfig({ ...config, systemPrompt: e.target.value })}
                />
            </div>
        </div>
    );

    return (
        <div className="flex flex-col space-y-4">
            <div className="flex flex-col lg:flex-row gap-6">
                {renderConfig("Configuración A", configA, setConfigA)}
                {renderConfig("Configuración B", configB, setConfigB)}
            </div>

            <div className="flex items-center justify-between bg-gray-800/30 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <p className="text-sm text-gray-300">
                        Consultas pendientes: <strong className="text-white">{queries.length}</strong>
                    </p>
                    {isRunning && (
                        <span className="text-xs text-indigo-400 font-mono bg-indigo-900/30 px-2 py-1 rounded">
                            Procesando {progress.current} de {progress.total}...
                        </span>
                    )}
                </div>
                <button
                    onClick={handleRun}
                    disabled={queries.length === 0 || isRunning}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg"
                >
                    {isRunning ? <span className="animate-spin">⟳</span> : <Play className="w-4 h-4" />}
                    Run Synthetic Queries
                </button>
            </div>

            {queries.length === 0 && (
                <div className="flex items-center gap-2 text-yellow-400/80 text-xs mt-2 justify-center">
                    <AlertCircle className="w-4 h-4" /> Genera consultas en el paso anterior para poder ejecutar.
                </div>
            )}
        </div>
    );
}
