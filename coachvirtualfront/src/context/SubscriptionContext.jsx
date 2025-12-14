import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../auth/useAuth';

const SubscriptionContext = createContext();

// Configuración de planes (debe coincidir con el backend)
export const PLANES = {
  gratis: {
    nombre: 'Gratis',
    precio: 0,
    minutos_por_dia: 15,
    ejercicios_gym: 5,
    ejercicios_fisio: 5,
    feedback_voz: false,
    historial_dias: 0,
    rutinas_guardadas: 0,
    analisis_angulos: false,
    comparacion_profesional: false,
    graficas_progreso: false,
    alertas_personalizadas: false,
    con_anuncios: true,
  },
  basico: {
    nombre: 'Básico',
    precio: 25,
    minutos_por_dia: 45,
    ejercicios_gym: 10,
    ejercicios_fisio: 10,
    feedback_voz: true,
    historial_dias: 7,
    rutinas_guardadas: 3,
    analisis_angulos: false,
    comparacion_profesional: false,
    graficas_progreso: true,
    alertas_personalizadas: false,
    con_anuncios: false,
  },
  premium: {
    nombre: 'Premium',
    precio: 49,
    minutos_por_dia: -1,
    ejercicios_gym: -1,
    ejercicios_fisio: -1,
    feedback_voz: true,
    historial_dias: -1,
    rutinas_guardadas: -1,
    analisis_angulos: true,
    comparacion_profesional: true,
    graficas_progreso: true,
    alertas_personalizadas: true,
    con_anuncios: false,
  }
};

export function SubscriptionProvider({ children }) {
  const { user } = useAuth();
  const [planActual, setPlanActual] = useState(null);
  const [subscriptionsEnabled, setSubscriptionsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      cargarPlanActual();
    }
  }, [user]);

  const cargarPlanActual = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/suscripciones/planes/actual/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPlanActual(data);
        setSubscriptionsEnabled(data.subscriptions_enabled);
      }
    } catch (error) {
      console.error('Error cargando plan:', error);
    } finally {
      setLoading(false);
    }
  };

  // Verificar si el usuario puede usar una característica
  const puedeUsar = (feature) => {
    // Si el sistema no está activado, todo es gratis
    if (!subscriptionsEnabled) return true;
    
    if (!planActual) return false;
    
    const config = planActual.configuracion;
    return config[feature] === true || config[feature] === -1;
  };

  // Obtener configuración del plan actual
  const getPlanConfig = () => {
    if (!planActual) return PLANES.gratis;
    return planActual.configuracion || PLANES.gratis;
  };

  const value = {
    planActual,
    subscriptionsEnabled,
    loading,
    puedeUsar,
    getPlanConfig,
    PLANES,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription debe usarse dentro de SubscriptionProvider');
  }
  return context;
}
