import { useState, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import YogaPoseDetector from '../../../Yoga/YogaPoseDetector';
import { calculateBodyAngles } from '../../../../utils/poseUtils';
import { useSpeech } from '../../../../utils/useSpeech';

/**
 * Vista de rutina de Remo Sentado en Polea Baja
 * Ajustes Biomecánicos vs Máquina:
 * 1. Torso: Igual que en máquina, evitar balanceo excesivo (>115°).
 * 2. Rodillas (NUEVO): Verificar que NO estén bloqueadas (180°). 
 * Deben mantener una ligera flexión (Semiflexión) para proteger lumbares.
 */
export default function RemoSentadoPolea() {
  // --- UI STATE ---
  const [started, setStarted] = useState(false);
  const location = useLocation();
  const passedImage = location?.state?.imageUrl || null;
  const passedNombre = location?.state?.nombre || null;

  // --- AI STATE ---
  const [repCount, setRepCount] = useState(0);
  const [stage, setStage] = useState('extended'); 
  const [feedback, setFeedback] = useState('Piernas semiflexionadas, espalda recta');
  const [currentAngles, setCurrentAngles] = useState({
    elbow: 180,
    torso: 90,
    knee: 160, // Nuevo ángulo a monitorear
    symmetryDiff: 0
  });

  const { speak } = useSpeech({ lang: 'es-ES' });

  // Refs
  const lastRepTimeRef = useRef(0);
  const elbowHistoryRef = useRef([]);
  const torsoHistoryRef = useRef([]);
  const holdStartRef = useRef(null);
  const cheatFlagRef = useRef(false);     // Para el torso
  const kneeWarningRef = useRef(false);   // Para las rodillas

  // --- UMBRALES ---
  const EXTENDED_ENTER = 150;   
  const PULLED_CONFIRM = 85;    
  
  const TORSO_MAX_LEAN = 115;   // Inercia prohibida
  const TORSO_MIN_FWD = 65;     // Permitimos un poco más de estiramiento adelante que en máquina
  
  // Seguridad de Rodillas
  const KNEE_LOCK_THRESHOLD = 175; // Si pasa de esto, están muy rectas (peligroso)
  const KNEE_MIN_BEND = 130;       // Si baja de esto, es una sentadilla (muy dobladas)

  const HOLD_MS = 300;
  const MIN_INTERVAL_MS = 1200;
  const SMOOTH_WINDOW = 5;

  const handlePoseDetected = (landmarks) => {
    const angles = calculateBodyAngles(landmarks);
    // Asumimos que calculateBodyAngles devuelve rightKnee/leftKnee (Cadera-Rodilla-Tobillo)
    const { rightElbow, leftElbow, rightHip, leftHip, rightKnee, leftKnee } = angles; 

    // 1. Suavizado
    const updateHistory = (ref, val) => {
        ref.current.push(val);
        if (ref.current.length > SMOOTH_WINDOW) ref.current.shift();
        return ref.current.reduce((a, b) => a + b, 0) / ref.current.length;
    };

    const smoothElbow = Math.round(updateHistory(elbowHistoryRef, (rightElbow + leftElbow) / 2));
    const smoothTorso = Math.round(updateHistory(torsoHistoryRef, (rightHip + leftHip) / 2));
    const smoothKnee = Math.round((rightKnee + leftKnee) / 2); // Promedio rodillas

    setCurrentAngles({
        elbow: smoothElbow,
        torso: smoothTorso,
        knee: smoothKnee,
        symmetryDiff: Math.abs(rightElbow - leftElbow)
    });

    // 2. Validación de Seguridad (Rodillas)
    if (smoothKnee > KNEE_LOCK_THRESHOLD) {
        if (!kneeWarningRef.current) {
            setFeedback('⚠️ ¡Desbloquea las rodillas!');
            speak('Flexiona un poco las rodillas');
            kneeWarningRef.current = true;
        }
        // No bloqueamos el conteo, pero advertimos persistentemente
    } else {
        kneeWarningRef.current = false;
    }

    // 3. Validación de Trampa (Torso)
    if (smoothTorso > TORSO_MAX_LEAN) {
        if (!cheatFlagRef.current) {
            setFeedback('⚠️ ¡Espalda quieta! No te balances.');
            speak('Controla el torso');
            cheatFlagRef.current = true;
        }
        return; 
    } 
    
    if (cheatFlagRef.current && smoothTorso <= TORSO_MAX_LEAN) {
        cheatFlagRef.current = false;
        setFeedback('✅ Mejor control');
    }

    // 4. Máquina de Estados (Lógica de Repetición igual al Remo Máquina)
    const now = Date.now();

    if (stage === 'extended' || stage === 'return_hold') {
        if (smoothElbow < EXTENDED_ENTER - 10) {
            setStage('pulling');
            setFeedback('Jala hacia el ombligo...');
            holdStartRef.current = null;
        }
    }
    else if (stage === 'pulling') {
        if (smoothElbow < PULLED_CONFIRM) {
             if (!holdStartRef.current) {
                holdStartRef.current = now;
            } else if (now - holdStartRef.current >= HOLD_MS) {
                setStage('squeezing');
                setFeedback('🔥 ¡Aprieta espalda!');
                holdStartRef.current = null;
            }
        }
    }
    else if (stage === 'squeezing') {
        if (smoothElbow > PULLED_CONFIRM + 10) {
            setStage('returning');
            setFeedback('Estira controlado...');
        }
    }
    else if (stage === 'returning') {
        if (smoothElbow > EXTENDED_ENTER) {
            if (!holdStartRef.current) {
                holdStartRef.current = now;
            } else if (now - holdStartRef.current >= HOLD_MS/2) {
                 if (now - lastRepTimeRef.current >= MIN_INTERVAL_MS) {
                    const newCount = repCount + 1;
                    setRepCount(newCount);
                    setFeedback(`✅ Repetición ${newCount}`);
                    speak(newCount.toString());
                    lastRepTimeRef.current = now;
                }
                setStage('extended');
                holdStartRef.current = null;
            }
        }
    }
  };

  // Visualización
  const highlightedAngles = useMemo(() => {
    const torsoOk = currentAngles.torso <= TORSO_MAX_LEAN;
    const kneesOk = currentAngles.knee <= KNEE_LOCK_THRESHOLD;
    return [
      { indices: [12, 14, 16], angle: currentAngles.elbow, isValid: true }, // Brazos
      { indices: [12, 24, 26], angle: currentAngles.torso, isValid: torsoOk }, // Torso
      { indices: [24, 26, 28], angle: currentAngles.knee, isValid: kneesOk } // Rodillas (NUEVO VISUAL)
    ];
  }, [currentAngles]);

  // --- VISTA DESCRIPCIÓN ---
  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Remo en Polea Baja</h1>
          <p className="text-gray-600 mb-6 text-lg">
            Ejercicio fundamental de espalda. La IA vigilará tu <strong>inclinación</strong> y que mantengas las <strong>rodillas semiflexionadas</strong>.
          </p>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="h-64 flex items-center justify-center overflow-hidden bg-gray-100 relative">
              {passedImage ? (
                <img src={passedImage} alt={passedNombre || 'Remo Polea'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-6xl">🚣</span>
                </div>
              )}
            </div>
            <div className="p-6 space-y-4">
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Siéntate con las rodillas ligeramente flexionadas.</li>
                <li>Mantén la espalda neutra (ni muy adelante, ni muy atrás).</li>
                <li>Lleva el maneral hacia la parte baja del abdomen.</li>
              </ul>
              <button onClick={() => setStarted(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors">
                Iniciar rutina
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA RUTINA ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-indigo-900">🚣 Remo Polea Baja IA</h1>
          <button onClick={() => setStarted(false)} className="text-sm text-indigo-600 hover:text-indigo-800 underline">Finalizar</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CÁMARA */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-xl overflow-hidden relative">
              <YogaPoseDetector onPoseDetected={handlePoseDetected} highlightedAngles={highlightedAngles} />
              
              {/* Overlay Alertas */}
              <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full font-bold backdrop-blur-md shadow-lg transition-all
                 ${feedback.includes('⚠️') ? 'bg-red-500/90 text-white animate-pulse' : 'bg-white/90 text-indigo-900'}`}>
                 {feedback}
              </div>
            </div>

            {/* Métricas Detalladas */}
            <div className="bg-white rounded-lg shadow-xl p-4 mt-4">
               <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Semáforo de Postura</h3>
               <div className="grid grid-cols-3 gap-4">
                   {/* Torso */}
                   <div className={`p-3 rounded border text-center ${currentAngles.torso > TORSO_MAX_LEAN ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                       <div className="text-xs opacity-75">Torso (Balanceo)</div>
                       <div className="font-bold text-xl">{currentAngles.torso}°</div>
                       <div className="text-xs">{currentAngles.torso > TORSO_MAX_LEAN ? '❌ Inestable' : '✅ Estable'}</div>
                   </div>

                   {/* Rodillas (Nuevo) */}
                   <div className={`p-3 rounded border text-center ${currentAngles.knee > KNEE_LOCK_THRESHOLD ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                       <div className="text-xs opacity-75">Rodillas</div>
                       <div className="font-bold text-xl">{currentAngles.knee}°</div>
                       <div className="text-xs">{currentAngles.knee > KNEE_LOCK_THRESHOLD ? '⚠️ Bloqueadas' : '✅ Flexionadas'}</div>
                   </div>

                   {/* Codos */}
                   <div className="p-3 rounded border bg-gray-50 border-gray-200 text-center text-gray-700">
                       <div className="text-xs opacity-75">Recorrido</div>
                       <div className="font-bold text-xl">{currentAngles.elbow}°</div>
                       <div className="text-xs uppercase">{stage}</div>
                   </div>
               </div>
            </div>
          </div>

          {/* PANEL DERECHO */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-xl p-8 text-center">
                <h2 className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-2">Contador</h2>
                <div className="text-8xl font-black text-indigo-600">{repCount}</div>
                
                {/* Barra de progreso de fase */}
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4 overflow-hidden">
                    <div className={`h-full transition-all duration-300 
                        ${stage === 'pulling' ? 'w-1/2 bg-yellow-400' : stage === 'squeezing' ? 'w-full bg-green-500' : 'w-0'}`}>
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-1 capitalize">{stage.replace('_', ' ')}</p>
            </div>

            <div className="bg-white rounded-lg shadow-xl p-6">
                <h3 className="font-bold text-gray-700 mb-3">Checklist de Seguridad</h3>
                <ul className="space-y-3 text-sm">
                    <li className="flex items-center justify-between border-b pb-2">
                        <span>1. Espalda Neutra</span>
                        <span className={currentAngles.torso <= TORSO_MAX_LEAN ? 'text-green-500' : 'text-red-500'}>
                            {currentAngles.torso <= TORSO_MAX_LEAN ? '✅ OK' : '❌ MAL'}
                        </span>
                    </li>
                    <li className="flex items-center justify-between border-b pb-2">
                        <span>2. Rodillas Semiflex</span>
                        <span className={currentAngles.knee <= KNEE_LOCK_THRESHOLD ? 'text-green-500' : 'text-yellow-500'}>
                            {currentAngles.knee <= KNEE_LOCK_THRESHOLD ? '✅ OK' : '⚠️ CUIDADO'}
                        </span>
                    </li>
                    <li className="flex items-center justify-between">
                        <span>3. Rango Completo</span>
                        <span className={stage === 'squeezing' ? 'text-green-500 font-bold' : 'text-gray-400'}>
                            {stage === 'squeezing' ? '🔥 SQUEEZE' : '...'}
                        </span>
                    </li>
                </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}