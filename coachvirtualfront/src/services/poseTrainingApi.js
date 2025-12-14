const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Guarda datos de entrenamiento de poses en el backend
 * @param {Object} data - Datos de la pose
 * @returns {Promise<Object>} - Respuesta del servidor
 */
export async function savePoseTrainingData(data) {
  const response = await fetch(`${API_URL}/api/poses/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al guardar datos de entrenamiento');
  }

  return await response.json();
}

/**
 * Obtiene todos los datos de entrenamiento
 * @param {Object} filters - Filtros opcionales (ejercicio, etiqueta)
 * @returns {Promise<Array>} - Array de datos de entrenamiento
 */
export async function getPoseTrainingData(filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_URL}/api/poses/?${params}`);

  if (!response.ok) {
    throw new Error('Error al obtener datos de entrenamiento');
  }

  return await response.json();
}

/**
 * Exporta todos los datos de entrenamiento
 * @returns {Promise<Object>} - Datos exportados
 */
export async function exportPoseTrainingData() {
  const response = await fetch(`${API_URL}/api/poses/export/`);

  if (!response.ok) {
    throw new Error('Error al exportar datos');
  }

  return await response.json();
}
