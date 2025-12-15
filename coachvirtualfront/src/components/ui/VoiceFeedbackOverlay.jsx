/**
 * VoiceFeedbackOverlay - Componente visual para feedback de voz
 * Muestra indicador de voz activa, correcciones actuales y controles de voz
 */

import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Mic, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { onSpeakingStateChange, stopSpeaking, setVolume, initVoiceService } from '../../services/IA/voiceFeedbackService';

export default function VoiceFeedbackOverlay({
    corrections = [],
    currentInstruction = '',
    isCorrect = false,
    repCount = 0,
    exerciseName = '',
    onVoiceToggle,
    voiceEnabled = true,
}) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [currentMessage, setCurrentMessage] = useState('');
    const [showVolume, setShowVolume] = useState(false);
    const [volume, setVolumeState] = useState(1);

    useEffect(() => {
        initVoiceService();

        onSpeakingStateChange((speaking, message) => {
            setIsSpeaking(speaking);
            setCurrentMessage(message || '');
        });

        return () => {
            stopSpeaking();
        };
    }, []);

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolumeState(newVolume);
        setVolume(newVolume);
    };

    return (
        <>
            {/* Indicador de voz activa - esquina superior izquierda */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                {/* Toggle de voz */}
                <button
                    onClick={() => onVoiceToggle?.(!voiceEnabled)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-sm transition-all duration-300 ${voiceEnabled
                            ? 'bg-green-500/90 text-white'
                            : 'bg-gray-600/90 text-gray-300'
                        }`}
                    title={voiceEnabled ? 'Desactivar voz' : 'Activar voz'}
                >
                    {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    <span className="text-sm font-medium">
                        {voiceEnabled ? 'Voz ON' : 'Voz OFF'}
                    </span>
                </button>

                {/* Indicador de hablando */}
                {isSpeaking && voiceEnabled && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/90 text-white rounded-full backdrop-blur-sm animate-pulse">
                        <Mic className="w-4 h-4" />
                        <span className="text-sm font-medium truncate max-w-[200px]">
                            {currentMessage || 'Hablando...'}
                        </span>
                    </div>
                )}

                {/* Control de volumen */}
                {voiceEnabled && showVolume && (
                    <div className="px-3 py-2 bg-black/80 rounded-lg backdrop-blur-sm">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={volume}
                            onChange={handleVolumeChange}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-white text-xs text-center mt-1">{Math.round(volume * 100)}%</p>
                    </div>
                )}
            </div>

            {/* Panel de instrucción actual - parte superior central */}
            {currentInstruction && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
                    <div className={`px-6 py-3 rounded-xl backdrop-blur-md shadow-lg transition-all duration-300 ${isCorrect
                            ? 'bg-green-500/90 text-white'
                            : 'bg-yellow-500/90 text-black'
                        }`}>
                        <div className="flex items-center gap-3">
                            {isCorrect ? (
                                <CheckCircle className="w-6 h-6 flex-shrink-0" />
                            ) : (
                                <Info className="w-6 h-6 flex-shrink-0" />
                            )}
                            <span className="text-lg font-semibold">{currentInstruction}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Panel de correcciones - lado derecho */}
            {corrections.length > 0 && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 max-w-xs">
                    <div className="bg-red-500/95 backdrop-blur-sm rounded-xl p-4 shadow-xl">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertCircle className="w-5 h-5 text-white" />
                            <span className="text-white font-bold">Corrige tu postura</span>
                        </div>
                        <ul className="space-y-2">
                            {corrections.slice(0, 3).map((correction, index) => (
                                <li
                                    key={index}
                                    className="flex items-start gap-2 text-white text-sm"
                                >
                                    <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 text-xs">
                                        {index + 1}
                                    </span>
                                    <span>{correction.message || correction}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Contador de repeticiones - esquina superior derecha */}
            <div className="absolute top-4 right-4 z-20">
                <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl px-5 py-3 shadow-xl">
                    <p className="text-blue-200 text-xs text-center mb-1">Repeticiones</p>
                    <p className="text-4xl font-bold text-white text-center">{repCount}</p>
                </div>
            </div>

            {/* Indicador de postura correcta - parte inferior */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
                <div className={`flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-md shadow-lg transition-all duration-500 ${isCorrect
                        ? 'bg-green-500/90 text-white scale-100'
                        : 'bg-yellow-500/90 text-black scale-95'
                    }`}>
                    {isCorrect ? (
                        <>
                            <CheckCircle className="w-6 h-6" />
                            <span className="font-bold text-lg">¡Postura Correcta!</span>
                        </>
                    ) : (
                        <>
                            <AlertCircle className="w-6 h-6" />
                            <span className="font-bold text-lg">Ajusta tu Postura</span>
                        </>
                    )}
                </div>
            </div>

            {/* Estilos para animación de ondas de sonido */}
            <style>{`
        @keyframes soundWave {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.5); }
        }
        .sound-wave {
          animation: soundWave 0.3s ease-in-out infinite;
        }
        .sound-wave:nth-child(2) { animation-delay: 0.1s; }
        .sound-wave:nth-child(3) { animation-delay: 0.2s; }
      `}</style>
        </>
    );
}
