/**
 * UniversalExercisePage - Página dinámica que funciona con CUALQUIER ejercicio por ID
 * Soporta los 50 ejercicios del sistema
 * Incluye: detección de pose, voz, demo, instrucciones, contador
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    ArrowLeft, Volume2, VolumeX, Mic, MicOff, Info,
    Play, Pause, RotateCcw, Clock, Target, Dumbbell,
    CheckCircle, AlertCircle, Eye, BookOpen
} from 'lucide-react';
import YogaPoseDetector from '../Yoga/YogaPoseDetector';
import VoiceFeedbackOverlay from '../../components/ui/VoiceFeedbackOverlay';
import { speak, stopSpeaking, initVoiceService, speakNumber } from '../../services/IA/voiceFeedbackService';
import { getExerciseDescription, generateExerciseExplanation } from '../../services/IA/exerciseDescriptions';
import { getEjercicioById } from '../../services/IA/ejerciciosDataset';
import {
    initVoiceRecognition,
    startListening,
    stopListening,
    onVoiceCommand,
    isVoiceRecognitionSupported
} from '../../services/IA/voiceCommandService';
import { calculateBodyAngles } from '../../utils/poseUtils';

export default function UniversalExercisePage() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const exerciseId = parseInt(id);

    // Datos del ejercicio
    const [exerciseData, setExerciseData] = useState(null);
    const [exerciseDesc, setExerciseDesc] = useState(null);

    // Estados de control
    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [micEnabled, setMicEnabled] = useState(false);
    const [showDemo, setShowDemo] = useState(false);
    const [showInstructions, setShowInstructions] = useState(true);

    // Contadores
    const [repCount, setRepCount] = useState(0);
    const [setCount, setSetCount] = useState(1);
    const [timer, setTimer] = useState(0);
    const [restTimer, setRestTimer] = useState(0);
    const [isResting, setIsResting] = useState(false);

    // Pose detection
    const [isCorrect, setIsCorrect] = useState(false);
    const [corrections, setCorrections] = useState([]);
    const [currentInstruction, setCurrentInstruction] = useState('');

    // Refs
    const timerRef = useRef(null);
    const restTimerRef = useRef(null);
    const lastRepTimeRef = useRef(0);
    const repStateRef = useRef('idle');
    const lastCorrectionTimeRef = useRef(0);
    const explanationDoneRef = useRef(false);

    // Cargar datos del ejercicio
    useEffect(() => {
        const data = getEjercicioById(exerciseId);
        const desc = getExerciseDescription(exerciseId);

        if (data) {
            setExerciseData(data);
            setExerciseDesc(desc);
            setCurrentInstruction(desc.proposito);
        } else {
            // Si no existe, redirigir
            navigate(-1);
        }
    }, [exerciseId, navigate]);

    // Inicializar servicios de voz
    useEffect(() => {
        initVoiceService();
        if (isVoiceRecognitionSupported()) {
            initVoiceRecognition();
        }

        return () => {
            stopSpeaking();
            clearInterval(timerRef.current);
            clearInterval(restTimerRef.current);
        };
    }, []);

    // Manejar comandos de voz
    useEffect(() => {
        onVoiceCommand((command) => {
            handleVoiceCommand(command);
        });
    }, []);

    // Timer principal
    useEffect(() => {
        if (isActive && !isPaused && !isResting) {
            timerRef.current = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [isActive, isPaused, isResting]);

    // Timer de descanso
    useEffect(() => {
        if (isResting && restTimer > 0) {
            restTimerRef.current = setInterval(() => {
                setRestTimer(prev => {
                    if (prev <= 1) {
                        handleRestComplete();
                        return 0;
                    }
                    if (prev <= 5 && voiceEnabled) {
                        speakNumber(prev - 1);
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(restTimerRef.current);
    }, [isResting, restTimer, voiceEnabled]);

    // Formatear tiempo
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Iniciar ejercicio
    const handleStart = useCallback(() => {
        setIsActive(true);
        setShowInstructions(false);
        explanationDoneRef.current = false;
        repStateRef.current = 'idle';

        if (voiceEnabled && exerciseDesc) {
            const explanation = generateExerciseExplanation(exerciseId, 'full');
            speak(`${explanation}`, 'info', true);

            // Dar tiempo para que termine la explicación antes de empezar a contar
            setTimeout(() => {
                explanationDoneRef.current = true;
                speak('¡Ahora es tu turno! Cuando estés listo, comienza el ejercicio.', 'encouragement', true);
            }, 10000);
        } else {
            explanationDoneRef.current = true;
        }
    }, [voiceEnabled, exerciseDesc, exerciseId]);

    // Pausar/Reanudar
    const handleTogglePause = () => {
        setIsPaused(!isPaused);
        if (voiceEnabled) {
            speak(isPaused ? '¡Continuamos!' : 'Pausado', 'info');
        }
    };

    // Reiniciar
    const handleReset = () => {
        setIsActive(false);
        setIsPaused(false);
        setRepCount(0);
        setSetCount(1);
        setTimer(0);
        setRestTimer(0);
        setIsResting(false);
        setShowInstructions(true);
    };

    // Completar serie
    const handleSetComplete = useCallback(() => {
        if (voiceEnabled) {
            speak(`¡Excelente! Serie ${setCount} completada`, 'encouragement');
        }

        const targetSets = exerciseDesc?.series || 3;

        if (setCount < targetSets) {
            // Iniciar descanso
            const restTime = exerciseDesc?.descanso || 60;
            setIsResting(true);
            setRestTimer(restTime);

            if (voiceEnabled) {
                speak(`Descansa ${restTime} segundos`, 'info');
            }
        } else {
            // Todas las series completadas
            if (voiceEnabled) {
                speak('¡Felicitaciones! Has completado todas las series. ¡Excelente trabajo!', 'encouragement', true);
            }
            setIsActive(false);
        }
    }, [setCount, exerciseDesc, voiceEnabled]);

    // Completar descanso
    const handleRestComplete = useCallback(() => {
        setIsResting(false);
        setRepCount(0);
        setSetCount(prev => prev + 1);

        if (voiceEnabled) {
            speak(`Serie ${setCount + 1}. ¡Vamos!`, 'encouragement');
        }
    }, [setCount, voiceEnabled]);

    // Manejar repetición completada
    const handleRepComplete = useCallback(() => {
        const newCount = repCount + 1;
        setRepCount(newCount);

        if (voiceEnabled) {
            speakNumber(newCount);
        }

        const targetReps = exerciseDesc?.reps || 12;

        // Verificar si es ejercicio de tiempo
        if (exerciseDesc?.esTiempo) {
            // Para ejercicios de tiempo, una "rep" es mantener el tiempo
            if (newCount >= (exerciseDesc?.reps || 10)) {
                setRepCount(0);
                handleSetComplete();
            }
        } else {
            // Para ejercicios normales
            if (newCount >= targetReps) {
                setRepCount(0);
                handleSetComplete();
            }
        }
    }, [repCount, exerciseDesc, voiceEnabled, handleSetComplete]);

    // Manejar comandos de voz
    const handleVoiceCommand = useCallback((command) => {
        switch (command) {
            case 'SHOW_EXERCISE':
                setShowDemo(true);
                if (voiceEnabled) speak('Aquí tienes la demostración', 'info');
                setTimeout(() => setShowDemo(false), 5000);
                break;

            case 'EXPLAIN_EXERCISE':
                if (exerciseDesc && voiceEnabled) {
                    const explanation = generateExerciseExplanation(exerciseId, 'full');
                    speak(explanation, 'info', true);
                }
                break;

            case 'TEACH_EXERCISE':
                setShowDemo(true);
                if (exerciseDesc && voiceEnabled) {
                    speak(exerciseDesc.instrucciones, 'info', true);
                }
                setTimeout(() => setShowDemo(false), 8000);
                break;

            case 'PAUSE':
                setIsPaused(true);
                if (voiceEnabled) speak('Pausado', 'info');
                break;

            case 'RESUME':
                setIsPaused(false);
                if (voiceEnabled) speak('¡Continuamos!', 'encouragement');
                break;

            case 'REST':
                if (!isResting) {
                    const restTime = exerciseDesc?.descanso || 60;
                    setIsResting(true);
                    setRestTimer(restTime);
                    if (voiceEnabled) speak(`Descansa ${restTime} segundos`, 'info');
                }
                break;

            case 'HELP':
                if (voiceEnabled) {
                    speak('Puedes decir: muéstrame, explícame, pausa, continúa, o descanso', 'info');
                }
                break;

            case 'REPEAT':
                if (exerciseDesc && voiceEnabled) {
                    speak(exerciseDesc.instrucciones, 'info', true);
                }
                break;
        }
    }, [exerciseDesc, exerciseId, voiceEnabled, isResting]);

    // Toggle micrófono
    const toggleMic = () => {
        if (micEnabled) {
            stopListening();
            setMicEnabled(false);
        } else {
            startListening();
            setMicEnabled(true);
            if (voiceEnabled) speak('Te escucho. Puedes darme comandos.', 'info');
        }
    };

    // Detección de pose con validación de forma
    const handlePoseDetected = useCallback((landmarks) => {
        if (!isActive || isPaused || isResting) return;

        // No contar hasta que termine la explicación
        if (!explanationDoneRef.current) return;

        const angles = calculateBodyAngles(landmarks);
        const now = Date.now();

        // Landmarks principales
        const nose = landmarks[0];
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];

        // Validar que se detecten los puntos clave
        if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
            setIsCorrect(false);
            setCorrections([{ type: 'warning', message: 'Asegúrate de que tu cuerpo sea visible' }]);
            setCurrentInstruction('Posiciónate frente a la cámara');
            return;
        }

        // ===== VALIDACIONES DE FORMA =====
        let formCorrect = true;
        const newCorrections = [];

        // 1. Verificar que la espalda esté recta
        const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
        const hipCenterX = (leftHip.x + rightHip.x) / 2;
        const torsoAlignment = Math.abs(shoulderCenterX - hipCenterX);

        if (torsoAlignment > 0.15) {
            formCorrect = false;
            newCorrections.push({ type: 'error', message: 'Mantén la espalda recta' });
        }

        // 2. Verificar posición de hombros (no encogidos)
        if (nose && leftShoulder && rightShoulder) {
            const midShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
            const neckLength = Math.abs(nose.y - midShoulderY);
            if (neckLength < 0.08) {
                formCorrect = false;
                newCorrections.push({ type: 'error', message: 'Relaja los hombros, no los encojas' });
            }
        }

        // ===== LÓGICA DE CONTEO =====
        if (formCorrect) {
            const hipY = (leftHip.y + rightHip.y) / 2;
            const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
            const verticalRatio = Math.abs(hipY - shoulderY);

            // Detectar ciclo de movimiento
            if (repStateRef.current === 'idle' && verticalRatio < 0.25) {
                repStateRef.current = 'down';
            } else if (repStateRef.current === 'down' && verticalRatio > 0.3) {
                repStateRef.current = 'up';
            } else if (repStateRef.current === 'up' && verticalRatio < 0.25) {
                if (now - lastRepTimeRef.current > 1500) {
                    // ¡Repetición completada correctamente!
                    handleRepComplete();
                    repStateRef.current = 'idle';
                    lastRepTimeRef.current = now;
                }
            }

            setIsCorrect(true);
            setCorrections([]);
            setCurrentInstruction('¡Buena forma! Continúa así');
        } else {
            // Forma incorrecta - dar feedback de voz con cooldown
            if (now - lastCorrectionTimeRef.current > 5000 && voiceEnabled) {
                const correction = newCorrections[0]?.message || 'Corrige tu postura';
                speak(correction, 'correction');
                lastCorrectionTimeRef.current = now;
            }

            setIsCorrect(false);
            setCorrections(newCorrections);
            setCurrentInstruction(newCorrections[0]?.message || 'Corrige tu postura');
        }
    }, [isActive, isPaused, isResting, handleRepComplete, voiceEnabled]);

    // Pantalla de carga
    if (!exerciseData || !exerciseDesc) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-purple-900 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Header */}
            <div className="bg-black/40 backdrop-blur-md border-b border-white/10 px-4 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-white hover:text-blue-400"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Volver
                    </button>

                    <h1 className="text-white font-bold text-lg truncate max-w-md">
                        {exerciseData.nombre}
                    </h1>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setVoiceEnabled(!voiceEnabled)}
                            className={`p-2 rounded-lg transition-colors ${voiceEnabled ? 'bg-green-600' : 'bg-gray-600'}`}
                            title={voiceEnabled ? 'Desactivar voz' : 'Activar voz'}
                        >
                            {voiceEnabled ? <Volume2 className="w-5 h-5 text-white" /> : <VolumeX className="w-5 h-5 text-white" />}
                        </button>

                        {isVoiceRecognitionSupported() && (
                            <button
                                onClick={toggleMic}
                                className={`p-2 rounded-lg transition-colors ${micEnabled ? 'bg-blue-600 animate-pulse' : 'bg-gray-600'}`}
                                title={micEnabled ? 'Desactivar micrófono' : 'Activar micrófono'}
                            >
                                {micEnabled ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-4">
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Columna principal */}
                    <div className="lg:col-span-2 space-y-4">

                        {/* Panel de descanso */}
                        {isResting && (
                            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-6 text-center">
                                <p className="text-blue-200 text-lg mb-2">⏱️ Tiempo de descanso</p>
                                <p className="text-6xl font-bold text-white">{restTimer}s</p>
                                <p className="text-blue-200 mt-2">Serie {setCount} de {exerciseDesc.series}</p>
                                <button
                                    onClick={handleRestComplete}
                                    className="mt-4 bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50"
                                >
                                    Saltar descanso
                                </button>
                            </div>
                        )}

                        {/* Instrucciones iniciales */}
                        {showInstructions && !isActive && (
                            <div className="bg-slate-800 rounded-xl overflow-hidden">
                                {/* Demo del ejercicio */}
                                <div className="relative">
                                    <img
                                        src={exerciseData.url}
                                        alt={exerciseData.nombre}
                                        className="w-full h-64 object-contain bg-gray-900"
                                    />
                                    <div className="absolute bottom-4 right-4 bg-black/60 px-3 py-1 rounded-full text-white text-sm">
                                        Demostración
                                    </div>
                                </div>

                                <div className="p-6">
                                    <h2 className="text-2xl font-bold text-white mb-3">{exerciseData.nombre}</h2>
                                    <p className="text-gray-300 mb-4">{exerciseDesc.proposito}</p>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center gap-3 text-gray-300">
                                            <Target className="w-5 h-5 text-purple-400" />
                                            <span><strong>Músculos:</strong> {exerciseDesc.musculos.join(', ')}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-300">
                                            <Dumbbell className="w-5 h-5 text-blue-400" />
                                            <span><strong>Meta:</strong> {exerciseDesc.reps} {exerciseDesc.esTiempo ? 'segundos' : 'repeticiones'} × {exerciseDesc.series} series</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-300">
                                            <Clock className="w-5 h-5 text-green-400" />
                                            <span><strong>Descanso:</strong> {exerciseDesc.descanso} segundos entre series</span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-700 rounded-lg p-4 mb-6">
                                        <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                                            <BookOpen className="w-4 h-4" />
                                            Cómo hacerlo
                                        </h3>
                                        <p className="text-gray-300">{exerciseDesc.instrucciones}</p>
                                    </div>

                                    <button
                                        onClick={handleStart}
                                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Play className="w-6 h-6" />
                                        ¡Comenzar Ejercicio!
                                    </button>

                                    {voiceEnabled && (
                                        <button
                                            onClick={() => {
                                                const explanation = generateExerciseExplanation(exerciseId, 'full');
                                                speak(explanation, 'info', true);
                                            }}
                                            className="w-full mt-3 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                                        >
                                            <Volume2 className="w-5 h-5" />
                                            Escuchar explicación
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Cámara con detector */}
                        {isActive && !isResting && (
                            <div className="relative bg-slate-800 rounded-xl overflow-hidden">
                                <YogaPoseDetector
                                    onPoseDetected={handlePoseDetected}
                                    highlightedAngles={[]}
                                />

                                <VoiceFeedbackOverlay
                                    corrections={corrections}
                                    currentInstruction={currentInstruction}
                                    isCorrect={isCorrect}
                                    repCount={repCount}
                                    exerciseName={exerciseData.nombre}
                                    voiceEnabled={voiceEnabled}
                                    onVoiceToggle={setVoiceEnabled}
                                />

                                {/* Mini demo */}
                                {exerciseData.url && (
                                    <div
                                        className="absolute top-20 right-4 w-32 h-24 rounded-lg overflow-hidden border-2 border-white/30 shadow-lg cursor-pointer z-30 hover:scale-105 transition-transform"
                                        onClick={() => setShowDemo(!showDemo)}
                                        title="Click para ver demostración"
                                    >
                                        <img
                                            src={exerciseData.url}
                                            alt={exerciseData.nombre}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center">
                                            <Eye className="w-3 h-3 inline mr-1" />
                                            Referencia
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Demo grande */}
                        {showDemo && (
                            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowDemo(false)}>
                                <div className="bg-slate-800 rounded-xl p-4 max-w-2xl">
                                    <img
                                        src={exerciseData.url}
                                        alt={exerciseData.nombre}
                                        className="w-full h-auto max-h-96 object-contain rounded-lg"
                                    />
                                    <p className="text-white text-center mt-4">{exerciseData.nombre}</p>
                                    <p className="text-gray-400 text-center text-sm mt-2">Toca para cerrar</p>
                                </div>
                            </div>
                        )}

                        {/* Controles durante ejercicio */}
                        {isActive && (
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    onClick={() => setShowDemo(true)}
                                    className="p-3 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors"
                                    title="Ver demostración"
                                >
                                    <Eye className="w-6 h-6 text-white" />
                                </button>

                                <button
                                    onClick={handleTogglePause}
                                    className={`p-4 rounded-full transition-colors ${isPaused ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}
                                >
                                    {isPaused ? <Play className="w-8 h-8 text-white" /> : <Pause className="w-8 h-8 text-white" />}
                                </button>

                                <button
                                    onClick={handleReset}
                                    className="p-3 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors"
                                    title="Reiniciar"
                                >
                                    <RotateCcw className="w-6 h-6 text-white" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Panel lateral */}
                    <div className="space-y-4">
                        {/* Timer */}
                        <div className="bg-slate-800/80 backdrop-blur rounded-xl p-6 text-center">
                            <p className="text-gray-400 text-sm mb-2">Tiempo</p>
                            <p className="text-4xl font-mono font-bold text-white">{formatTime(timer)}</p>
                        </div>

                        {/* Contadores */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-4 text-center">
                                <p className="text-blue-200 text-sm">Repeticiones</p>
                                <p className="text-4xl font-bold text-white">{repCount}</p>
                                <p className="text-blue-200 text-xs">de {exerciseDesc.reps}</p>
                            </div>

                            <div className="bg-gradient-to-br from-green-600 to-teal-600 rounded-xl p-4 text-center">
                                <p className="text-green-200 text-sm">Serie</p>
                                <p className="text-4xl font-bold text-white">{setCount}</p>
                                <p className="text-green-200 text-xs">de {exerciseDesc.series}</p>
                            </div>
                        </div>

                        {/* Info del ejercicio */}
                        <div className="bg-slate-800/80 backdrop-blur rounded-xl p-4">
                            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                <Info className="w-4 h-4 text-blue-400" />
                                {exerciseData.nombre}
                            </h3>

                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-gray-300">
                                    <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-xs">{exerciseData.tipo}</span>
                                    <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs">{exerciseData.musculo}</span>
                                </div>
                                <p className="text-gray-400">{exerciseDesc.proposito}</p>
                            </div>
                        </div>

                        {/* Errores comunes */}
                        <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4">
                            <h3 className="text-red-300 font-semibold mb-2 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Evita estos errores
                            </h3>
                            <ul className="text-red-200 text-sm space-y-1">
                                {exerciseDesc.erroresComunes.map((error, i) => (
                                    <li key={i}>• {error}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Botones de acción */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setShowDemo(true)}
                                className="bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                            >
                                <Eye className="w-4 h-4" />
                                Ver demo
                            </button>
                            <button
                                onClick={() => {
                                    if (voiceEnabled) speak(exerciseDesc.instrucciones, 'info', true);
                                }}
                                className="bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                            >
                                <Volume2 className="w-4 h-4" />
                                Explicar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Paused overlay */}
            {isPaused && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="text-center">
                        <Pause className="w-20 h-20 text-white mx-auto mb-4" />
                        <h2 className="text-3xl font-bold text-white mb-4">Ejercicio Pausado</h2>
                        <p className="text-gray-400 mb-6">Toma un respiro cuando lo necesites</p>
                        <button
                            onClick={handleTogglePause}
                            className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg"
                        >
                            Continuar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
