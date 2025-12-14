import { useState } from 'react';
import { ChevronRight, ChevronLeft, Sparkles, Loader2 } from 'lucide-react';
import { generarRutinaConIA, guardarRutinaGenerada } from '../../services/rutinaIAService';
import { useNavigate } from 'react-router-dom';

export default function WizardRutinaIA() {
    const navigate = useNavigate();
    const [paso, setPaso] = useState(1);
    const [generando, setGenerando] = useState(false);
    const [rutinaGenerada, setRutinaGenerada] = useState(null);

    const [respuestas, setRespuestas] = useState({
        objetivo: '',
        nivel: '',
        diasSemana: 4,
        duracion: 45,
        areas: [],
        limitaciones: ''
    });

    const handleNext = () => {
        if (paso < 5) setPaso(paso + 1);
        else generarRutina();
    };

    const handleBack = () => {
        if (paso > 1) setPaso(paso - 1);
    };

    const actualizar = (campo, valor) => {
        setRespuestas(prev => ({ ...prev, [campo]: valor }));
    };

    const toggleArea = (area) => {
        setRespuestas(prev => ({
            ...prev,
            areas: prev.areas.includes(area)
                ? prev.areas.filter(a => a !== area)
                : [...prev.areas, area]
        }));
    };

    const generarRutina = async () => {
        setGenerando(true);
        try {
            const resultado = await generarRutinaConIA(respuestas);
            if (resultado.success) {
                setRutinaGenerada(resultado.rutina);
                setPaso(6); // Paso de preview
            } else {
                alert('Error al generar rutina: ' + resultado.error);
                setRutinaGenerada(resultado.fallback);
                setPaso(6);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            setGenerando(false);
        }
    };

    const guardarRutina = async () => {
        try {
            const resultado = await guardarRutinaGenerada(rutinaGenerada);
            console.log('Rutina guardada:', resultado);
            navigate('/');
        } catch (error) {
            console.error('Error al guardar:', error);
            alert('Error al guardar: ' + error.message);
        }
    };

    const puedeAvanzar = () => {
        switch (paso) {
            case 1: return respuestas.objetivo !== '';
            case 2: return respuestas.nivel !== '';
            case 3: return respuestas.diasSemana > 0;
            case 4: return respuestas.duracion > 0;
            case 5: return true; // Áreas y limitaciones son opcionales
            default: return false;
        }
    };

    if (paso === 6 && rutinaGenerada) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8">
                <div className="max-w-4xl mx-auto">
                    {/* Preview de rutina generada */}
                    <div className="bg-white rounded-2xl p-8 shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <Sparkles className="w-8 h-8 text-purple-600" />
                            <h1 className="text-3xl font-bold text-gray-900">{rutinaGenerada.nombre}</h1>
                        </div>

                        <p className="text-gray-600 mb-8">{rutinaGenerada.descripcion}</p>

                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="bg-purple-50 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-purple-600">{rutinaGenerada.diasSemana}</div>
                                <div className="text-sm text-gray-600">Días/semana</div>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-blue-600">{rutinaGenerada.duracion}'</div>
                                <div className="text-sm text-gray-600">Por sesión</div>
                            </div>
                            <div className="bg-pink-50 p-4 rounded-lg text-center">
                                <div className="text-2xl font-bold text-pink-600">
                                    {rutinaGenerada.dias.reduce((sum, d) => sum + d.ejercicios.length, 0)}
                                </div>
                                <div className="text-sm text-gray-600">Ejercicios</div>
                            </div>
                        </div>

                        {/* Días de la rutina */}
                        <div className="space-y-6">
                            {rutinaGenerada.dias.map((dia, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-xl p-6">
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">{dia.nombre}</h3>
                                    <div className="space-y-3">
                                        {dia.ejercicios.map((ej, i) => (
                                            <div key={i} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                                                <div>
                                                    <div className="font-semibold text-gray-900">{ej.nombre}</div>
                                                    <div className="text-sm text-gray-600">
                                                        {ej.series} series × {ej.repeticiones} reps
                                                        {ej.descanso && ` • ${ej.descanso}`}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Botones de acción */}
                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={guardarRutina}
                                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold hover:shadow-lg transition-all"
                            >
                                ✅ Guardar Rutina
                            </button>
                            <button
                                onClick={() => { setPaso(1); setRutinaGenerada(null); }}
                                className="px-6 py-4 border-2 border-purple-300 text-purple-600 rounded-xl font-bold hover:bg-purple-50 transition-all"
                            >
                                🔄 Regenerar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-white mb-4">
                        <Sparkles className="w-5 h-5" />
                        <span className="font-semibold">Generador de Rutinas IA</span>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                        Crea tu rutina personalizada
                    </h1>
                    <p className="text-purple-200">
                        Responde algunas preguntas y dejanos crear la rutina perfecta para ti
                    </p>
                </div>

                {/* Progress bar */}
                <div className="mb-8">
                    <div className="flex justify-between mb-2 text-sm text-purple-200">
                        <span>Paso {paso} de 5</span>
                        <span>{Math.round((paso / 5) * 100)}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(paso / 5) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Card del wizard */}
                <div className="bg-white rounded-2xl p-8 shadow-2xl">
                    {generando ? (
                        <div className="text-center py-12">
                            <Loader2 className="w-16 h-16 text-purple-600 animate-spin mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                Generando tu rutina...
                            </h3>
                            <p className="text-gray-600">
                                Nuestra IA está creando la rutina perfecta para ti
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Paso 1: Objetivo */}
                            {paso === 1 && (
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                        ¿Cuál es tu objetivo principal?
                                    </h2>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { valor: 'Ganar músculo', emoji: '💪', desc: 'Hipertrofia muscular' },
                                            { valor: 'Perder peso', emoji: '🔥', desc: 'Definición y cardio' },
                                            { valor: 'Fisioterapia', emoji: '🏥', desc: 'Rehabilitación' },
                                            { valor: 'Flexibilidad', emoji: '🤸', desc: 'Movilidad y estiramiento' },
                                            { valor: 'Fuerza', emoji: '⚡', desc: 'Powerlifting' },
                                            { valor: 'Resistencia', emoji: '🏃', desc: 'Cardio y aguante' },
                                        ].map((obj) => (
                                            <button
                                                key={obj.valor}
                                                onClick={() => actualizar('objetivo', obj.valor)}
                                                className={`p-6 rounded-xl border-2 transition-all text-left ${respuestas.objetivo === obj.valor
                                                        ? 'border-purple-600 bg-purple-50'
                                                        : 'border-gray-200 hover:border-purple-300'
                                                    }`}
                                            >
                                                <div className="text-4xl mb-2">{obj.emoji}</div>
                                                <div className="font-bold text-gray-900">{obj.valor}</div>
                                                <div className="text-sm text-gray-600">{obj.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Paso 2: Nivel */}
                            {paso === 2 && (
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                        ¿Cuál es tu nivel de experiencia?
                                    </h2>
                                    <div className="space-y-4">
                                        {[
                                            { valor: 'Principiante', desc: 'Menos de 6 meses entrenando', emoji: '🌱' },
                                            { valor: 'Intermedio', desc: '6 meses a 2 años', emoji: '🌿' },
                                            { valor: 'Avanzado', desc: 'Más de 2 años', emoji: '🌳' },
                                        ].map((niv) => (
                                            <button
                                                key={niv.valor}
                                                onClick={() => actualizar('nivel', niv.valor)}
                                                className={`w-full p-6 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${respuestas.nivel === niv.valor
                                                        ? 'border-purple-600 bg-purple-50'
                                                        : 'border-gray-200 hover:border-purple-300'
                                                    }`}
                                            >
                                                <div className="text-4xl">{niv.emoji}</div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{niv.valor}</div>
                                                    <div className="text-sm text-gray-600">{niv.desc}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Paso 3: Días por semana */}
                            {paso === 3 && (
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                        ¿Cuántos días puedes entrenar por semana?
                                    </h2>
                                    <div className="mb-8">
                                        <div className="text-center mb-4">
                                            <span className="text-6xl font-bold text-purple-600">
                                                {respuestas.diasSemana}
                                            </span>
                                            <span className="text-2xl text-gray-600 ml-2">días</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="3"
                                            max="6"
                                            value={respuestas.diasSemana}
                                            onChange={(e) => actualizar('diasSemana', parseInt(e.target.value))}
                                            className="w-full h-3 bg-purple-200 rounded-lg appearance-none cursor-pointer slider"
                                        />
                                        <div className="flex justify-between text-sm text-gray-600 mt-2">
                                            <span>3 días</span>
                                            <span>6 días</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Paso 4: Duración */}
                            {paso === 4 && (
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                        ¿Cuánto tiempo tienes por sesión?
                                    </h2>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { valor: 30, label: '20-30 min', emoji: '⚡' },
                                            { valor: 45, label: '30-45 min', emoji: '🎯' },
                                            { valor: 60, label: '45-60 min', emoji: '💪' },
                                            { valor: 75, label: '+60 min', emoji: '🏋️' },
                                        ].map((dur) => (
                                            <button
                                                key={dur.valor}
                                                onClick={() => actualizar('duracion', dur.valor)}
                                                className={`p-6 rounded-xl border-2 transition-all ${respuestas.duracion === dur.valor
                                                        ? 'border-purple-600 bg-purple-50'
                                                        : 'border-gray-200 hover:border-purple-300'
                                                    }`}
                                            >
                                                <div className="text-4xl mb-2">{dur.emoji}</div>
                                                <div className="font-bold text-gray-900">{dur.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Paso 5: Áreas y limitaciones */}
                            {paso === 5 && (
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                        Últimos detalles
                                    </h2>

                                    <div className="mb-6">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            ¿Qué áreas quieres enfocar? (opcional)
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {['Piernas', 'Pecho', 'Espalda', 'Brazos', 'Abdomen', 'Hombros'].map((area) => (
                                                <button
                                                    key={area}
                                                    onClick={() => toggleArea(area)}
                                                    className={`py-3 px-4 rounded-xl border-2 font-medium transition-all ${respuestas.areas.includes(area)
                                                            ? 'border-purple-600 bg-purple-50 text-purple-700'
                                                            : 'border-gray-200 text-gray-700 hover:border-purple-300'
                                                        }`}
                                                >
                                                    {area}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            ¿Tienes alguna lesión o limitación? (opcional)
                                        </label>
                                        <textarea
                                            value={respuestas.limitaciones}
                                            onChange={(e) => actualizar('limitaciones', e.target.value)}
                                            placeholder="Ej: Dolor lumbar, tendinitis de hombro..."
                                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none resize-none"
                                            rows="3"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Botones de navegación */}
                            <div className="flex gap-4 mt-8">
                                {paso > 1 && (
                                    <button
                                        onClick={handleBack}
                                        className="px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold flex items-center gap-2 hover:bg-gray-50 transition-all"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                        Atrás
                                    </button>
                                )}
                                <button
                                    onClick={handleNext}
                                    disabled={!puedeAvanzar()}
                                    className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${puedeAvanzar()
                                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        }`}
                                >
                                    {paso === 5 ? (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            Generar Rutina
                                        </>
                                    ) : (
                                        <>
                                            Siguiente
                                            <ChevronRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
