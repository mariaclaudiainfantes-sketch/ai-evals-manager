import { useState, useEffect } from "react";
import { X, Key } from "lucide-react";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [openAiKey, setOpenAiKey] = useState("");
    const [anthropicKey, setAnthropicKey] = useState("");

    useEffect(() => {
        if (isOpen) {
            setOpenAiKey(localStorage.getItem("OPENAI_API_KEY") || "");
            setAnthropicKey(localStorage.getItem("ANTHROPIC_API_KEY") || "");
        }
    }, [isOpen]);

    const handleSave = () => {
        if (openAiKey) localStorage.setItem("OPENAI_API_KEY", openAiKey.trim());
        else localStorage.removeItem("OPENAI_API_KEY");

        if (anthropicKey) localStorage.setItem("ANTHROPIC_API_KEY", anthropicKey.trim());
        else localStorage.removeItem("ANTHROPIC_API_KEY");

        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                        <Key className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-lg font-bold text-white">Configuración de API Keys</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <p className="text-sm text-gray-400">
                        Guarda tus claves de API para generar datos sintéticos y probar modelos en el Playground.
                        Se almacenarán localmente en tu navegador.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                                OpenAI API Key
                            </label>
                            <input
                                type="password"
                                placeholder="sk-..."
                                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                value={openAiKey}
                                onChange={(e) => setOpenAiKey(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                                Anthropic API Key
                            </label>
                            <input
                                type="password"
                                placeholder="sk-ant-..."
                                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                value={anthropicKey}
                                onChange={(e) => setAnthropicKey(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-800 flex justify-end gap-3 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg"
                    >
                        Guardar y Continuar
                    </button>
                </div>
            </div>
        </div>
    );
}
