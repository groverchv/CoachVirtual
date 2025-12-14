import { useState, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import YogaPoseDetector from '../../../Yoga/YogaPoseDetector';
import { calculateBodyAngles } from '../../../../utils/poseUtils';
import { useSpeech } from '../../../../utils/useSpeech';

/**
 * Vista de rutina de Remo con Mancuernas (Bent Over Row)
 * Lógica Biomecánica:
 * 1. Postura (Vital): El torso debe estar inclinado (Hinge de cadera). 
 * - Ángulo cadera ideal: 110° - 145° (aprox 45° de inclinación de torso).
 * - Si es > 160°, está demasiado vertical (trampa).
 * 2. Ejecución: Flexión de codos llevando mancuernas a la cadera.
 */
export default function RemoConMancuernas() {
  // --- UI STATE ---
  const [started, setStarted] = useState(false);
  const location = useLocation();
  const passedImage = location?.state?.imageUrl || null;
  const passedNombre = location?.state?.nombre || null;

  // --- AI LOGIC STATE ---
  const [repCount, setRepCount] = useState(0);
  const [stage, setStage] = useState('extended'); // 'extended', 'pulling', 'squeezing', 'lowering'
  const [feedback, setFeedback] = useState('Inclina el torso hacia adelante');
  const [currentAngles, setCurrentAngles] = useState({
    elbow: 180,
    hipAngle: 170, // Empezamos asumiendo que está de pie
    symmetryDiff: 0
  });

  const { speak } = useSpeech({ lang: 'es-ES' });

  // Refs
  const lastRepTimeRef = useRef(0);
  const elbowHistoryRef = useRef([]);
  const hipHistoryRef = useRef([]);
  const holdStartRef = useRef(null);
  const postureErrorRef = useRef(false);

  // --- UMBRALES ---
  // Codos (Movimiento)
  const START_PULL = 150;    // Brazos estirados abajo
  const END_PULL = 95;       // Codos arriba (flexionados)
  
  // Cadera (Postura Estática)
  // 180 = De pie recto. 90 = Torso paralelo al suelo.
  // Rango seguro para Remo: 100° a 155°
  const MAX_UPRIGHT = 160;   // Demasiado vertical
  const MAX_LOW = 85;        // Demasiado agachado (riesgo lumbar)

  const HOLD_MS = 250;
  const MIN_INTERVAL_MS = 1100;
  const SMOOTH_WINDOW = 5;

  const handlePoseDetected = (landmarks) => {
    const angles = calculateBodyAngles(landmarks);
    const { rightElbow, leftElbow, rightHip, leftHip } = angles;

    // 1. Suavizado
    const updateHistory = (ref, val) => {
        ref.current.push(val);
        if (ref.current.length > SMOOTH_WINDOW) ref.current.shift();
        return ref.current.reduce((a, b) => a + b, 0) / ref.current.length;
    };

    const smoothElbow = Math.round(updateHistory(elbowHistoryRef, (rightElbow + leftElbow) / 2));
    const smoothHip = Math.round(updateHistory(hipHistoryRef, (rightHip + leftHip) / 2));
    const symmetryDiff = Math.abs(rightElbow - leftElbow);

    setCurrentAngles({
        elbow: smoothElbow,
        hipAngle: smoothHip,
        symmetryDiff
    });

    // 2. Validación de Postura (Hip Hinge)
    // El usuario DEBE mantener la inclinación para que el ejercicio cuente
    if (smoothHip > MAX_UPRIGHT) {
        if (!postureErrorRef.current) {
            setFeedback('⚠️ ¡Inclina más el torso!');
            speak('Inclínate hacia adelante');
            postureErrorRef.current = true;
        }
        return; // Pausa lógica de reps
    } 
    else if (smoothHip < MAX_LOW) {
        setFeedback('⚠️ ¡Sube un poco el torso!');
        return;
    }

    if (postureErrorRef.current && smoothHip <= MAX_UPRIGHT) {
        postureErrorRef.current = false;
        setFeedback('✅ Buena postura');
    }

    // 3. Máquina de Estados (Repeticiones)
    const now = Date.now();

    if (stage === 'extended' || stage === 'lowering') {
        // Detectar inicio de subida (Jalón)
        if (smoothElbow < START_PULL - 10) {
            setStage('pulling');
            setFeedback('Jala hacia la cadera...');
            holdStartRef.current = null;
        }
    }
    else if (stage === 'pulling') {
        // Detectar tope (Squeeze)
        if (smoothElbow < END_PULL) {
            if (!holdStartRef.current) {
                holdStartRef.current = now;
            } else if (now - holdStartRef.current >= HOLD_MS) {
                setStage('squeezing');
                setFeedback('🔥 ¡Aguanta arriba!');
                holdStartRef.current = null;
            }
        }
    }
    else if (stage === 'squeezing') {
        // Iniciar bajada
        if (smoothElbow > END_PULL + 10) {
            setStage('lowering');
            setFeedback('Baja controlando el peso...');
        }
    }
    else if (stage === 'lowering') {
        // Detectar extensión completa (Fin de rep)
        if (smoothElbow > START_PULL) {
             if (!holdStartRef.current) {
                holdStartRef.current = now;
            } else if (now - holdStartRef.current >= HOLD_MS) {
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

  const getHipColor = () => {
      if (currentAngles.hipAngle > MAX_UPRIGHT) return 'text-red-600'; // Muy parado
      if (currentAngles.hipAngle < MAX_LOW) return 'text-yellow-600';  // Muy agachado
      return 'text-green-600'; // Perfecto
  };

  // Visualización Esqueleto
  const highlightedAngles = useMemo(() => {
    const postureOk = currentAngles.hipAngle <= MAX_UPRIGHT && currentAngles.hipAngle >= MAX_LOW;
    return [
      { indices: [12, 14, 16], angle: currentAngles.elbow, isValid: true }, // Brazo Der
      { indices: [11, 13, 15], angle: currentAngles.elbow, isValid: true }, // Brazo Izq
      { indices: [12, 24, 26], angle: currentAngles.hipAngle, isValid: postureOk } // Cadera (Postura)
    ];
  }, [currentAngles]);


  // --- VISTA DESCRIPCIÓN ---
  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Remo con mancuernas</h1>
          <p className="text-gray-600 mb-6 text-lg">La IA verificará que mantengas el <strong>torso inclinado</strong> durante todo el ejercicio.</p>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="h-64 flex items-center justify-center overflow-hidden bg-gray-100 relative">
              {passedImage ? (
                <img src={passedImage} alt={passedNombre || 'Remo con mancuernas'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-6xl">🏋️‍♂️</span>
                </div>
              )}
               <div className="absolute bottom-0 w-full bg-black/50 text-white p-2 text-center text-sm backdrop-blur-sm">
                  Postura Clave: Inclinación de 45° (Cadera ~130°)
              </div>
            </div>
            <div className="p-6 space-y-4">
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Ponte de pie, pies al ancho de hombros.</li>
                <li>Inclina el torso hacia adelante (cadera atrás).</li>
                <li>Mantén la espalda neutra, no te encorves.</li>
                <li>Jala las mancuernas hacia tu cintura.</li>
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
          <h1 className="text-3xl font-bold text-indigo-900">🏋️‍♂️ Remo Mancuernas IA</h1>
          <button onClick={() => setStarted(false)} className="text-sm text-indigo-600 hover:text-indigo-800 underline">Finalizar</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUMNA CÁMARA */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-xl overflow-hidden relative">
              <YogaPoseDetector onPoseDetected={handlePoseDetected} highlightedAngles={highlightedAngles} />
              
              {/* Indicador de Inclinación en Video */}
              <div className={`absolute bottom-4 right-4 px-4 py-2 rounded-lg font-bold backdrop-blur-md shadow-lg border-2
                  ${currentAngles.hipAngle > MAX_UPRIGHT ? 'bg-red-500/80 text-white border-red-600' : 'bg-white/90 text-indigo-900 border-transparent'}`}>
                  <div className="text-xs uppercase opacity-80">Ángulo Torso</div>
                  <div className="text-2xl">{currentAngles.hipAngle}°</div>
                  <div className="text-xs">
                      {currentAngles.hipAngle > MAX_UPRIGHT ? '¡INCLÍNATE!' : '✅ Correcto'}
                  </div>
              </div>
            </div>
            
            {/* Panel Métricas */}
            <div className="bg-white rounded-lg shadow-xl p-4 mt-4">
               <div className="grid grid-cols-2 gap-4">
                   <div className="p-3 bg-gray-50 rounded flex flex-col items-center justify-center">
                       <span className="text-xs text-gray-500 mb-1">Simetría Brazos</span>
                       <span className={`font-bold text-lg ${currentAngles.symmetryDiff > 15 ? 'text-yellow-600' : 'text-green-600'}`}>
                           {currentAngles.symmetryDiff}° dif
                       </span>
                   </div>
                   <div className="p-3 bg-gray-50 rounded flex flex-col items-center justify-center">
                       <span className="text-xs text-gray-500 mb-1">Fase</span>
                       <span className="font-bold text-lg text-indigo-600 uppercase">
                           {stage === 'squeezing' ? '🔥 SQUEEZE' : stage}
                       </span>
                   </div>
               </div>
            </div>
          </div>

          {/* COLUMNA DASHBOARD */}
          <div className="space-y-6">
            {/* Contador */}
            <div className="bg-white rounded-lg shadow-xl p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gray-200">
                    <div className={`h-full transition-all duration-300 ${stage === 'pulling' ? 'bg-yellow-400' : stage === 'squeezing' ? 'bg-green-500' : 'bg-blue-500'}`}
                         style={{width: stage === 'extended' ? '5%' : '100%'}}></div>
                </div>
                <h2 className="text-gray-500 font-bold text-sm uppercase tracking-wider mb-2">Repeticiones</h2>
                <div className="text-8xl font-black text-indigo-600">{repCount}</div>
                <button onClick={() => setRepCount(0)} className="mt-2 text-sm text-gray-400 hover:text-gray-600">Reiniciar</button>
            </div>

            {/* Feedback Box */}
            <div className={`rounded-lg shadow-xl p-6 border-l-4 transition-all
                ${feedback.includes('⚠️') ? 'bg-red-50 border-red-500 text-red-800' : 
                  feedback.includes('🔥') ? 'bg-green-50 border-green-500 text-green-800' : 
                  'bg-white border-blue-500 text-gray-700'}`}>
                <p className="text-lg font-medium text-center">{feedback}</p>
            </div>

            {/* Guía Visual de Postura */}
            <div className="bg-white rounded-lg shadow-xl p-6">
                <h3 className="font-bold text-gray-800 mb-4">🎯 El Medidor de Postura</h3>
                <div className="relative pt-6 pb-2">
                    {/* Barra de rango */}
                    <div className="h-4 bg-gradient-to-r from-yellow-200 via-green-400 to-red-400 rounded-full w-full"></div>
                    
                    {/* Marcadores de texto */}
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                        <span>Muy abajo</span>
                        <span className="font-bold text-gray-700">Zona Ideal (45°)</span>
                        <span>Muy parado</span>
                    </div>

                    {/* Indicador flotante (Cursor) */}
                    <div className="absolute top-4 transition-all duration-500 transform -translate-x-1/2"
                         style={{ left: `${Math.min(Math.max(((currentAngles.hipAngle - 80) / 100) * 100, 0), 100)}%` }}>
                        <div className="w-4 h-8 bg-black border-2 border-white rounded shadow-lg"></div>
                    </div>
                </div>
                <p className="text-xs text-center mt-4 text-gray-500">
                    Mantén el indicador en la zona verde.
                </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}