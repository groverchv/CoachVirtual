import { useState, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import YogaPoseDetector from '../../../Yoga/YogaPoseDetector';
import { calculateBodyAngles } from '../../../../utils/poseUtils';
import { useSpeech } from '../../../../utils/useSpeech';

/**
 * Vista de rutina de Remo Inclinado con Mancuernas (Bent-over Row)
 * Lógica Biomecánica:
 * 1. Postura (Hip Hinge): El torso debe mantenerse inclinado (ángulo cadera < 160°).
 * Si el usuario se endereza para subir el peso, es "trampa".
 * 2. Simetría: Al ser mancuernas, verificamos que ambos brazos suban parejos.
 */
export default function RemoInclinadoMancuernas() {
  // --- UI STATE ---
  const [started, setStarted] = useState(false);
  const location = useLocation();
  const passedImage = location?.state?.imageUrl || null;
  const passedNombre = location?.state?.nombre || null;

  // --- AI LOGIC STATE ---
  const [repCount, setRepCount] = useState(0);
  const [stage, setStage] = useState('extended'); // 'extended', 'pulling', 'squeezing', 'lowering'
  const [feedback, setFeedback] = useState('Inclínate hacia adelante (45°)');
  const [currentAngles, setCurrentAngles] = useState({
    elbow: 180,      // Promedio de codos
    hipAngle: 170,   // Ángulo del torso (180=de pie, 90=paralelo)
    symmetryDiff: 0  // Diferencia entre brazo izq/der
  });

  const { speak } = useSpeech({ lang: 'es-ES' });

  // Refs
  const lastRepTimeRef = useRef(0);
  const elbowHistoryRef = useRef([]);
  const hipHistoryRef = useRef([]);
  const holdStartRef = useRef(null);
  const postureErrorRef = useRef(false);

  // --- UMBRALES BIOMECÁNICOS ---
  // Codos
  const START_PULL = 150;     // Brazos estirados
  const END_PULL = 95;        // Codos arriba (retracción)
  
  // Cadera (Postura)
  const MAX_UPRIGHT = 155;    // Si pasa de esto, está muy parado (Trampa)
  const IDEAL_HINGE_MIN = 100; // Rango inferior de inclinación segura

  const MAX_SYMMETRY_DIFF = 20; // Grados de diferencia permitidos entre brazos

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
    if (smoothHip > MAX_UPRIGHT) {
        if (!postureErrorRef.current) {
            setFeedback('⚠️ ¡Inclina el torso! No te pares.');
            speak('Inclínate más');
            postureErrorRef.current = true;
        }
        return; // Pausamos conteo si la postura es mala
    } else {
        if (postureErrorRef.current) {
             postureErrorRef.current = false;
             setFeedback('✅ Buena postura');
        }
    }

    // 3. Chequeo de Simetría
    if (symmetryDiff > MAX_SYMMETRY_DIFF) {
        setFeedback('⚠️ Iguala los brazos');
        // No pausamos necesariamente, pero avisamos
    }

    // 4. Máquina de Estados
    const now = Date.now();

    if (stage === 'extended' || stage === 'lowering') {
        // Inicio Jalón
        if (smoothElbow < START_PULL - 10) {
            setStage('pulling');
            setFeedback('Jala hacia la cadera...');
            holdStartRef.current = null;
        }
    }
    else if (stage === 'pulling') {
        // Tope (Squeeze)
        if (smoothElbow < END_PULL) {
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
        // Inicio bajada
        if (smoothElbow > END_PULL + 10) {
            setStage('lowering');
            setFeedback('Baja lento...');
        }
    }
    else if (stage === 'lowering') {
        // Vuelta a extensión
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

  const getPostureStatus = () => {
      if (currentAngles.hipAngle > MAX_UPRIGHT) return { text: 'MUY PARADO', color: 'text-red-600', bg: 'bg-red-100' };
      if (currentAngles.hipAngle < IDEAL_HINGE_MIN) return { text: 'MUY BAJO', color: 'text-yellow-600', bg: 'bg-yellow-100' };
      return { text: 'IDEAL', color: 'text-green-600', bg: 'bg-green-100' };
  };

  // Visualización Esqueleto
  const highlightedAngles = useMemo(() => {
    const postureOk = currentAngles.hipAngle <= MAX_UPRIGHT;
    return [
      { indices: [12, 14, 16], angle: currentAngles.elbow, isValid: true }, // Brazos
      { indices: [11, 13, 15], angle: currentAngles.elbow, isValid: true }, 
      { indices: [12, 24, 26], angle: currentAngles.hipAngle, isValid: postureOk } // Cadera
    ];
  }, [currentAngles]);

  // --- VISTA PREVIA ---
  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Remo inclinado con mancuernas</h1>
          <p className="text-gray-600 mb-6 text-lg">La IA comprobará que mantengas la inclinación correcta del torso y que ambos brazos suban parejos.</p>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="h-64 flex items-center justify-center overflow-hidden bg-gray-100 relative">
              {passedImage ? (
                <img src={passedImage} alt={passedNombre || 'Remo inclinado'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-6xl">💪</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-3 text-center backdrop-blur-sm">
                  <span className="font-bold text-yellow-400">Clave:</span> Mantén el torso a 45° (aprox).
              </div>
            </div>
            <div className="p-6 space-y-4">
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Inclínate desde la cadera, espalda recta.</li>
                <li>Sube las mancuernas hacia tu cintura.</li>
                <li>No te impulses con el cuerpo (trampa).</li>
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
  const posture = getPostureStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-indigo-900">💪 Remo Inclinado IA</h1>
          <button onClick={() => setStarted(false)} className="text-sm text-indigo-600 hover:text-indigo-800 underline">Finalizar</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUMNA CÁMARA */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-xl overflow-hidden relative">
              <YogaPoseDetector onPoseDetected={handlePoseDetected} highlightedAngles={highlightedAngles} />
              
              {/* Medidor Visual de Inclinación Overlay */}
              <div className={`absolute top-4 right-4 px-4 py-2 rounded-lg border-2 backdrop-blur-md shadow-sm
                  ${posture.bg} border-white/50`}>
                  <div className="text-xs font-bold text-gray-500 uppercase">Ángulo Torso</div>
                  <div className={`text-2xl font-black ${posture.color}`}>{currentAngles.hipAngle}°</div>
                  <div className={`text-xs font-bold ${posture.color}`}>{posture.text}</div>
              </div>
            </div>

            {/* Dashboard Métricas */}
            <div className="bg-white rounded-lg shadow-xl p-4 mt-4">
               <div className="grid grid-cols-3 gap-4 text-center">
                   <div className="p-2 bg-gray-50 rounded">
                       <div className="text-xs text-gray-500">Simetría</div>
                       <div className={`text-lg font-bold ${currentAngles.symmetryDiff > MAX_SYMMETRY_DIFF ? 'text-red-500' : 'text-green-600'}`}>
                           {currentAngles.symmetryDiff}°
                       </div>
                       <div className="text-[10px] text-gray-400">Dif. Izq/Der</div>
                   </div>
                   <div className="p-2 bg-gray-50 rounded">
                       <div className="text-xs text-gray-500">Recorrido</div>
                       <div className="text-lg font-bold text-blue-600">{currentAngles.elbow}°</div>
                       <div className="text-[10px] text-gray-400">Meta: &lt;95°</div>
                   </div>
                   <div className="p-2 bg-gray-50 rounded">
                       <div className="text-xs text-gray-500">Fase</div>
                       <div className="text-lg font-bold text-indigo-600 uppercase">{stage === 'squeezing' ? 'HOLD' : stage.slice(0,4)}</div>
                   </div>
               </div>
            </div>
          </div>

          {/* COLUMNA FEEDBACK */}
          <div className="space-y-6">
            {/* Rep Counter */}
            <div className="bg-white rounded-lg shadow-xl p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 h-1 bg-gray-200 w-full">
                    <div className={`h-full transition-all duration-300 ${stage === 'pulling' ? 'bg-yellow-400' : stage==='squeezing' ? 'bg-green-500' : 'bg-transparent'}`}
                        style={{ width: stage === 'extended' ? '0%' : '100%' }}></div>
                </div>
                <h2 className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-2">Repeticiones</h2>
                <div className="text-8xl font-black text-indigo-600">{repCount}</div>
                <button onClick={() => setRepCount(0)} className="mt-2 text-xs text-indigo-400 underline hover:text-indigo-600">Reset</button>
            </div>

            {/* Feedback Box */}
            <div className={`rounded-lg shadow-xl p-6 border-l-4 transition-all
                ${feedback.includes('⚠️') ? 'bg-red-50 border-red-500 text-red-800' : 
                  feedback.includes('🔥') ? 'bg-green-50 border-green-500 text-green-800' : 
                  'bg-white border-blue-500 text-gray-700'}`}>
                <div className="flex items-start gap-3">
                    <span className="text-2xl">{feedback.includes('⚠️') ? '🛑' : feedback.includes('🔥') ? '✨' : 'ℹ️'}</span>
                    <p className="text-lg font-medium leading-tight pt-1">{feedback}</p>
                </div>
            </div>

            {/* Guía Visual Inclinación */}
            <div className="bg-white rounded-lg shadow-xl p-6">
                <h3 className="font-bold text-gray-700 mb-3 text-sm">Rango de Inclinación</h3>
                <div className="relative h-8 w-full bg-gray-200 rounded-full overflow-hidden">
                    {/* Gradiente: Rojo (Parado) -> Verde (Inclinado) -> Rojo (Muy abajo) */}
                    <div className="absolute w-full h-full bg-gradient-to-l from-red-300 via-green-300 to-yellow-200" 
                         style={{ background: 'linear-gradient(to left, #fca5a5 0%, #fca5a5 20%, #86efac 40%, #86efac 80%, #fde047 100%)' }}>
                    </div>
                    {/* Marcador */}
                    <div className="absolute top-0 bottom-0 w-1 bg-black shadow-lg transition-all duration-500"
                         style={{ left: `${Math.min(Math.max(((currentAngles.hipAngle - 90) / 90) * 100, 0), 100)}%` }}>
                    </div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-1 px-1">
                    <span>90° (Plano)</span>
                    <span>180° (Pie)</span>
                </div>
                <p className="text-xs text-center mt-2 text-gray-500 italic">Mantén la línea negra en la zona verde.</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}