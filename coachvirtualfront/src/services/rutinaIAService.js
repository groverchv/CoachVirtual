import { fetchGroqCompletion } from './groqClient';

/**
 * Servicio para generar rutinas con IA usando Groq
 */

/**
 * Obtiene todos los ejercicios disponibles del backend
 */
export async function obtenerEjerciciosDisponibles() {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/ejercicios-disponibles/`);
    if (!response.ok) {
        throw new Error('Error al obtener ejercicios');
    }
    const data = await response.json();
    return data;
}

/**
 * Construye el prompt para Groq basado en las respuestas del usuario
 */
function construirPrompt(respuestas, ejercicios) {
    const { objetivo, nivel, diasSemana, duracion, areas, limitaciones } = respuestas;

    // Filtrar ejercicios por áreas seleccionadas
    const ejerciciosFiltrados = ejercicios.todos.filter(ej => {
        if (areas.length === 0) return true;
        return areas.some(area =>
            ej.musculo.toLowerCase().includes(area.toLowerCase())
        );
    });

    // Limitar a 30 ejercicios para no sobrecargar el prompt
    const ejerciciosLimitados = ejerciciosFiltrados.slice(0, 30);
    
    // Crear lista simplificada de ejercicios para el prompt
    const ejerciciosTexto = ejerciciosLimitados.map(ej => 
        `- ${ej.nombre} (ID: ${ej.id}, Músculo: ${ej.musculo}, URL: ${ej.url || ''})`
    ).join('\n');

    const prompt = `Eres un entrenador personal experto certificado. Genera una rutina de entrenamiento personalizada en formato JSON.

DATOS DEL USUARIO:
- Objetivo principal: ${objetivo}
- Nivel de experiencia: ${nivel}
- Días disponibles por semana: ${diasSemana}
- Duración por sesión: ${duracion} minutos
- Áreas a enfocar: ${areas.length > 0 ? areas.join(', ') : 'Cuerpo completo'}
${limitaciones ? `- Limitaciones/Lesiones: ${limitaciones}` : ''}

EJERCICIOS DISPONIBLES (USA SOLO ESTOS):
${ejerciciosTexto}

INSTRUCCIONES IMPORTANTES:
1. Crea EXACTAMENTE ${diasSemana} días de entrenamiento
2. Cada día debe tener un nombre descriptivo (ej: "Día 1: Pecho y Tríceps", "Día 2: Piernas")
3. La duración total de cada sesión debe ser aproximadamente ${duracion} minutos
4. SOLO usa ejercicios de la lista proporcionada arriba (copia exactamente el ID, nombre y URL)
5. IMPORTANTE: Debes incluir el campo "url" para cada ejercicio, copiándolo de la lista
6. Asigna series y repeticiones apropiadas según el nivel y objetivo
7. Distribuye los grupos musculares equilibradamente
8. Si hay limitaciones, evita ejercicios que puedan agravar la lesión
9. Para principiantes: 2-3 series de 10-15 reps
10. Para intermedios: 3-4 series de 8-12 reps
11. Para avanzados: 4-5 series de 6-10 reps

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional.

FORMATO DE RESPUESTA (JSON):
{
  "nombre": "Nombre descriptivo de la rutina",
  "descripcion": "Breve descripción de la rutina (1-2 frases)",
  "duracion": ${duracion},
  "categoria": "Gimnasio o Fisioterapia",
  "diasSemana": ${diasSemana},
  "dias": [
    {
      "numero": 1,
      "nombre": "Día 1: Nombre descriptivo",
      "ejercicios": [
        {
          "id": 1,
          "nombre": "Nombre del ejercicio",
          "url": "URL del ejercicio del backend",
          "series": 4,
          "repeticiones": "8-12",
          "descanso": "60-90 seg"
        }
      ]
    }
  ]
}`;

    return prompt;
}

/**
 * Genera una rutina usando Groq AI
 */
export async function generarRutinaConIA(respuestas) {
    try {
        // 1. Obtener ejercicios disponibles
        const ejerciciosData = await obtenerEjerciciosDisponibles();

        // 2. Construir prompt
        const prompt = construirPrompt(respuestas, ejerciciosData);

        // 3. Llamar a Groq
        const respuestaIA = await fetchGroqCompletion({
            prompt,
            model: 'llama-3.1-8b-instant' // Modelo compatible y rápido
        });

        // 4. Parsear JSON
        // Limpiar posibles marcadores de código
        let jsonLimpio = respuestaIA.trim();
        if (jsonLimpio.startsWith('```json')) {
            jsonLimpio = jsonLimpio.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
        } else if (jsonLimpio.startsWith('```')) {
            jsonLimpio = jsonLimpio.replace(/```\n?/g, '');
        }

        const rutina = JSON.parse(jsonLimpio);

        // 5. Validar estructura
        if (!rutina.dias || rutina.dias.length === 0) {
            throw new Error('La IA no generó días de entrenamiento');
        }

        return {
            success: true,
            rutina,
            prompt: prompt // Para debugging
        };

    } catch (error) {
        console.error('Error al generar rutina:', error);
        return {
            success: false,
            error: error.message,
            fallback: generarRutinaFallback(respuestas)
        };
    }
}

/**
 * Rutina de fallback en caso de error con la IA
 */
function generarRutinaFallback(respuestas) {
    const { diasSemana, duracion } = respuestas;

    return {
        nombre: `Rutina ${diasSemana} días`,
        descripcion: 'Rutina generada automáticamente (modo fallback)',
        duracion: parseInt(duracion),
        categoria: 'Gimnasio',
        diasSemana,
        dias: Array.from({ length: diasSemana }, (_, i) => ({
            numero: i + 1,
            nombre: `Día ${i + 1}: Cuerpo completo`,
            ejercicios: []
        }))
    };
}

/**
 * Guarda la rutina generada usando el mismo formato que la creación manual
 */
export async function guardarRutinaGenerada(rutina) {
    // Convertir al formato que usa RoutineService.create()
    const datosRutina = rutina.dias.flatMap(dia =>
        dia.ejercicios.map(ej => ({
            id: ej.id,
            nombre: ej.nombre,
            url: ej.url || '',
            series: ej.series,
            repeticiones: ej.repeticiones,
            descanso: ej.descanso
        }))
    );

    const payload = {
        nombre: rutina.nombre,
        duracion_minutos: rutina.duracion || 45,
        categoria: (rutina.categoria || 'Gimnasio').toLowerCase(),
        parte_cuerpo: rutina.descripcion || 'Cuerpo completo',
        datos_rutina: datosRutina
    };

    // Usar la misma API que la creación manual
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/rutinas/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        // Si falla, guardar en localStorage como fallback
        const raw = localStorage.getItem('cv_rutinas');
        const list = raw ? JSON.parse(raw) : [];
        const id = Date.now();
        const item = { id, ...payload };
        list.unshift(item);
        localStorage.setItem('cv_rutinas', JSON.stringify(list));
        return item;
    }

    return await response.json();
}
