import { useSubscription } from '../../context/SubscriptionContext';

export default function Planes() {
  const { planActual, PLANES, subscriptionsEnabled } = useSubscription();

  const planCards = [
    {
      key: 'gratis',
      color: 'gray',
      gradient: 'from-gray-500 to-gray-600',
      icon: '🆓',
    },
    {
      key: 'basico',
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
      icon: '⭐',
      popular: true,
    },
    {
      key: 'premium',
      color: 'purple',
      gradient: 'from-purple-500 to-pink-600',
      icon: '👑',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8 sm:py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
            Elige tu Plan
          </h1>
          <p className="text-lg sm:text-xl text-gray-600">
            Mejora tu entrenamiento con Coach Virtual
          </p>
          
          {!subscriptionsEnabled && (
            <div className="mt-6 bg-yellow-100 border border-yellow-300 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-sm sm:text-base text-yellow-800 font-semibold">
                ⚠️ Sistema de suscripciones en preparación - Por ahora todo es gratis
              </p>
            </div>
          )}
          
          {planActual && (
            <div className="mt-6 bg-white border-2 border-purple-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-gray-600">Tu plan actual:</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-600">{planActual.plan_nombre}</p>
            </div>
          )}
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {planCards.map((card) => {
            const plan = PLANES[card.key];
            const isCurrentPlan = planActual?.plan_actual === card.key;

            return (
              <div
                key={card.key}
                className={`relative bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all hover:scale-105 ${
                  card.popular ? 'ring-4 ring-blue-400' : ''
                }`}
              >
                {/* Popular badge */}
                {card.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1 rounded-bl-lg text-sm font-bold">
                    🔥 Popular
                  </div>
                )}

                {/* Current plan badge */}
                {isCurrentPlan && (
                  <div className="absolute top-0 left-0 bg-green-500 text-white px-4 py-1 rounded-br-lg text-sm font-bold">
                    ✓ Tu plan
                  </div>
                )}

                <div className="p-6 sm:p-8">
                  {/* Icon & Title */}
                  <div className="text-center mb-6">
                    <div className="text-5xl sm:text-6xl mb-3">{card.icon}</div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-800">{plan.nombre}</h3>
                    <div className="mt-4">
                      <span className="text-4xl sm:text-5xl font-extrabold text-gray-900">Bs. {plan.precio}</span>
                      <span className="text-gray-500">/mes</span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start">
                      <span className={`${plan.minutos_por_dia === -1 ? 'text-green-500' : 'text-gray-400'} mr-2`}>
                        {plan.minutos_por_dia === -1 ? '✓' : '⏱️'}
                      </span>
                      <span className="text-sm text-gray-700">
                        {plan.minutos_por_dia === -1 ? 'Tiempo ilimitado' : `${plan.minutos_por_dia} min/día`}
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className={`${plan.feedback_voz ? 'text-green-500' : 'text-red-400'} mr-2`}>
                        {plan.feedback_voz ? '✓' : '✗'}
                      </span>
                      <span className="text-sm text-gray-700">Feedback con voz</span>
                    </li>
                    <li className="flex items-start">
                      <span className={`${plan.analisis_angulos ? 'text-green-500' : 'text-red-400'} mr-2`}>
                        {plan.analisis_angulos ? '✓' : '✗'}
                      </span>
                      <span className="text-sm text-gray-700">Análisis de ángulos</span>
                    </li>
                    <li className="flex items-start">
                      <span className={`${plan.historial_dias === -1 ? 'text-green-500' : plan.historial_dias > 0 ? 'text-yellow-500' : 'text-red-400'} mr-2`}>
                        {plan.historial_dias === -1 ? '✓' : plan.historial_dias > 0 ? '⚠' : '✗'}
                      </span>
                      <span className="text-sm text-gray-700">
                        {plan.historial_dias === -1 ? 'Historial ilimitado' : plan.historial_dias > 0 ? `${plan.historial_dias} días de historial` : 'Sin historial'}
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className={`${plan.con_anuncios ? 'text-red-400' : 'text-green-500'} mr-2`}>
                        {plan.con_anuncios ? '✗' : '✓'}
                      </span>
                      <span className="text-sm text-gray-700">
                        {plan.con_anuncios ? 'Con anuncios' : 'Sin anuncios'}
                      </span>
                    </li>
                  </ul>

                  {/* CTA Button */}
                  <button
                    disabled={!subscriptionsEnabled || isCurrentPlan}
                    className={`w-full py-3 rounded-full font-bold text-white transition-all ${
                      isCurrentPlan
                        ? 'bg-gray-400 cursor-not-allowed'
                        : subscriptionsEnabled
                        ? `bg-gradient-to-r ${card.gradient} hover:shadow-lg hover:scale-105`
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isCurrentPlan ? 'Plan Actual' : subscriptionsEnabled ? 'Seleccionar Plan' : 'Próximamente'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-12 sm:mt-16 text-center text-gray-500 text-xs sm:text-sm px-4">
          <p>✨ Todos los planes incluyen acceso a ejercicios de gimnasio y fisioterapia</p>
          <p className="mt-2">💳 Próximamente: Pagos con QR boliviano, tarjetas y más</p>
        </div>
      </div>
    </div>
  );
}
