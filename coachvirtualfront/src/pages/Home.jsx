import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  TrendingDown,
  Trash2,
  Edit3,
  X,
  Settings
} from 'lucide-react';
import RoutineService from '../services/RoutineService';
import EjercicioService from '../services/EjercicioService';
import DetalleMusculoService from '../services/DetalleMusculoService';
import PlanService from '../services/PlanService';
import { useSubscription } from '../context/SubscriptionContext';
import api from '../api/api';

/**
 * Dashboard principal del usuario - Versión dinámica y atractiva
 * - Animaciones de entrada
 * - Gráfica interactiva de comportamiento/progreso
 * - Rutinas actuales con efectos visuales
 * - Botón destacado para explorar nuevos ejercicios
 */
const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refrescarPlan } = useSubscription();
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

  // Estado para editar rutina
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRutina, setEditingRutina] = useState(null);

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

  // Manejar retorno de pago exitoso de Stripe
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const paymentSuccess = urlParams.get('payment_success') === 'true';
    const sessionId = urlParams.get('session_id');

    if (paymentSuccess && sessionId) {
      // Verificar el pago con el backend
      PlanService.verificarSesionStripe(sessionId)
        .then(async (response) => {
          if (response.plan_activated || response.payment_status === 'paid') {
            // Refrescar el plan del usuario
            await refrescarPlan?.();

            // Guardar datos para el modal de felicitación
            sessionStorage.setItem('payment_success', JSON.stringify({
              planName: response.plan || 'Premium',
              planIcon: '🎉',
              features: ['Acceso completo al sistema'],
            }));

            // Recargar la página para mostrar el modal
            window.location.href = '/';
          }
        })
        .catch((err) => {
          console.error('Error verificando pago:', err);
        });

      // Limpiar URL
      window.history.replaceState({}, document.title, '/');
    }
  }, [location.search, refrescarPlan]);

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
      datos_rutina: selectedExercises.map((e, idx) => ({
        id: Date.now() + idx,
        ejercicio_id: e.id,
        nombre: e.nombre,
        url: e.url,
        repeticiones: 12,
        series: 3,
        descanso: 60
      }))
    };

    try {
      const created = await RoutineService.create(payload);
      // Preparar array de ejercicios con datos completos
      const ejerciciosArray = selectedExercises.map((e, idx) => ({
        id: e.id || Date.now() + idx,
        ejercicio_id: e.id,
        nombre: e.nombre,
        url: e.url,
        repeticiones: 12,
        series: 3,
        descanso: 60
      }));

      const item = {
        id: created.id || Date.now(),
        nombre: created.nombre || payload.nombre,
        categoria: (created.categoria || payload.categoria) === 'fisioterapia' ? 'Fisioterapia' : 'Gimnasio',
        parte: created.parte_cuerpo || payload.parte_cuerpo,
        ejercicios: ejerciciosArray.length, // Para mostrar en la UI
        duracion: (created.duracion_minutos ? `${created.duracion_minutos} min` : `${payload.duracion_minutos || newRutinaDuracion} min`),
        duracion_minutos: parseInt(newRutinaDuracion) || 45,
        progreso: created.progreso ?? 0,
        datos_rutina: ejerciciosArray // Array completo para el entrenamiento
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
    // Buscar la rutina completa para pasar los datos
    const rutina = rutinas.find(r => r.id === rutinaId);
    if (rutina) {
      // Navegar a la página de entrenamiento interactivo con todos los datos
      // Usar datos_rutina que tiene el array completo de ejercicios
      const ejerciciosData = Array.isArray(rutina.datos_rutina)
        ? rutina.datos_rutina
        : (Array.isArray(rutina.ejercicios) ? rutina.ejercicios : []);

      navigate(`/rutina/${rutinaId}/workout`, {
        state: {
          routine: {
            id: rutina.id,
            nombre: rutina.nombre,
            duracion: rutina.duracion_minutos || parseInt(rutina.duracion) || 45,
            categoria: rutina.categoria,
            ejercicios: ejerciciosData,
          }
        }
      });
    } else {
      // Fallback si no encontramos la rutina
      navigate(`/rutinas/${rutinaId}`);
    }
  };

  // Eliminar rutina
  const handleDeleteRutina = async (rutinaId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta rutina?')) {
      try {
        await RoutineService.delete(rutinaId);
        setRutinas(prev => prev.filter(r => r.id !== rutinaId));
      } catch (err) {
        console.error('Error eliminando rutina:', err);
      }
    }
  };

  // Abrir modal de edición
  const handleEditRutina = async (rutinaId) => {
    const rutina = rutinas.find(r => r.id === rutinaId);
    if (rutina) {
      // Primero cargar ejercicios disponibles
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

      // Configurar los datos de edición - usar datos_rutina que tiene el array real
      const ejerciciosArray = Array.isArray(rutina.datos_rutina)
        ? rutina.datos_rutina
        : (Array.isArray(rutina.ejercicios) ? rutina.ejercicios : []);

      setEditingRutina({
        ...rutina,
        duracion_minutos: rutina.duracion_minutos || parseInt(rutina.duracion) || 45,
        datos_rutina: ejerciciosArray
      });
      setShowEditModal(true);
    }
  };

  // Guardar cambios de edición
  const handleSaveEdit = async () => {
    if (!editingRutina) return;
    try {
      const ejerciciosArray = editingRutina.datos_rutina || [];
      const updated = await RoutineService.update(editingRutina.id, {
        nombre: editingRutina.nombre,
        duracion_minutos: editingRutina.duracion_minutos,
        duracion: `${editingRutina.duracion_minutos} minutos`,
        categoria: editingRutina.categoria,
        datos_rutina: ejerciciosArray
      });
      if (updated) {
        setRutinas(prev => prev.map(r => r.id === updated.id ? {
          ...r,
          ...updated,
          ejercicios: ejerciciosArray.length,
          datos_rutina: ejerciciosArray
        } : r));
      }
      setShowEditModal(false);
      setEditingRutina(null);
    } catch (err) {
      console.error('Error guardando cambios:', err);
    }
  };

  // Quitar ejercicio de rutina en edición
  const handleRemoveExerciseFromEdit = (ejercicioId) => {
    if (!editingRutina) return;
    const datos_rutina = (editingRutina.datos_rutina || []).filter(e =>
      String(e.id) !== String(ejercicioId) && String(e.ejercicio_id) !== String(ejercicioId)
    );
    setEditingRutina({ ...editingRutina, datos_rutina });
  };

  // Agregar ejercicio a rutina en edición
  const handleAddExerciseToEdit = (ejercicio) => {
    if (!editingRutina) return;
    const datos_rutina = [...(editingRutina.datos_rutina || [])];
    // Verificar duplicados por ID o por nombre
    const exists = datos_rutina.some(e =>
      e.ejercicio_id === ejercicio.id ||
      e.id === ejercicio.id ||
      e.nombre?.toLowerCase() === ejercicio.nombre?.toLowerCase()
    );
    if (!exists) {
      datos_rutina.push({
        id: Date.now(),
        ejercicio_id: ejercicio.id,
        nombre: ejercicio.nombre,
        url: ejercicio.url,
        repeticiones: 12,
        series: 3,
        descanso: 60
      });
      setEditingRutina({ ...editingRutina, datos_rutina });
    } else {
      // Opcional: mostrar alerta
      alert('Este ejercicio ya está en la rutina');
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-100 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className={`mb-8 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-800">
                Dashboard
              </h1>
            </div>
            <p className="text-gray-500">
              Bienvenido de nuevo. Aquí está tu resumen.
            </p>
          </div>

          {/* Stats Cards con animaciones escalonadas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
            <div className={`bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20 transition-all duration-700 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '100ms' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs text-white/80 font-medium">Esta semana</span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{estadisticas.entrenamientosSemanales}</p>
              <p className="text-sm text-white/80">Entrenamientos</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-white/90 font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+2 vs semana pasada</span>
              </div>
            </div>

            <div className={`bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20 transition-all duration-700 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.02] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '200ms' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs text-white/80 font-medium">Total</span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{estadisticas.minutosTotal}</p>
              <p className="text-sm text-white/80">Minutos activos</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-white/90 font-medium">
                <Zap className="w-3.5 h-3.5" />
                <span>Excelente ritmo</span>
              </div>
            </div>

            <div className={`bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/20 transition-all duration-700 hover:shadow-xl hover:shadow-orange-500/30 hover:scale-[1.02] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '300ms' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs text-white/80 font-medium">Quemadas</span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{estadisticas.caloriasQuemadas}</p>
              <p className="text-sm text-white/80">Calorías</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-white/90 font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Buen progreso</span>
              </div>
            </div>

            <div className={`bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-purple-500/20 transition-all duration-700 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-[1.02] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '400ms' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs text-white/80 font-medium">Racha</span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{estadisticas.racha}</p>
              <p className="text-sm text-white/80">Días consecutivos</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-white/90 font-medium">
                <Award className="w-3.5 h-3.5" />
                <span>Récord personal</span>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Gráfica de comportamiento */}
            <div className={`lg:col-span-2 bg-white rounded-2xl shadow-md p-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`} style={{ transitionDelay: '500ms' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  Actividad Semanal
                </h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm text-gray-500">Últimos 7 días</span>
                </div>
              </div>

              {/* Gráfica de barras con colores variados */}
              <div className="flex items-end justify-between h-48 gap-3">
                {datosGrafica.map((dato, index) => {
                  const altura = (dato.minutos / maxMinutos) * 100;
                  const isHovered = hoveredBar === index;
                  const barColors = [
                    'from-blue-400 to-blue-500',
                    'from-emerald-400 to-emerald-500',
                    'from-orange-400 to-orange-500',
                    'from-purple-400 to-purple-500',
                    'from-pink-400 to-pink-500',
                    'from-teal-400 to-teal-500',
                    'from-indigo-400 to-indigo-500'
                  ];
                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center gap-2"
                      onMouseEnter={() => setHoveredBar(index)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      <div className="relative w-full flex items-end justify-center" style={{ height: '160px' }}>
                        <div
                          className={`w-full rounded-lg transition-all duration-500 cursor-pointer bg-gradient-to-t ${barColors[index]} ${isHovered ? 'shadow-lg scale-105' : ''}`}
                          style={{
                            height: mounted ? `${altura}%` : '0%',
                            transitionDelay: `${600 + index * 100}ms`
                          }}
                        >
                          {/* Tooltip */}
                          <div className={`absolute -top-12 left-1/2 transform -translate-x-1/2 transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg">
                              {dato.minutos} min
                            </div>
                          </div>
                        </div>
                      </div>
                      <span className={`text-xs font-medium transition-colors duration-300 ${isHovered ? 'text-gray-800' : 'text-gray-500'}`}>
                        {dato.dia}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Línea de promedio */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                <span className="text-gray-500">Promedio diario: <span className="font-semibold text-gray-800">38 min</span></span>
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <TrendingUp className="w-4 h-4" />
                  +15% esta semana
                </span>
              </div>
            </div>

            {/* Card de explorar ejercicios */}
            <div className={`bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white flex flex-col justify-between transition-all duration-700 hover:shadow-xl hover:scale-[1.02] ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`} style={{ transitionDelay: '600ms' }}>
              <div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                  <Dumbbell className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Explorar Ejercicios
                </h3>
                <p className="text-white/80 text-sm mb-4">
                  Descubre rutinas de gimnasio y fisioterapia
                </p>
                <div className="flex flex-col gap-2 text-sm text-white/70 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-white/50 rounded-full"></div>
                    <span>Más de 50 ejercicios</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-white/50 rounded-full"></div>
                    <span>Guiados por IA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-white/50 rounded-full"></div>
                    <span>Para todos los niveles</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleExplorarEjercicios}
                className="bg-white text-indigo-600 font-semibold py-3 px-4 rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>Explorar Ahora</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sección de rutinas */}
          <div className={`bg-white rounded-2xl shadow-md p-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '700ms' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-purple-600" />
                </div>
                Mis Rutinas
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={openCreateModal}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Crear manual
                </button>
                <button
                  onClick={() => navigate('/rutinas/crear-ia')}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 shadow-md"
                >
                  <Sparkles className="w-4 h-4" />
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
                            {rutina.parte}
                          </span>
                        </div>
                      </div>
                      {/* Botones de editar y eliminar */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditRutina(rutina.id); }}
                          className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors"
                          title="Editar rutina"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteRutina(rutina.id); }}
                          className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                          title="Eliminar rutina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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

          {/* Modal creación manual de rutina - Mejorado */}
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-xl p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Crear nueva rutina (Manual)</h3>
                  <button onClick={closeCreateModal} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input
                      value={newRutinaNombre}
                      onChange={(e) => setNewRutinaNombre(e.target.value)}
                      className="block w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: Cuerpo completo A"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duración (minutos)</label>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={newRutinaDuracion}
                      onChange={(e) => setNewRutinaDuracion(e.target.value)}
                      className="block w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: 45"
                    />
                    <p className="text-xs text-gray-500 mt-1">Escribe cualquier valor entre 1-180</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <select
                      value={newRutinaCategoria}
                      onChange={(e) => setNewRutinaCategoria(e.target.value)}
                      className="block w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Gimnasio">🏋️ Gimnasio</option>
                      <option value="Fisioterapia">💆 Fisioterapia</option>
                      <option value="Todos">📋 Todos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ejercicios seleccionados</label>
                    <div className="p-2.5 border border-gray-300 rounded-lg h-20 overflow-auto bg-gray-50">
                      {selectedExercises.length === 0 ? (
                        <span className="text-sm text-gray-500">Ninguno seleccionado</span>
                      ) : (
                        selectedExercises.map(e => (
                          <div key={e.id} className="text-sm flex items-center justify-between">
                            <span>• {e.nombre}</span>
                            <span className="text-xs text-gray-400">{e.reps || 12} reps</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-700">Seleccionar ejercicios</h4>
                    <span className="text-sm text-gray-500">
                      {selectedExercises.length} ejercicio(s) seleccionado(s)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-auto p-1">
                    {availableExercises.length === 0 ? (
                      <div className="text-sm text-gray-500 col-span-2 text-center py-8">
                        No hay ejercicios cargados. Intenta abrir de nuevo.
                      </div>
                    ) : (
                      availableExercises
                        .filter(ej => {
                          if (newRutinaCategoria === 'Todos') return true;
                          // Filtrar por ID: 1-18 son gimnasio, 19-50 son fisioterapia
                          if (newRutinaCategoria === 'Gimnasio') return ej.id <= 18;
                          if (newRutinaCategoria === 'Fisioterapia') return ej.id > 18;
                          return true;
                        })
                        .map((ej) => {
                          const isSelected = !!selectedExercises.find(s => s.id === ej.id);
                          return (
                            <div
                              key={ej.detalleId || ej.id}
                              className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 ${isSelected
                                ? 'bg-blue-50 border-blue-400 shadow-md'
                                : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow'
                                }`}
                              onClick={() => toggleSelectExercise(ej)}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectExercise(ej)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-800 truncate">{ej.nombre}</div>
                                <div className="text-xs text-gray-500">{ej.descripcion}</div>
                              </div>
                              {ej.url && (
                                <img
                                  src={ej.url}
                                  alt={ej.nombre}
                                  className="w-16 h-12 object-cover rounded-lg flex-shrink-0"
                                />
                              )}
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={closeCreateModal}
                    className="px-6 py-2.5 rounded-lg border-2 border-gray-300 hover:bg-gray-100 font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateRoutine}
                    disabled={selectedExercises.length === 0}
                    className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Guardar rutina ({selectedExercises.length})
                  </button>
                </div>
              </div>
            </div>
          )}
        </div >
      </div >

      {/* Modal de edición de rutina */}
      {
        showEditModal && editingRutina && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Editar rutina</h3>
                <button
                  onClick={() => { setShowEditModal(false); setEditingRutina(null); }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={editingRutina.nombre}
                    onChange={(e) => setEditingRutina({ ...editingRutina, nombre: e.target.value })}
                    className="block w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duración (minutos)</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={editingRutina.duracion_minutos || parseInt(editingRutina.duracion) || 45}
                    onChange={(e) => setEditingRutina({ ...editingRutina, duracion_minutos: parseInt(e.target.value) })}
                    className="block w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select
                    value={editingRutina.categoria}
                    onChange={(e) => setEditingRutina({ ...editingRutina, categoria: e.target.value })}
                    className="block w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Gimnasio">🏋️ Gimnasio</option>
                    <option value="Fisioterapia">💆 Fisioterapia</option>
                  </select>
                </div>
              </div>

              {/* Ejercicios actuales */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-3">Ejercicios en esta rutina ({(editingRutina.datos_rutina || []).length})</h4>
                {(editingRutina.datos_rutina || []).length === 0 ? (
                  <p className="text-gray-500 text-sm">No hay ejercicios en esta rutina</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-auto">
                    {(editingRutina.datos_rutina || []).map((ej, idx) => (
                      <div key={ej.id || idx} className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        {ej.url && <img src={ej.url} alt={ej.nombre} className="w-12 h-10 object-cover rounded" />}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 truncate">{ej.nombre}</div>
                          <div className="text-xs text-gray-500">{ej.repeticiones || 12} reps × {ej.series || 3} series</div>
                        </div>
                        <button
                          onClick={() => handleRemoveExerciseFromEdit(ej.id || ej.ejercicio_id)}
                          className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                          title="Quitar ejercicio"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Agregar más ejercicios */}
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-3">Agregar ejercicios</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-auto">
                  {availableExercises
                    .filter(ej => {
                      // Verificar si ya está en la rutina por ID o por nombre
                      const inRutina = (editingRutina.datos_rutina || []).some(e =>
                        e.ejercicio_id === ej.id ||
                        e.id === ej.id ||
                        e.nombre?.toLowerCase() === ej.nombre?.toLowerCase()
                      );
                      return !inRutina;
                    })
                    .slice(0, 10)
                    .map((ej) => (
                      <div
                        key={ej.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-green-50 hover:border-green-300 transition-colors"
                        onClick={() => handleAddExerciseToEdit(ej)}
                      >
                        {ej.url && <img src={ej.url} alt={ej.nombre} className="w-12 h-10 object-cover rounded" />}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 truncate">{ej.nombre}</div>
                          <div className="text-xs text-gray-500">{ej.descripcion}</div>
                        </div>
                        <Plus className="w-5 h-5 text-green-600" />
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => { setShowEditModal(false); setEditingRutina(null); }}
                  className="px-6 py-2.5 rounded-lg border-2 border-gray-300 hover:bg-gray-100 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium hover:from-green-700 hover:to-emerald-700 transition-all"
                >
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        )
      }
    </>
  );
};

export default Home;