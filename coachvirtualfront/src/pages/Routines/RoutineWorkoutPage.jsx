/**
 * RoutineWorkoutPage - Página de entrenamiento de rutina interactiva
 * - Progresión automática entre ejercicios
 * - Explicación de cada ejercicio con voz
 * - Comandos de voz para control
 * - Contador de repeticiones y descansos
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    ArrowLeft, Play, Pause, SkipForward, SkipBack,
    Volume2, VolumeX, Mic, MicOff, Info, CheckCircle,
    Clock, Dumbbell, Target, AlertCircle, ArrowUp, ArrowDown,
    Lock, MoveRight, Square, RefreshCw, Trophy, ClipboardList
} from 'lucide-react';
import YogaPoseDetector from '../Yoga/YogaPoseDetector';
import VoiceFeedbackOverlay from '../../components/ui/VoiceFeedbackOverlay';
import { speak, stopSpeaking, initVoiceService, speakNumber, isSpeakingNow } from '../../services/IA/voiceFeedbackService';
import { getExerciseDescription, generateExerciseExplanation } from '../../services/IA/exerciseDescriptions';
import { getEjercicioById } from '../../services/IA/ejerciciosDataset';
import { createRepCounter } from '../../services/IA/exerciseRepCounter';
import {
    initVoiceRecognition,
    startListening,
    stopListening,
    onVoiceCommand,
    isVoiceRecognitionSupported
} from '../../services/IA/voiceCommandService';
import { calculateBodyAngles } from '../../utils/poseUtils';

// Estados del workout
const WORKOUT_STATES = {
    INTRO: 'intro',        // Explicando ejercicio
    ACTIVE: 'active',      // Haciendo ejercicio
    REST: 'rest',          // Descansando
    COMPLETED: 'completed', // Rutina completada
};

export default function RoutineWorkoutPage() {
    const { rutinaId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    // Datos de la rutina (pasados por state o cargados)
    const [routineData, setRoutineData] = useState(null);
    const [exercises, setExercises] = useState([]);
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

    // Estado del workout
    const [workoutState, setWorkoutState] = useState(WORKOUT_STATES.INTRO);
    const [isPaused, setIsPaused] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [micEnabled, setMicEnabled] = useState(false);

    // Contadores
    const [repCount, setRepCount] = useState(0);
    const [setCount, setSetCount] = useState(1);
    const [restTimer, setRestTimer] = useState(0);
    const [exerciseTimer, setExerciseTimer] = useState(0);
    const [holdTime, setHoldTime] = useState(0); // Para ejercicios isométricos/estiramientos

    // Pose detection
    const [isCorrect, setIsCorrect] = useState(false);
    const [corrections, setCorrections] = useState([]);
    const [showDemo, setShowDemo] = useState(false);
    const [showVoiceCommandsModal, setShowVoiceCommandsModal] = useState(false); // Modal de comandos de voz


    // Refs
    const restIntervalRef = useRef(null);
    const timerIntervalRef = useRef(null);
    const lastRepTimeRef = useRef(0);
    const repPhaseRef = useRef('ready'); // 'ready', 'down', 'up'
    const lastCorrectionTimeRef = useRef(0);
    const explanationDoneRef = useRef(false);
    const repCounterRef = useRef(null); // Exercise-specific rep counter
    const sessionCorrectionsRef = useRef([]); // Correcciones hechas durante el ejercicio
    const lastMovementTimeRef = useRef(Date.now()); // Para detectar inactividad
    const lastPoseRef = useRef(null); // Última pose para comparar movimiento

    // Cargar datos de rutina
    useEffect(() => {
        const stateData = location.state?.routine;
        if (stateData) {
            setRoutineData(stateData);
            // Verificar que ejercicios sea un array antes de mapear
            const ejerciciosArray = Array.isArray(stateData.ejercicios) ? stateData.ejercicios : [];
            // Mapear ejercicios de la rutina con índice único
            const exerciseList = ejerciciosArray.map((e, index) => ({
                ...getEjercicioById(e.ejercicio_id || e.id),
                ...getExerciseDescription(e.ejercicio_id || e.id),
                targetReps: e.repeticiones || 12,
                targetSets: e.series || 3,
                targetTime: e.tiempo || 30, // Tiempo objetivo para estiramientos (segundos)
                uniqueKey: `exercise-${index}-${e.ejercicio_id || e.id || Date.now()}`,
            }));
            setExercises(exerciseList);
        }
    }, [location.state]);

    // Inicializar servicios de voz
    useEffect(() => {
        initVoiceService();
        if (isVoiceRecognitionSupported()) {
            initVoiceRecognition();
        }

        // Cleanup: detener voz al salir de la página
        return () => {
            stopSpeaking();
            stopListening();
        };
    }, []);

    // Manejar comandos de voz
    useEffect(() => {
        onVoiceCommand((command, transcript) => {
            console.log('Voice command:', command, transcript);
            handleVoiceCommand(command);
        });
    }, [currentExerciseIndex]);

    // Timer de ejercicio (para ejercicios de tiempo)
    useEffect(() => {
        if (workoutState === WORKOUT_STATES.ACTIVE && !isPaused) {
            const currentExercise = exercises[currentExerciseIndex];
            if (currentExercise?.esTiempo) {
                timerIntervalRef.current = setInterval(() => {
                    setExerciseTimer(prev => {
                        if (prev >= currentExercise.tiempoMantenimiento || prev >= 30) {
                            handleSetComplete();
                            return 0;
                        }
                        return prev + 1;
                    });
                }, 1000);
            }
        }
        return () => clearInterval(timerIntervalRef.current);
    }, [workoutState, isPaused, currentExerciseIndex]);

    // Obtener ejercicio actual - DEFINIR ANTES de usarlo en useEffects
    const currentExercise = exercises[currentExerciseIndex] || null;

    // Timer de descanso - cuenta regresiva con visualización y voz sincronizada
    useEffect(() => {
        // Solo iniciar cuando entramos al estado REST
        if (workoutState === WORKOUT_STATES.REST) {
            // Limpiar intervalo anterior
            if (restIntervalRef.current) {
                clearInterval(restIntervalRef.current);
            }

            const descansoTime = currentExercise?.descanso || 60;
            let currentTime = restTimer; // Usar el tiempo actual

            restIntervalRef.current = setInterval(() => {
                currentTime = currentTime - 1;

                // Countdown voz en los últimos 5 segundos - SINCRONIZADO
                if (currentTime <= 5 && currentTime > 0 && voiceEnabled) {
                    speakNumber(currentTime);
                }

                // Actualizar el estado visual
                setRestTimer(currentTime);

                if (currentTime <= 0) {
                    clearInterval(restIntervalRef.current);
                    // Pequeño delay antes de continuar para que se vea el 0
                    setTimeout(() => handleRestComplete(), 500);
                    return;
                }

                // Anuncio de mitad de descanso
                if (currentTime === Math.floor(descansoTime / 2) && voiceEnabled) {
                    speak('Mitad del descanso', 'info');
                }

                // Aviso de 10 segundos
                if (currentTime === 10 && voiceEnabled) {
                    speak('¡10 SEGUNDOS! ¡PREPÁRATE!', 'info');
                }
            }, 1000);
        } else {
            // Limpiar cuando no estamos en REST
            if (restIntervalRef.current) {
                clearInterval(restIntervalRef.current);
            }
        }

        return () => {
            if (restIntervalRef.current) {
                clearInterval(restIntervalRef.current);
            }
        };
    }, [workoutState, voiceEnabled, currentExercise]);

    // Explicar ejercicio cuando cambia
    useEffect(() => {
        if (exercises.length > 0 && workoutState === WORKOUT_STATES.INTRO) {
            explainCurrentExercise();
        }
    }, [currentExerciseIndex, exercises, workoutState]);

    // Crear contador de repeticiones específico para el ejercicio actual
    useEffect(() => {
        if (currentExercise) {
            const exerciseId = currentExercise.ejercicio_id || currentExercise.id;
            repCounterRef.current = createRepCounter(exerciseId);
            repCounterRef.current.reset();
        }
    }, [currentExercise]);

    // Explicar ejercicio actual con espera completa
    const explainCurrentExercise = useCallback(() => {
        if (!currentExercise) return;

        setShowDemo(true);
        explanationDoneRef.current = false;
        repPhaseRef.current = 'ready';

        if (voiceEnabled) {
            const explanation = generateExerciseExplanation(currentExercise.id, 'full');
            speak(explanation, 'info', true);
        }

        // Esperar a que termine la explicación (calcular tiempo aproximado basado en longitud)
        const explanation = generateExerciseExplanation(currentExercise.id, 'full');
        const palabras = explanation.split(' ').length;
        const tiempoEstimado = Math.max(8000, palabras * 400); // ~150 palabras/min = 400ms/palabra

        setTimeout(() => {
            setShowDemo(false);
            explanationDoneRef.current = true;
            setWorkoutState(WORKOUT_STATES.ACTIVE);
            if (voiceEnabled) {
                speak('¡Ahora es tu turno! Cuando estés listo, comienza el ejercicio.', 'encouragement', true);
            }
        }, tiempoEstimado);
    }, [currentExercise, voiceEnabled]);

    // Omitir explicación y comenzar ejercicio inmediatamente
    const skipExplanation = useCallback(() => {
        stopSpeaking(); // Detener la voz
        setShowDemo(false);
        explanationDoneRef.current = true;
        setWorkoutState(WORKOUT_STATES.ACTIVE);
        if (voiceEnabled) {
            speak('¡VAMOS! ¡A ENTRENAR!', 'encouragement', true);
        }
    }, [voiceEnabled]);

    // Manejar comando de voz
    const handleVoiceCommand = useCallback((command) => {
        switch (command) {
            case 'SHOW_EXERCISE':
                setShowDemo(true);
                if (voiceEnabled) speak('Aquí tienes el ejercicio', 'info');
                setTimeout(() => setShowDemo(false), 5000);
                break;

            case 'EXPLAIN_EXERCISE':
                if (currentExercise && voiceEnabled) {
                    const explanation = generateExerciseExplanation(currentExercise.id, 'full');
                    speak(explanation, 'info', true);
                }
                break;

            case 'TEACH_EXERCISE':
                if (currentExercise && voiceEnabled) {
                    const instructions = generateExerciseExplanation(currentExercise.id, 'instructions');
                    speak(instructions, 'info', true);
                }
                setShowDemo(true);
                setTimeout(() => setShowDemo(false), 6000);
                break;

            case 'NEXT_EXERCISE':
                goToNextExercise();
                break;

            case 'PREV_EXERCISE':
                goToPrevExercise();
                break;

            case 'PAUSE':
                setIsPaused(true);
                if (voiceEnabled) speak('Entrenamiento pausado', 'info');
                break;

            case 'RESUME':
                setIsPaused(false);
                if (voiceEnabled) speak('¡Continuamos!', 'encouragement');
                break;

            case 'REST':
                startRest();
                break;

            case 'HELP':
                if (voiceEnabled) {
                    speak('Puedes decir: muéstrame el ejercicio, explícame, siguiente, pausa, continúa, o descanso', 'info');
                }
                break;

            case 'REPEAT':
                explainCurrentExercise();
                break;
        }
    }, [currentExercise, voiceEnabled]);

    // Completar una serie
    const handleSetComplete = useCallback(() => {
        if (voiceEnabled) {
            speak('¡Excelente! Serie completada', 'encouragement');
        }

        if (setCount < (currentExercise?.targetSets || 3)) {
            setSetCount(prev => prev + 1);
            startRest();
        } else {
            // Todas las series completadas
            goToNextExercise();
        }
    }, [setCount, currentExercise, voiceEnabled]);

    // Completar una repetición - con feedback de voz SINCRONIZADO
    const handleRepComplete = useCallback(() => {
        const newCount = repCount + 1;

        // PRIMERO actualizar el contador visual
        setRepCount(newCount);

        const targetReps = currentExercise?.targetReps || 12;
        const targetSets = currentExercise?.targetSets || 3;

        if (voiceEnabled) {
            // DELAY para sincronizar con la UI - la voz viene DESPUÉS del número visual
            setTimeout(() => {
                // Decir el número de la rep
                speakNumber(newCount);
            }, 250); // 250ms para que la UI se actualice primero

            // Mensajes motivacionales con delay mayor para no interrumpir el conteo
            setTimeout(() => {
                const remaining = targetReps - newCount;

                // Mitad de las reps
                if (newCount === Math.floor(targetReps / 2)) {
                    speak('¡Vas a la mitad! ¡Sigue así!', 'encouragement');
                }
                // Faltan 3 reps
                else if (remaining === 3) {
                    speak('¡Tres más!', 'encouragement');
                }
                // Faltan 2 reps
                else if (remaining === 2) {
                    speak('¡Dos más!', 'encouragement');
                }
                // Última rep
                else if (remaining === 1) {
                    speak('¡Última!', 'encouragement');
                }
                // Rep completada con buena forma (cada 4 reps, pero no al final)
                else if (newCount % 4 === 0 && remaining > 3) {
                    const messages = [
                        '¡Excelente forma!',
                        '¡Muy bien!',
                        '¡Eso es!',
                        '¡Perfecto!',
                    ];
                    speak(messages[Math.floor(Math.random() * messages.length)], 'encouragement');
                }
            }, 800); // 800ms para dar tiempo al número de decirse
        }

        // Verificar si completó las reps de la serie
        if (newCount >= targetReps) {
            setRepCount(0);

            // Celebrar la serie completada
            if (voiceEnabled) {
                if (setCount >= targetSets) {
                    // Última serie del ejercicio
                    speak('¡Increíble! ¡Ejercicio completado! ¡Eres una máquina!', 'encouragement');
                } else {
                    // Serie completada, hay más series
                    speak(`¡Serie ${setCount} completada! ¡Buen trabajo!`, 'encouragement');
                }
            }

            handleSetComplete();
        }
    }, [repCount, currentExercise, voiceEnabled, setCount]);

    // Iniciar descanso - con resumen de correcciones
    const startRest = useCallback(() => {
        setWorkoutState(WORKOUT_STATES.REST);
        const restTime = currentExercise?.descanso || 60;
        setRestTimer(restTime);

        if (voiceEnabled) {
            speak(`¡BUEN TRABAJO! Descansa ${restTime} segundos`, 'info');

            // Dar resumen de correcciones al iniciar descanso
            const uniqueCorrections = [...new Set(sessionCorrectionsRef.current)];
            if (uniqueCorrections.length > 0) {
                setTimeout(() => {
                    speak(`Recuerda para la próxima serie: ${uniqueCorrections.slice(0, 2).join('. ')}`, 'info');
                }, 3000);
            } else {
                setTimeout(() => {
                    speak('¡EXCELENTE TÉCNICA! Mantuviste buena forma', 'encouragement');
                }, 3000);
            }
            // Limpiar correcciones para siguiente serie
            sessionCorrectionsRef.current = [];
        }
    }, [currentExercise, voiceEnabled]);

    // Completar descanso
    const handleRestComplete = useCallback(() => {
        setWorkoutState(WORKOUT_STATES.ACTIVE);
        setRepCount(0);

        if (voiceEnabled) {
            speak('¡Descansó terminado! Continúa con la siguiente serie', 'encouragement');
        }
    }, [voiceEnabled]);

    // Ir al siguiente ejercicio - SOLO si completó todas las series
    const goToNextExercise = useCallback(() => {
        // Verificar si completó todas las series (excepto si es skip manual)
        const targetSets = currentExercise?.targetSets || 3;

        if (currentExerciseIndex < exercises.length - 1) {
            setCurrentExerciseIndex(prev => prev + 1);
            setRepCount(0);
            setSetCount(1);
            setExerciseTimer(0);
            setWorkoutState(WORKOUT_STATES.INTRO);
            repCounterRef.current?.reset();

            if (voiceEnabled) {
                speak('Pasamos al siguiente ejercicio', 'info');
            }
        } else {
            // Rutina completada - FELICITAR Y ANIMAR
            setWorkoutState(WORKOUT_STATES.COMPLETED);
            if (voiceEnabled) {
                speak('¡INCREÍBLE! ¡HAS COMPLETADO TODA LA RUTINA!', 'encouragement', true);
                setTimeout(() => {
                    speak('¡ERES UNA MÁQUINA! Descansa bien. ¡Nos vemos en la próxima sesión! ¡SIGUE ASÍ!', 'encouragement', true);
                }, 4000);
            }
        }
    }, [currentExerciseIndex, exercises.length, voiceEnabled, currentExercise]);

    // Ir al ejercicio anterior
    const goToPrevExercise = useCallback(() => {
        if (currentExerciseIndex > 0) {
            setCurrentExerciseIndex(prev => prev - 1);
            setRepCount(0);
            setSetCount(1);
            setExerciseTimer(0);
            setWorkoutState(WORKOUT_STATES.INTRO);
            repCounterRef.current?.reset();
        }
    }, [currentExerciseIndex]);

    // Toggle micrófono
    const toggleMic = () => {
        if (micEnabled) {
            stopListening();
            setMicEnabled(false);
        } else {
            startListening();
            setMicEnabled(true);
            if (voiceEnabled) {
                setShowVoiceCommandsModal(true);
                speak('Micrófono activado. Puedo escucharte.', 'info');
            }
        }
    };

    // Detección de pose con conteo específico por ejercicio y corrección de voz
    const handlePoseDetected = useCallback((landmarks) => {
        if (!currentExercise || workoutState !== WORKOUT_STATES.ACTIVE || isPaused) return;

        // No contar hasta que termine la explicación
        if (!explanationDoneRef.current) return;

        // Verificar que el contador esté inicializado
        if (!repCounterRef.current) return;

        const now = Date.now();

        // Validar que se detecten los puntos clave
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        const leftAnkle = landmarks[27];
        const rightAnkle = landmarks[28];
        const nose = landmarks[0];

        if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
            setIsCorrect(false);
            setCorrections([{ type: 'warning', message: '¡MUÉSTRAME TODO TU CUERPO!' }]);
            if (now - lastCorrectionTimeRef.current > 4000 && voiceEnabled && !isSpeakingNow()) {
                speak('¡MUÉSTRAME TODO TU CUERPO! ¡RETROCEDE!', 'correction', true);
                lastCorrectionTimeRef.current = now;
            }
            return;
        }

        // ===== DETECCIÓN DE DISTANCIA DE CÁMARA =====
        const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
        const bodyHeight = nose && leftAnkle ? Math.abs(leftAnkle.y - nose.y) : 0.5;

        // Demasiado cerca (cuerpo ocupa más del 70% del ancho)
        if (shoulderWidth > 0.5) {
            setIsCorrect(false);
            setCorrections([{ type: 'warning', message: '¡ALÉJATE DE LA CÁMARA!' }]);
            if (now - lastCorrectionTimeRef.current > 4000 && voiceEnabled && !isSpeakingNow()) {
                speak('¡ALÉJATE DE LA CÁMARA! ¡NECESITO VER TODO TU CUERPO!', 'correction', true);
                lastCorrectionTimeRef.current = now;
            }
            return;
        }

        // Demasiado lejos (cuerpo ocupa menos del 15% del ancho)
        if (shoulderWidth < 0.08) {
            setIsCorrect(false);
            setCorrections([{ type: 'warning', message: '¡ACÉRCATE A LA CÁMARA!' }]);
            if (now - lastCorrectionTimeRef.current > 4000 && voiceEnabled && !isSpeakingNow()) {
                speak('¡ACÉRCATE A LA CÁMARA! ¡NO TE VEO BIEN!', 'correction', true);
                lastCorrectionTimeRef.current = now;
            }
            return;
        }

        // Pies no visibles (importante para ejercicios de cuerpo completo)
        if ((!leftAnkle || !rightAnkle) && currentExercise?.tipo !== 'Brazos') {
            setIsCorrect(false);
            setCorrections([{ type: 'warning', message: '¡MUESTRA TUS PIES!' }]);
            if (now - lastCorrectionTimeRef.current > 5000 && voiceEnabled && !isSpeakingNow()) {
                speak('¡MUESTRA TUS PIES! ¡NECESITO VER TUS PIERNAS!', 'correction', true);
                lastCorrectionTimeRef.current = now;
            }
            return;
        }

        // Procesar frame con el contador específico del ejercicio
        const result = repCounterRef.current.processFrame(landmarks);

        // Actualizar estado de corrección
        setIsCorrect(result.isCorrect);

        if (result.errors && result.errors.length > 0) {
            setCorrections(result.errors);

            // Guardar correcciones para resumen durante descanso
            const correctionMsg = result.errors[0]?.message || result.errors[0];
            if (correctionMsg && !sessionCorrectionsRef.current.includes(correctionMsg)) {
                sessionCorrectionsRef.current.push(correctionMsg);
            }

            // Dar feedback de voz de corrección - SIEMPRE decir la corrección si pasó cooldown
            // Solo hablar si NO estamos ya hablando (evitar cruces de voz)
            if (now - lastCorrectionTimeRef.current > 3000 && voiceEnabled && !isSpeakingNow()) {
                // Decir la corrección en voz alta - ESTRICTO
                speak(correctionMsg, 'correction', true);
                lastCorrectionTimeRef.current = now;
            }
        } else if (result.isCorrect) {
            // Mostrar fase actual del movimiento
            const phaseMessages = {
                up: 'Subiendo',
                down: 'Bajando',
                hold: 'Mantén',
                contracted: 'Contrae',
                extended: 'Extiende',
                neutral: 'Posición inicial',
                rotated: 'Rota',
            };
            const phaseMessage = phaseMessages[result.phase] || '¡Buena forma!';
            setCorrections([{ type: 'success', message: phaseMessage }]);

            // Dar ánimo SOLO si la voz NO está ocupada y pasaron 8 segundos
            if (now - lastCorrectionTimeRef.current > 8000 && voiceEnabled && !isSpeakingNow()) {
                const encouragements = [
                    '¡BIEN! ¡SIGUE ASÍ!',
                    '¡EXCELENTE TÉCNICA!',
                    '¡ESO ES! ¡VAMOS!',
                    '¡MUY BIEN! ¡NO PARES!',
                    '¡PERFECTO!',
                    '¡ASÍ SE HACE!',
                ];
                const randomMessage = encouragements[Math.floor(Math.random() * encouragements.length)];
                speak(randomMessage, 'encouragement');
                lastCorrectionTimeRef.current = now;
            }
        }

        // Si se contó una repetición - SOLO si la forma es correcta
        // DEBOUNCE de 1.5 segundos para evitar conteo rápido
        if (result.counted && result.isCorrect) {
            if (now - lastRepTimeRef.current > 3000) {
                lastRepTimeRef.current = now;
                handleRepComplete();
            }
        }

        // Para ejercicios ISOMÉTRICOS/ESTIRAMIENTOS - contar tiempo manteniendo postura
        if (result.holdTime !== undefined && result.holdTime > 0) {
            const newHoldTime = Math.floor(result.holdTime);
            setHoldTime(newHoldTime);

            const targetTime = currentExercise?.targetTime || 30;

            // Feedback de voz para estiramientos en momentos clave
            if (voiceEnabled && !isSpeakingNow()) {
                if (newHoldTime === Math.floor(targetTime / 2)) {
                    speak('¡MITAD DE TIEMPO! ¡AGUANTA!', 'encouragement', true);
                } else if (newHoldTime === targetTime - 5 && targetTime > 10) {
                    speak('¡5 SEGUNDOS MÁS!', 'encouragement', true);
                }
            }

            // Completar serie cuando alcanza el tiempo objetivo
            if (newHoldTime >= targetTime) {
                if (voiceEnabled) {
                    speak('¡EXCELENTE! ¡TIEMPO COMPLETADO!', 'encouragement', true);
                }
                setHoldTime(0);
                handleSetComplete();
            }
        } else if (result.holdTime === 0) {
            // Reset holdTime cuando pierde la postura
            setHoldTime(0);
        }

        // ===== DETECCIÓN DE INACTIVIDAD =====
        // Comparar con pose anterior para detectar movimiento
        const currentPose = {
            shoulderY: (leftShoulder.y + rightShoulder.y) / 2,
            hipY: (leftHip.y + rightHip.y) / 2,
        };

        if (lastPoseRef.current) {
            const movement = Math.abs(currentPose.shoulderY - lastPoseRef.current.shoulderY) +
                Math.abs(currentPose.hipY - lastPoseRef.current.hipY);

            // Si hay movimiento significativo (umbral 0.02), actualizar tiempo
            if (movement > 0.02) {
                lastMovementTimeRef.current = now;
            }
        }
        lastPoseRef.current = currentPose;

        // Si no hay movimiento por más de 10 segundos, alentar
        const idleTime = now - lastMovementTimeRef.current;
        if (idleTime > 10000 && voiceEnabled && !isSpeakingNow()) {
            const idleMessages = [
                '¡VAMOS! ¡NO TE DETENGAS!',
                '¡CONTINÚA! ¡TÚ PUEDES!',
                '¡MUÉVETE! ¡NO TE RINDAS!',
                '¡SIGUE ADELANTE! ¡FUERZA!',
            ];
            speak(idleMessages[Math.floor(Math.random() * idleMessages.length)], 'encouragement', true);
            lastMovementTimeRef.current = now; // Reset para no repetir inmediatamente
        }

    }, [currentExercise, workoutState, isPaused, handleRepComplete, handleSetComplete, voiceEnabled]);

    // Pantalla de carga o sin ejercicios
    if (!routineData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-purple-900 flex items-center justify-center">
                <div className="text-center text-white">
                    <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p>Cargando rutina...</p>
                </div>
            </div>
        );
    }

    // Rutina sin ejercicios
    if (exercises.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-purple-900 flex items-center justify-center p-4">
                <div className="text-center text-white max-w-md bg-slate-800 rounded-2xl p-8">
                    <ClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h2 className="text-2xl font-bold mb-4">Rutina sin ejercicios</h2>
                    <p className="text-gray-300 mb-6">
                        Esta rutina no tiene ejercicios configurados.
                        Edita la rutina para agregar ejercicios antes de iniciar el entrenamiento.
                    </p>
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all"
                    >
                        Volver y editar
                    </button>
                </div>
            </div>
        );
    }

    // Pantalla de completado
    if (workoutState === WORKOUT_STATES.COMPLETED) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-900 to-emerald-900 flex items-center justify-center p-4">
                <div className="text-center text-white max-w-md">
                    <Trophy className="w-20 h-20 mx-auto mb-6 text-yellow-400" />
                    <h1 className="text-4xl font-bold mb-4">¡Rutina Completada!</h1>
                    <p className="text-xl text-green-200 mb-8">
                        Excelente trabajo. Has completado {exercises.length} ejercicios.
                    </p>
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-white text-green-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-green-100 transition-colors"
                    >
                        Volver al inicio
                    </button>
                </div>
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
                        Salir
                    </button>

                    <div className="text-center">
                        <h1 className="text-white font-bold">{routineData.nombre}</h1>
                        <p className="text-gray-400 text-sm">
                            Ejercicio {currentExerciseIndex + 1} de {exercises.length}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Toggle Voz */}
                        <button
                            onClick={() => setVoiceEnabled(!voiceEnabled)}
                            className={`p - 2 rounded - lg ${voiceEnabled ? 'bg-green-600' : 'bg-gray-600'} `}
                        >
                            {voiceEnabled ? <Volume2 className="w-5 h-5 text-white" /> : <VolumeX className="w-5 h-5 text-white" />}
                        </button>

                        {/* Toggle Mic */}
                        {isVoiceRecognitionSupported() && (
                            <button
                                onClick={toggleMic}
                                className={`p-2 rounded-lg ${micEnabled ? 'bg-blue-600 animate-pulse' : 'bg-gray-600'}`}
                                title={micEnabled ? 'Desactivar micrófono' : 'Activar micrófono'}
                            >
                                {micEnabled ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
                            </button>
                        )}

                        {/* Toggle Voice Commands Modal */}
                        <button
                            onClick={() => setShowVoiceCommandsModal(!showVoiceCommandsModal)}
                            className={`p-2 rounded-lg ${showVoiceCommandsModal ? 'bg-purple-600' : 'bg-gray-600'}`}
                            title="Ver comandos de voz"
                        >
                            <Info className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de comandos de voz */}
            {showVoiceCommandsModal && (
                <div className="fixed bottom-20 right-4 z-50 bg-slate-800 rounded-xl p-4 shadow-2xl border border-blue-500 max-w-xs">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <Mic className="w-5 h-5 text-blue-400" />
                            Comandos de Voz
                        </h3>
                        <button
                            onClick={() => setShowVoiceCommandsModal(false)}
                            className="text-gray-400 hover:text-white text-xl"
                        >
                            ✕
                        </button>
                    </div>
                    <ul className="space-y-2 text-sm">
                        <li className="text-green-400">🎯 "Muéstrame el ejercicio"</li>
                        <li className="text-blue-300">📖 "Explícame el ejercicio"</li>
                        <li className="text-yellow-300">⏭️ "Siguiente" / "Anterior"</li>
                        <li className="text-orange-300">⏸️ "Pausa" / "Continúa"</li>
                        <li className="text-purple-300">😴 "Descanso"</li>
                        <li className="text-pink-300">🔄 "Repite"</li>
                        <li className="text-gray-300">❓ "Ayuda"</li>
                    </ul>
                    <p className="text-xs text-gray-400 mt-3 text-center">Presiona ✕ para ocultar</p>
                </div>
            )}

            {/* Progress bar */}
            <div className="h-1 bg-gray-700">
                <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${((currentExerciseIndex + 1) / exercises.length) * 100}% ` }}
                />
            </div>

            <div className="max-w-7xl mx-auto p-4">
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Columna principal - Cámara/Demo */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Estado del workout - Contador de descanso GRANDE y visible */}
                        {workoutState === WORKOUT_STATES.REST && (
                            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-8 text-center shadow-2xl">
                                <p className="text-blue-200 mb-2 text-lg">⏱️ Tiempo de descanso</p>
                                <p className="text-8xl font-bold text-white mb-4 font-mono">
                                    {restTimer}
                                    <span className="text-4xl">s</span>
                                </p>
                                <div className="w-full bg-blue-900/50 rounded-full h-4 mb-4">
                                    <div
                                        className="bg-white h-4 rounded-full transition-all duration-1000"
                                        style={{ width: `${(restTimer / (currentExercise?.descanso || 60)) * 100}% ` }}
                                    />
                                </div>
                                <p className="text-blue-200 mb-4">
                                    Serie {setCount} de {currentExercise?.targetSets || 3} completada
                                </p>
                                <button
                                    onClick={handleRestComplete}
                                    className="mt-2 bg-white text-blue-600 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors"
                                >
                                    ⏭️ Saltar descanso
                                </button>
                            </div>
                        )}

                        {/* Demo del ejercicio */}
                        {showDemo && currentExercise?.url && (
                            <div className="bg-slate-800 rounded-xl overflow-hidden">
                                <div className="p-4 bg-slate-700 flex justify-between items-center">
                                    <h3 className="text-white font-bold flex items-center gap-2">
                                        <Info className="w-5 h-5" />
                                        Demostración del ejercicio
                                    </h3>
                                    <button
                                        onClick={skipExplanation}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                                    >
                                        ⏭️ Omitir
                                    </button>
                                </div>
                                <img
                                    src={currentExercise.url}
                                    alt={currentExercise.nombre}
                                    className="w-full h-auto max-h-96 object-contain"
                                />
                            </div>
                        )}

                        {/* Cámara con detector */}
                        {workoutState === WORKOUT_STATES.ACTIVE && !isPaused && (
                            <div className="relative bg-slate-800 rounded-xl overflow-hidden">
                                <YogaPoseDetector
                                    onPoseDetected={handlePoseDetected}
                                    highlightedAngles={[]}
                                />

                                <VoiceFeedbackOverlay
                                    corrections={corrections}
                                    currentInstruction={currentExercise?.nombre || ''}
                                    isCorrect={isCorrect}
                                    repCount={repCount}
                                    exerciseName={currentExercise?.nombre}
                                    voiceEnabled={voiceEnabled}
                                    onVoiceToggle={setVoiceEnabled}
                                    isIsometric={currentExercise?.isIsometric || false}
                                    holdTime={holdTime}
                                    targetHoldTime={currentExercise?.targetTime || 30}
                                    targetReps={currentExercise?.targetReps || 12}
                                />

                                {/* Mini demo en esquina */}
                                {currentExercise?.url && (
                                    <div
                                        className="absolute top-20 right-4 w-32 h-24 rounded-lg overflow-hidden border-2 border-white/30 shadow-lg cursor-pointer z-30"
                                        onClick={() => setShowDemo(!showDemo)}
                                    >
                                        <img
                                            src={currentExercise.url}
                                            alt={currentExercise.nombre}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center">
                                            Referencia
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Controles */}
                        <div className="flex items-center justify-center gap-4">
                            <button
                                onClick={goToPrevExercise}
                                disabled={currentExerciseIndex === 0}
                                className="p-3 bg-slate-700 rounded-full disabled:opacity-50"
                            >
                                <SkipBack className="w-6 h-6 text-white" />
                            </button>

                            <button
                                onClick={() => setIsPaused(!isPaused)}
                                className={`p - 4 rounded - full ${isPaused ? 'bg-green-600' : 'bg-yellow-600'} `}
                            >
                                {isPaused ? <Play className="w-8 h-8 text-white" /> : <Pause className="w-8 h-8 text-white" />}
                            </button>

                            <button
                                onClick={goToNextExercise}
                                className="p-3 bg-slate-700 rounded-full"
                            >
                                <SkipForward className="w-6 h-6 text-white" />
                            </button>
                        </div>
                    </div>

                    {/* Panel lateral - Info del ejercicio */}
                    <div className="space-y-4">
                        {/* Info del ejercicio actual */}
                        <div className="bg-slate-800/80 backdrop-blur rounded-xl p-6">
                            <h2 className="text-xl font-bold text-white mb-3">
                                {currentExercise?.nombre}
                            </h2>

                            <p className="text-gray-300 text-sm mb-4">
                                {currentExercise?.proposito}
                            </p>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-gray-300">
                                    <Target className="w-5 h-5 text-purple-400" />
                                    <span>{currentExercise?.musculos?.join(', ')}</span>
                                </div>

                                <div className="flex items-center gap-3 text-gray-300">
                                    <Dumbbell className="w-5 h-5 text-blue-400" />
                                    <span>{currentExercise?.targetReps} reps × {currentExercise?.targetSets} series</span>
                                </div>

                                <div className="flex items-center gap-3 text-gray-300">
                                    <Clock className="w-5 h-5 text-green-400" />
                                    <span>{currentExercise?.descanso}s descanso</span>
                                </div>
                            </div>
                        </div>

                        {/* Contadores */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-4 text-center">
                                <p className="text-blue-200 text-sm">Repeticiones</p>
                                <p className="text-4xl font-bold text-white">{repCount}</p>
                                <p className="text-blue-200 text-xs">de {currentExercise?.targetReps || 12}</p>
                            </div>

                            <div className="bg-gradient-to-br from-green-600 to-teal-600 rounded-xl p-4 text-center">
                                <p className="text-green-200 text-sm">Serie</p>
                                <p className="text-4xl font-bold text-white">{setCount}</p>
                                <p className="text-green-200 text-xs">de {currentExercise?.targetSets || 3}</p>
                            </div>
                        </div>

                        {/* Instrucciones */}
                        <div className="bg-slate-800/80 backdrop-blur rounded-xl p-4">
                            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                Cómo hacerlo
                            </h3>
                            <p className="text-gray-300 text-sm">
                                {currentExercise?.instrucciones}
                            </p>
                        </div>

                        {/* Errores comunes */}
                        <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4">
                            <h3 className="text-red-300 font-semibold mb-2 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Evita estos errores
                            </h3>
                            <ul className="text-red-200 text-sm space-y-1">
                                {currentExercise?.erroresComunes?.map((error, i) => (
                                    <li key={i}>• {error}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Botones de acción de voz */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => handleVoiceCommand('SHOW_EXERCISE')}
                                className="bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg text-sm font-medium transition-colors"
                            >
                                Ver ejercicio
                            </button>
                            <button
                                onClick={() => handleVoiceCommand('EXPLAIN_EXERCISE')}
                                className="bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg text-sm font-medium transition-colors"
                            >
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
                        <h2 className="text-3xl font-bold text-white mb-4">Entrenamiento Pausado</h2>
                        <button
                            onClick={() => setIsPaused(false)}
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
