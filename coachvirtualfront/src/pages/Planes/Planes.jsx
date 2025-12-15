import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAuth } from '../../auth/useAuth';
import PlanService from '../../services/PlanService';
import api from '../../api/api';
import { Crown, Check, X, Clock, CreditCard } from 'lucide-react';

export default function Planes() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { planActual, refrescarPlan } = useSubscription();
  const [loading, setLoading] = useState(null);
  const [loadingPlanes, setLoadingPlanes] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [diasRestantes, setDiasRestantes] = useState(null);
  const [planes, setPlanes] = useState([]);

  // Cargar planes desde la API
  useEffect(() => {
    const cargarPlanes = async () => {
      try {
        setLoadingPlanes(true);
        const response = await api.get('/suscripciones/tipos-plan/');
        setPlanes(response.data.planes || []);
      } catch (err) {
        console.error('Error cargando planes:', err);
        // Usar planes por defecto si falla la API
        setPlanes([
          { id: 1, clave: 'gratis', nombre: 'Gratis', precio: 0, icono: '🆓', color: 'from-gray-400 to-gray-500', minutos_por_dia: 15, feedback_voz: false, analisis_angulos: false, historial_dias: 0, con_anuncios: true, popular: false },
          { id: 2, clave: 'basico', nombre: 'Básico', precio: 25, icono: '⭐', color: 'from-blue-500 to-blue-600', minutos_por_dia: 60, feedback_voz: true, analisis_angulos: false, historial_dias: 7, con_anuncios: true, popular: true },
          { id: 3, clave: 'premium', nombre: 'Premium', precio: 49, icono: '👑', color: 'from-purple-500 to-pink-600', minutos_por_dia: -1, feedback_voz: true, analisis_angulos: true, historial_dias: -1, con_anuncios: false, popular: false },
        ]);
      } finally {
        setLoadingPlanes(false);
      }
    };
    cargarPlanes();
  }, []);

  // Calcular días restantes del trial o plan
  useEffect(() => {
    if (planActual?.fecha_expiracion) {
      const expiracion = new Date(planActual.fecha_expiracion);
      const hoy = new Date();
      const diferencia = Math.ceil((expiracion - hoy) / (1000 * 60 * 60 * 24));
      setDiasRestantes(diferencia > 0 ? diferencia : 0);
    }
  }, [planActual]);

  // Verificar parámetros de retorno de Stripe
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('success') === 'true';
    const paymentCanceled = urlParams.get('canceled') === 'true';
    const sessionId = urlParams.get('session_id');

    if (paymentSuccess && sessionId) {
      verificarPagoStripe(sessionId);
    } else if (paymentCanceled) {
      setError('Pago cancelado. No se realizó ningún cargo.');
    }

    // Limpiar URL
    if (paymentSuccess || paymentCanceled) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const verificarPagoStripe = async (sessionId) => {
    try {
      const response = await PlanService.verificarSesionStripe(sessionId);
      if (response.plan_activated || response.payment_status === 'paid') {
        // Refrescar el plan para obtener detalles actualizados
        await refrescarPlan?.();

        // Obtener nombre del plan activado
        const planActivado = response.plan || planActual?.plan_actual || 'premium';
        const planInfo = planes.find(p => p.clave === planActivado);

        // Crear notificación de felicitación
        try {
          await api.post('/alertas/', {
            mensaje: `🎉 ¡Felicidades! Has activado el plan ${planInfo?.nombre || planActivado.toUpperCase()}. Ahora tienes acceso a: ${planInfo?.minutos_por_dia === -1 ? 'Tiempo ilimitado' : `${planInfo?.minutos_por_dia} min/día`}, ${planInfo?.feedback_voz ? 'feedback con voz' : ''}, ${planInfo?.analisis_angulos ? 'análisis de ángulos' : ''}. ¡Disfruta tu entrenamiento! 💪`,
            estado: true,
          });
        } catch (notifError) {
          console.warn('No se pudo crear notificación:', notifError);
        }

        // Guardar en sessionStorage para mostrar en Home
        sessionStorage.setItem('payment_success', JSON.stringify({
          planName: planInfo?.nombre || planActivado,
          planIcon: planInfo?.icono || '🎉',
          features: [
            planInfo?.minutos_por_dia === -1 ? 'Tiempo ilimitado de ejercicio' : `${planInfo?.minutos_por_dia} minutos por día`,
            planInfo?.feedback_voz ? 'Feedback con voz' : null,
            planInfo?.analisis_angulos ? 'Análisis de ángulos' : null,
            planInfo?.historial_dias === -1 ? 'Historial ilimitado' : planInfo?.historial_dias > 0 ? `${planInfo?.historial_dias} días de historial` : null,
            !planInfo?.con_anuncios ? 'Sin anuncios' : null,
          ].filter(Boolean),
        }));

        // Redirigir a la página de inicio
        navigate('/');
      }
    } catch (err) {
      console.error('Error verificando pago:', err);
      setError('Hubo un problema verificando tu pago. Por favor contacta soporte.');
    }
  };

  const handlePagarStripe = async (planClave) => {
    if (planClave === 'gratis') return;

    // Verificar autenticación primero
    if (!isAuthenticated) {
      setError('Debes iniciar sesión para realizar un pago');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      return;
    }

    setLoading(planClave);
    setError(null);

    try {
      const response = await PlanService.iniciarPagoStripe(planClave);
      if (response?.url) {
        window.location.href = response.url;
      } else {
        throw new Error('No se pudo obtener la URL de pago');
      }
    } catch (err) {
      console.error('Error iniciando pago:', err);
      const errorMsg = err.message || 'Error al iniciar el proceso de pago';
      setError(errorMsg);
      setLoading(null);
    }
  };

  const currentPlanKey = planActual?.plan_actual || 'gratis';

  if (loadingPlanes) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-white mt-4">Cargando planes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 sm:py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4">
            Elige tu Plan
          </h1>
          <p className="text-lg sm:text-xl text-gray-300">
            Mejora tu entrenamiento con Coach Virtual
          </p>

          {/* Success message */}
          {success && (
            <div className="mt-6 bg-green-500/20 border border-green-400 rounded-xl p-4 max-w-2xl mx-auto backdrop-blur-sm">
              <p className="text-green-200 font-semibold flex items-center justify-center gap-2">
                <Check className="w-5 h-5" /> {success}
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-6 bg-red-500/20 border border-red-400 rounded-xl p-4 max-w-2xl mx-auto backdrop-blur-sm">
              <p className="text-red-200 font-semibold flex items-center justify-center gap-2">
                <X className="w-5 h-5" /> {error}
              </p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-sm text-red-300 underline hover:text-red-100"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Current plan badge */}
          <div className="mt-8 inline-flex flex-col items-center">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <p className="text-sm text-gray-400 mb-2">Tu plan actual:</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {planes.find(p => p.clave === currentPlanKey)?.nombre || 'Gratis'}
              </p>
              {diasRestantes !== null && diasRestantes > 0 && currentPlanKey !== 'gratis' && (
                <div className="mt-3 flex items-center justify-center gap-2 text-yellow-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{diasRestantes} días restantes</span>
                </div>
              )}
              {diasRestantes === 0 && currentPlanKey !== 'gratis' && (
                <div className="mt-3 flex items-center justify-center gap-2 text-red-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Plan expirado</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Plan Cards - Dynamic from API */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {planes.map((plan) => {
            const isCurrentPlan = currentPlanKey === plan.clave;
            const isLoading = loading === plan.clave;
            const isGratis = plan.precio === 0;

            return (
              <div
                key={plan.id}
                className={`relative bg-white/10 backdrop-blur-lg rounded-3xl overflow-hidden border transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${plan.popular
                  ? 'border-yellow-400/50 ring-2 ring-yellow-400/30'
                  : isCurrentPlan
                    ? 'border-green-400/50'
                    : 'border-white/20'
                  }`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2 text-center text-sm font-bold">
                    🔥 MÁS POPULAR
                  </div>
                )}

                {/* Current plan badge */}
                {isCurrentPlan && (
                  <div className="absolute top-0 right-0 bg-green-500 text-white px-4 py-1 rounded-bl-xl text-sm font-bold">
                    ✓ Tu Plan
                  </div>
                )}

                <div className={`p-6 sm:p-8 ${plan.popular ? 'pt-14' : ''}`}>
                  {/* Icon & Title */}
                  <div className="text-center mb-6">
                    <div className="text-5xl sm:text-6xl mb-3">{plan.icono}</div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white">{plan.nombre}</h3>
                    <div className="mt-4">
                      <span className="text-4xl sm:text-5xl font-extrabold text-white">
                        {plan.precio === 0 ? 'Gratis' : `Bs. ${plan.precio}`}
                      </span>
                      {plan.precio > 0 && (
                        <span className="text-gray-400">/mes</span>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    <FeatureItem
                      active={plan.minutos_por_dia === -1}
                      text={plan.minutos_por_dia === -1 ? 'Tiempo ilimitado' : `${plan.minutos_por_dia} min/día`}
                    />
                    <FeatureItem
                      active={plan.feedback_voz}
                      text="Feedback con voz"
                    />
                    <FeatureItem
                      active={plan.analisis_angulos}
                      text="Análisis de ángulos"
                    />
                    <FeatureItem
                      active={plan.historial_dias === -1 || plan.historial_dias > 0}
                      partial={plan.historial_dias > 0 && plan.historial_dias !== -1}
                      text={plan.historial_dias === -1 ? 'Historial ilimitado' : plan.historial_dias > 0 ? `${plan.historial_dias} días de historial` : 'Sin historial'}
                    />
                    <FeatureItem
                      active={!plan.con_anuncios}
                      text={plan.con_anuncios ? 'Con anuncios' : 'Sin anuncios'}
                    />
                  </ul>

                  {/* CTA Button */}
                  {isGratis ? (
                    <button
                      disabled
                      className="w-full py-4 rounded-xl font-bold text-white bg-gray-600 cursor-not-allowed"
                    >
                      {isCurrentPlan ? 'Plan Actual' : 'Plan Base'}
                    </button>
                  ) : isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full py-4 rounded-xl font-bold text-white bg-green-600 cursor-not-allowed"
                    >
                      ✓ Plan Activo
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePagarStripe(plan.clave)}
                      disabled={isLoading}
                      className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all bg-gradient-to-r ${plan.color} hover:shadow-lg hover:scale-[1.02] disabled:opacity-70 disabled:cursor-wait`}
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Procesando...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          Pagar con Stripe
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-12 sm:mt-16 text-center space-y-2 text-gray-400 text-xs sm:text-sm px-4">
          <p>✨ Todos los planes incluyen acceso a ejercicios de gimnasio y fisioterapia</p>
          <p>💳 Pagos seguros procesados por Stripe</p>
          <p>🔒 Puedes cancelar en cualquier momento</p>
        </div>
      </div>
    </div>
  );
}

// Feature item component
function FeatureItem({ active, partial, text }) {
  return (
    <li className="flex items-start gap-2">
      <span className={`mt-0.5 ${active ? (partial ? 'text-yellow-400' : 'text-green-400') : 'text-red-400'}`}>
        {active ? (partial ? '◐' : '✓') : '✗'}
      </span>
      <span className={`text-sm ${active ? 'text-gray-200' : 'text-gray-500'}`}>
        {text}
      </span>
    </li>
  );
}
