import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Calendar,
  Target,
  Clock,
  Flame,
  Trophy,
  Plus,
  ChevronRight,
  Activity,
  Dumbbell,
  PlayCircle,
  Sparkles,
  Zap,
  Award,
  TrendingDown
} from 'lucide-react';
import RoutineService from '../services/RoutineService';
import EjercicioService from '../services/EjercicioService';
import DetalleMusculoService from '../services/DetalleMusculoService';

/**
 * Dashboard principal del usuario - Versión dinámica y atractiva
 * - Animaciones de entrada
 * - Gráfica interactiva de comportamiento/progreso
 * - Rutinas actuales con efectos visuales
 * - Botón destacado para explorar nuevos ejercicios
 */
const Home = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [hoveredBar, setHoveredBar] = useState(null);
  const [rutinas, setRutinas] = useState([]);
  const [loadingRutinas, setLoadingRutinas] = useState(true);

  // Estado para modal de creación manual
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [newRutinaNombre, setNewRutinaNombre] = useState('');
  const [newRutinaDuracion, setNewRutinaDuracion] = useState('45');
  const [newRutinaCategoria, setNewRutinaCategoria] = useState('Gimnasio');

  // Datos de ejemplo para estadísticas - reemplazar con API
  const estadisticas = {
    entrenamientosSemanales: 4,
    minutosTotal: 180,
    caloriasQuemadas: 850,
    racha: 7
  };

  // Datos de ejemplo para la gráfica - reemplazar con API
  const datosGrafica = [
    { dia: 'Lun', minutos: 30 },
    { dia: 'Mar', minutos: 45 },
    { dia: 'Mié', minutos: 20 },
    { dia: 'Jue', minutos: 60 },
    { dia: 'Vie', minutos: 40 },
    { dia: 'Sáb', minutos: 50 },
    { dia: 'Dom', minutos: 35 }
  ];

  const maxMinutos = Math.max(...datosGrafica.map(d => d.minutos));

  useEffect(() => {
    setMounted(true);
    // cargar rutinas desde backend o localStorage
    (async () => {
      try {
        setLoadingRutinas(true);
        const data = await RoutineService.list();
        if (Array.isArray(data) && data.length > 0) {
          // normalizar a estructura que usa la UI
          const normalized = data.map((r) => ({
            id: r.id,
            nombre: r.nombre || r.title || r.nombre || 'Rutina',
            categoria: r.categoria || (r.categoria === 'fisioterapia' ? 'Fisioterapia' : (r.categoria || 'Gimnasio')),
            parte: r.parte_cuerpo || r.parte || 'General',
            ejercicios: Array.isArray(r.datos_rutina) ? r.datos_rutina.length : (r.ejercicios || 0),
            duracion: r.duracion_minutos ? `${r.duracion_minutos} min` : (r.duracion || '45 min'),
            progreso: r.progreso ?? 0,
            datos_rutina: r.datos_rutina || r.exercises || []
          }));
          setRutinas(normalized);
        } else {
          // si no hay datos, mantenemos vacío
          setRutinas([]);
        }
      } catch (err) {
        console.error('Error cargando rutinas:', err);
        setRutinas([]);
      } finally {
        setLoadingRutinas(false);
      }
    })();
  }, []);

  const handleExplorarEjercicios = () => {
    navigate('/ejercicios/categoria');
  };

  const openCreateModal = async () => {
    setShowCreateModal(true);
    setSelectedExercises([]);
    try {
      const [detalles, ejercicios] = await Promise.all([
        DetalleMusculoService.getAll().catch(() => []),
        EjercicioService.getAll().catch(() => [])
      ]);

      const list = detalles.map((detalle) => {
        const ejercicio = ejercicios.find(e => e.id === detalle.ejercicio) || detalle.ejercicio_data || {};
        return {
          id: detalle.ejercicio,
          detalleId: detalle.id,
          nombre: ejercicio.nombre || `Ejercicio ${detalle.ejercicio}`,
          descripcion: `Porcentaje: ${detalle.porcentaje}%`,
          url: ejercicio.url || ejercicio.image || '',
          duracion: '15 min',
          porcentaje: detalle.porcentaje
        };
      });

      const uniq = [];
      const byId = {};
      for (const e of list) {
        if (!byId[e.id]) {
          byId[e.id] = true;
          uniq.push(e);
        }
      }
      setAvailableExercises(uniq);
    } catch (err) {
      console.error('No se pudieron cargar ejercicios:', err);
      setAvailableExercises([]);
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
  };

  const toggleSelectExercise = (exercise) => {
    const exists = selectedExercises.find(e => e.id === exercise.id);
    if (exists) {
      setSelectedExercises(prev => prev.filter(e => e.id !== exercise.id));
    } else {
      setSelectedExercises(prev => [...prev, exercise]);
    }
  };

  const handleCreateRoutine = async () => {
    if (!newRutinaNombre.trim()) return alert('Escribe un nombre para la rutina');
    if (selectedExercises.length === 0) return alert('Selecciona al menos un ejercicio');

    const payload = {
      nombre: newRutinaNombre,
      duracion_minutos: parseInt(newRutinaDuracion) || 45,
      categoria: newRutinaCategoria.toLowerCase(),
      parte_cuerpo: selectedExercises[0]?.parte || 'General',
      datos_rutina: selectedExercises.map(e => ({ nombre: e.nombre, url: e.url, id: e.id }))
    };

    try {
      const created = await RoutineService.create(payload);
      const item = {
        id: created.id || Date.now(),
        nombre: created.nombre || payload.nombre,
        categoria: (created.categoria || payload.categoria) === 'fisioterapia' ? 'Fisioterapia' : 'Gimnasio',
        parte: created.parte_cuerpo || payload.parte_cuerpo,
        ejercicios: Array.isArray(created.datos_rutina) ? created.datos_rutina.length : selectedExercises.length,
        duracion: (created.duracion_minutos ? `${created.duracion_minutos} min` : `${payload.duracion_minutos || newRutinaDuracion} min`),
        progreso: created.progreso ?? 0,
        datos_rutina: created.datos_rutina || payload.datos_rutina
      };
      setRutinas(prev => [item, ...prev]);
      setShowCreateModal(false);
      setNewRutinaNombre('');
      setSelectedExercises([]);
    } catch (err) {
      console.error('Error creando rutina:', err);
      alert('No se pudo crear la rutina. Intenta de nuevo.');
    }
  };

  const handleIniciarRutina = (rutinaId) => {
    // Navegar a la vista de detalle de la rutina que muestra solo los ejercicios seleccionados
    try {
      navigate(`/rutinas/${rutinaId}`);
    } catch (err) {
      console.error('Error navegando a rutina:', err);
      alert(`Iniciando rutina ${rutinaId}\n(Próximamente: página de entrenamiento)`);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-7xl mx-auto">
        {/* Header con animación */}
        <div className={`mb-8 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
          </div>
          <p className="text-gray-600 text-lg">
            ¡Bienvenido de nuevo! Sigue así, lo estás haciendo genial 💪
          </p>
        </div>

        {/* Stats Cards con animaciones escalonadas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-700 hover:scale-105 hover:shadow-2xl ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                <Calendar className="w-8 h-8" />
              </div>
              <span className="text-xs text-white/80 font-semibold">Esta semana</span>
            </div>
            <p className="text-4xl font-bold mb-1">{estadisticas.entrenamientosSemanales}</p>
            <p className="text-sm text-white/90">Entrenamientos</p>
            <div className="mt-3 flex items-center gap-1 text-xs text-white/70">
              <TrendingUp className="w-3 h-3" />
              <span>+2 vs semana pasada</span>
            </div>
          </div>

          <div className={`bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-700 hover:scale-105 hover:shadow-2xl ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                <Clock className="w-8 h-8" />
              </div>
              <span className="text-xs text-white/80 font-semibold">Total</span>
            </div>
            <p className="text-4xl font-bold mb-1">{estadisticas.minutosTotal}</p>
            <p className="text-sm text-white/90">Minutos activos</p>
            <div className="mt-3 flex items-center gap-1 text-xs text-white/70">
              <Zap className="w-3 h-3" />
              <span>¡Excelente ritmo!</span>
            </div>
          </div>

          <div className={`bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-700 hover:scale-105 hover:shadow-2xl ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '300ms' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                <Flame className="w-8 h-8 animate-pulse" />
              </div>
              <span className="text-xs text-white/80 font-semibold">Quemadas</span>
            </div>
            <p className="text-4xl font-bold mb-1">{estadisticas.caloriasQuemadas}</p>
            <p className="text-sm text-white/90">Calorías</p>
            <div className="mt-3 flex items-center gap-1 text-xs text-white/70">
              <TrendingUp className="w-3 h-3" />
              <span>¡Sigue así!</span>
            </div>
          </div>

          <div className={`bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-700 hover:scale-105 hover:shadow-2xl ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '400ms' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                <Trophy className="w-8 h-8" />
              </div>
              <span className="text-xs text-white/80 font-semibold">Racha</span>
            </div>
            <p className="text-4xl font-bold mb-1">{estadisticas.racha}</p>
            <p className="text-sm text-white/90">Días consecutivos</p>
            <div className="mt-3 flex items-center gap-1 text-xs text-white/70">
              <Award className="w-3 h-3" />
              <span>¡Récord personal! 🔥</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Gráfica de comportamiento mejorada */}
          <div className={`lg:col-span-2 bg-white rounded-xl shadow-xl p-6 border border-gray-100 transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`} style={{ transitionDelay: '500ms' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-2">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                Actividad Semanal
              </h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-500 font-semibold">Últimos 7 días</span>
              </div>
            </div>

            {/* Gráfica de barras interactiva mejorada */}
            <div className="flex items-end justify-between h-64 gap-3">
              {datosGrafica.map((dato, index) => {
                const altura = (dato.minutos / maxMinutos) * 100;
                const isHovered = hoveredBar === index;
                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center gap-2"
                    onMouseEnter={() => setHoveredBar(index)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    <div className="relative w-full flex items-end justify-center" style={{ height: '200px' }}>
                      <div
                        className={`w-full rounded-t-xl transition-all duration-500 cursor-pointer relative overflow-hidden ${isHovered
                            ? 'bg-gradient-to-t from-purple-600 via-blue-500 to-cyan-400 shadow-lg scale-105'
                            : 'bg-gradient-to-t from-blue-500 via-blue-400 to-blue-300'
                          }`}
                        style={{
                          height: mounted ? `${altura}%` : '0%',
                          transitionDelay: `${600 + index * 100}ms`
                        }}
                      >
                        {/* Efecto de brillo */}
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent"></div>

                        {/* Tooltip mejorado */}
                        <div className={`absolute -top-16 left-1/2 transform -translate-x-1/2 transition-all duration-300 ${isHovered ? 'opacity-100 -translate-y-2' : 'opacity-0 translate-y-0'}`}>
                          <div className="bg-gray-800 text-white px-3 py-2 rounded-lg shadow-xl text-sm font-semibold whitespace-nowrap">
                            <div className="text-center">{dato.minutos} min</div>
                            <div className="text-xs text-gray-300 text-center">{dato.dia}</div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold transition-colors duration-300 ${isHovered ? 'text-blue-600' : 'text-gray-600'}`}>
                      {dato.dia}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Línea de promedio */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-sm">
              <span className="text-gray-600">Promedio diario: <span className="font-bold text-blue-600">38 min</span></span>
              <span className="flex items-center gap-1 text-green-600 font-semibold">
                <TrendingUp className="w-4 h-4" />
                +15% esta semana
              </span>
            </div>
          </div>

          {/* Card de explorar ejercicios - Versión premium */}
          <div className={`relative bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 rounded-xl shadow-2xl p-6 text-white flex flex-col justify-between overflow-hidden transition-all duration-700 hover:scale-105 hover:shadow-3xl ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`} style={{ transitionDelay: '600ms' }}>
            {/* Efectos de fondo animados */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12 animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="relative z-10">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 inline-block mb-4 animate-bounce">
                <Sparkles className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold mb-2">
                🎯 Explorar Nuevos Ejercicios
              </h3>
              <p className="text-white/95 text-sm mb-4 leading-relaxed">
                Descubre rutinas personalizadas de <span className="font-bold">gimnasio</span> y <span className="font-bold">fisioterapia</span>
              </p>
              <div className="flex flex-col gap-2 text-xs text-white/80 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  <span>Más de 50 ejercicios</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  <span>Guiados por IA</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  <span>Para todos los niveles</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleExplorarEjercicios}
              className="relative z-10 bg-white text-purple-600 font-bold py-4 px-6 rounded-xl hover:bg-yellow-300 hover:text-purple-700 transition-all duration-300 flex items-center justify-center gap-2 group shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
            >
              <Plus className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              <span className="text-lg">Explorar Ahora</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
            </button>
          </div>
        </div>

        {/* Sección de rutinas mejorada */}
        <div className={`bg-white rounded-xl shadow-xl p-6 border border-gray-100 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '700ms' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-2">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              Mis Rutinas
            </h2>
            <div className="flex gap-2">
              <button
                onClick={openCreateModal}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5" />
                Crear Manual
              </button>
              <button
                onClick={() => navigate('/rutinas/crear-ia')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <Sparkles className="w-5 h-5" />
                Crear con IA
              </button>
            </div>
          </div>

          {loadingRutinas ? (
            <div className="text-center py-16">Cargando rutinas...</div>
          ) : rutinas.length === 0 ? (
            <div className="text-center py-16 relative">
              {/* Efectos de fondo */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl opacity-50"></div>

              <div className="relative z-10">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-full w-28 h-28 mx-auto mb-6 flex items-center justify-center shadow-xl animate-pulse">
                  <Activity className="w-14 h-14 text-white" />
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                  ¡Tu aventura fitness comienza aquí! 🚀
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                  Explora nuestro catálogo y crea tu primera rutina personalizada.
                  <span className="font-semibold"> ¡Es momento de empezar!</span>
                </p>
                <button
                  onClick={handleExplorarEjercicios}
                  className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold py-4 px-10 rounded-xl transition-all duration-300 inline-flex items-center gap-3 shadow-xl hover:shadow-2xl transform hover:scale-105 animate-bounce"
                >
                  <Sparkles className="w-6 h-6" />
                  <span className="text-lg">Explorar Ejercicios</span>
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          ) : (
            /* Lista de rutinas mejorada */
            <div className="grid md:grid-cols-2 gap-6">
              {rutinas.map((rutina, index) => (
                <div
                  key={rutina.id}
                  className={`relative bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-6 hover:border-purple-300 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 group ${mounted ? 'opacity-100' : 'opacity-0'}`}
                  style={{ transitionDelay: `${800 + index * 100}ms` }}
                >
                  {/* Badge de nueva rutina */}
                  {index === 0 && (
                    <div className="absolute -top-3 -right-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse">
                      ⭐ Reciente
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-purple-600 transition-colors">
                        {rutina.nombre}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                        <span className={`${rutina.categoria === 'Gimnasio' ? 'bg-blue-500' : 'bg-green-500'} text-white px-3 py-1 rounded-full text-xs font-bold shadow-md`}>
                          {rutina.categoria}
                        </span>
                        <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">
                          📍 {rutina.parte}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-5">
                    <div className="flex items-center gap-3 text-sm text-gray-700 bg-blue-50 rounded-lg p-2">
                      <div className="bg-blue-500 rounded-lg p-1.5">
                        <Target className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-semibold">{rutina.ejercicios} ejercicios</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700 bg-green-50 rounded-lg p-2">
                      <div className="bg-green-500 rounded-lg p-1.5">
                        <Clock className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-semibold">{rutina.duracion}</span>
                    </div>
                  </div>

                  {/* Barra de progreso mejorada */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600 font-semibold">Progreso</span>
                      <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                        {rutina.progreso}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                      <div
                        className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-3 rounded-full transition-all duration-1000 relative overflow-hidden"
                        style={{ width: mounted ? `${rutina.progreso}%` : '0%' }}
                      >
                        {/* Efecto de brillo animado */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                      </div>
                    </div>
                    {rutina.progreso >= 50 && (
                      <p className="text-xs text-green-600 font-semibold mt-1 flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        ¡Vas por buen camino! 🔥
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleIniciarRutina(rutina.id)}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <PlayCircle className="w-6 h-6 group-hover:scale-125 transition-transform" />
                    <span className="text-lg">Iniciar Rutina</span>
                    <ChevronRight className="w-5 h-5 ml-auto group-hover:translate-x-2 transition-transform" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal creación manual de rutina */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Crear nueva rutina (Manual)</h3>
                <button onClick={closeCreateModal} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre</label>
                  <input value={newRutinaNombre} onChange={(e) => setNewRutinaNombre(e.target.value)} className="mt-1 block w-full border rounded-md p-2" placeholder="Ej: Full Body A" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duración (min)</label>
                  <select value={newRutinaDuracion} onChange={(e) => setNewRutinaDuracion(e.target.value)} className="mt-1 block w-full border rounded-md p-2">
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="45">45</option>
                    <option value="60">60</option>
                    <option value="43200">1 mes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Categoría</label>
                  <select value={newRutinaCategoria} onChange={(e) => setNewRutinaCategoria(e.target.value)} className="mt-1 block w-full border rounded-md p-2">
                    <option>Gimnasio</option>
                    <option>Fisioterapia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ejercicios seleccionados</label>
                  <div className="mt-1 p-2 border rounded-md h-20 overflow-auto">
                    {selectedExercises.length === 0 ? <span className="text-sm text-gray-500">Ninguno</span> : selectedExercises.map(e => <div key={e.id} className="text-sm">• {e.nombre}</div>)}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold mb-2">Seleccionar ejercicios</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-auto">
                  {availableExercises.length === 0 ? (
                    <div className="text-sm text-gray-500">No hay ejercicios cargados. Intenta abrir de nuevo.</div>
                  ) : (
                    availableExercises.map((ej) => (
                      <label key={ej.detalleId || ej.id} className={`flex items-center gap-3 p-2 border rounded-md cursor-pointer ${selectedExercises.find(s => s.id === ej.id) ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                        <input type="checkbox" checked={!!selectedExercises.find(s => s.id === ej.id)} onChange={() => toggleSelectExercise(ej)} />
                        <div className="flex-1">
                          <div className="font-semibold">{ej.nombre}</div>
                          <div className="text-xs text-gray-500">{ej.descripcion}</div>
                        </div>
                        {ej.url && <img src={ej.url} alt={ej.nombre} className="w-16 h-12 object-cover rounded-md" />}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button onClick={closeCreateModal} className="px-4 py-2 rounded-md border hover:bg-gray-100">Cancelar</button>
                <button onClick={handleCreateRoutine} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Guardar rutina</button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
};

export default Home;