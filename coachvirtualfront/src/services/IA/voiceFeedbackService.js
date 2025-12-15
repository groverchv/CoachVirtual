/**
 * Servicio de voz mejorado para corrección de ejercicios
 * Incluye cola de mensajes, prioridades y UI feedback
 */

// Configuración
const CONFIG = {
    lang: 'es-ES',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    cooldown: 3000, // ms entre mensajes del mismo tipo
    priority: {
        critical: 0,   // Errores de postura peligrosos
        correction: 1, // Correcciones normales
        encouragement: 2, // Ánimo
        count: 3,      // Conteo de repeticiones
        info: 4,       // Información general
    }
};

// Estado del servicio
let isInitialized = false;
let isSpeaking = false;
let currentUtterance = null;
let messageQueue = [];
let lastMessageTime = {};
let onSpeakingChange = null;
let voiceInstance = null;

// Mensajes predefinidos por situación
export const VOICE_MESSAGES = {
    // Inicio de ejercicio
    start: {
        generic: '¡Prepárate! Vamos a comenzar el ejercicio.',
        squat: 'Pies al ancho de hombros, espalda recta. ¡Vamos!',
        pushup: 'Posición de plancha, manos debajo de los hombros.',
        plank: 'Mantén el cuerpo recto como una tabla.',
        curl: 'Codos pegados al cuerpo, controla el movimiento.',
        stretch: 'Respira profundo y estira suavemente.',
    },

    // Correcciones de postura
    corrections: {
        // Espalda
        backBent: 'Mantén la espalda recta',
        backArched: 'No arquees demasiado la espalda',
        shouldersUneven: 'Nivela los hombros',

        // Caderas
        hipsTooLow: 'Sube un poco la cadera',
        hipsTooHigh: 'Baja la cadera',
        hipsUneven: 'Mantén las caderas niveladas',

        // Rodillas
        kneesPastToes: 'Las rodillas no deben pasar los pies',
        kneesNotBent: 'Dobla más las rodillas',
        kneesTooWide: 'Acerca un poco las rodillas',

        // Brazos
        elbowsFlared: 'Codos más cerca del cuerpo',
        armsNotStraight: 'Estira los brazos',
        wristsNotAligned: 'Alinea las muñecas con los hombros',

        // Cabeza y cuello
        headForward: 'Lleva la cabeza hacia atrás',
        headTilted: 'Mantén la cabeza recta',
        neckStrained: 'Relaja el cuello',

        // General
        leaningForward: 'No te inclines hacia adelante',
        leaningBack: 'No te recuestes',
        offBalance: 'Mantén el equilibrio',
    },

    // Ánimo
    encouragement: {
        good: '¡Muy bien! Sigue así',
        perfect: '¡Excelente postura!',
        almostThere: '¡Casi lo tienes!',
        keepGoing: '¡Continúa, vas muy bien!',
        greatForm: '¡Gran forma! Mantén esa posición',
        halfwayThere: 'Ya vas a la mitad, ¡ánimo!',
        lastRep: '¡Última repetición!',
        completed: '¡Ejercicio completado! Buen trabajo',
    },

    // Conteo
    counting: {
        one: 'Uno',
        two: 'Dos',
        three: 'Tres',
        four: 'Cuatro',
        five: 'Cinco',
        six: 'Seis',
        seven: 'Siete',
        eight: 'Ocho',
        nine: 'Nueve',
        ten: 'Diez',
    },

    // Instrucciones de fase
    phases: {
        inhale: 'Inhala',
        exhale: 'Exhala',
        hold: 'Mantén',
        relax: 'Relaja',
        down: 'Baja',
        up: 'Sube',
        squeeze: 'Aprieta',
        extend: 'Extiende',
        bend: 'Dobla',
    },
};

/**
 * Inicializar el servicio de voz
 */
export function initVoiceService(options = {}) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        console.warn('Speech synthesis not available');
        return false;
    }

    // Aplicar opciones
    Object.assign(CONFIG, options);

    // Buscar voz en español
    const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        voiceInstance = voices.find(v => v.lang.startsWith('es')) || voices[0];
        isInitialized = true;
    };

    if (window.speechSynthesis.getVoices().length) {
        loadVoices();
    } else {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return true;
}

/**
 * Hablar un mensaje con prioridad
 */
export function speak(message, priority = 'info', force = false) {
    if (!isInitialized) initVoiceService();
    if (!window.speechSynthesis) return;

    const priorityLevel = CONFIG.priority[priority] ?? CONFIG.priority.info;
    const now = Date.now();
    const messageKey = `${priority}:${message}`;

    // Verificar cooldown (excepto para conteo y forzado)
    if (!force && priority !== 'count') {
        const lastTime = lastMessageTime[messageKey] || 0;
        if (now - lastTime < CONFIG.cooldown) return;
    }

    // Agregar a cola
    messageQueue.push({ message, priority: priorityLevel, timestamp: now });
    lastMessageTime[messageKey] = now;

    // Ordenar por prioridad
    messageQueue.sort((a, b) => a.priority - b.priority);

    // Procesar cola
    processQueue();
}

/**
 * Procesar cola de mensajes
 */
function processQueue() {
    if (isSpeaking || messageQueue.length === 0) return;

    const { message } = messageQueue.shift();
    speakNow(message);
}

/**
 * Hablar inmediatamente
 */
function speakNow(message) {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = CONFIG.lang;
    utterance.rate = CONFIG.rate;
    utterance.pitch = CONFIG.pitch;
    utterance.volume = CONFIG.volume;

    if (voiceInstance) {
        utterance.voice = voiceInstance;
    }

    utterance.onstart = () => {
        isSpeaking = true;
        if (onSpeakingChange) onSpeakingChange(true, message);
    };

    utterance.onend = () => {
        isSpeaking = false;
        currentUtterance = null;
        if (onSpeakingChange) onSpeakingChange(false, null);
        // Procesar siguiente mensaje
        setTimeout(processQueue, 200);
    };

    utterance.onerror = () => {
        isSpeaking = false;
        currentUtterance = null;
        if (onSpeakingChange) onSpeakingChange(false, null);
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
}

/**
 * Detener todos los mensajes
 */
export function stopSpeaking() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    messageQueue = [];
    isSpeaking = false;
    if (onSpeakingChange) onSpeakingChange(false, null);
}

/**
 * Registrar callback para cambios de estado
 */
export function onSpeakingStateChange(callback) {
    onSpeakingChange = callback;
}

/**
 * Decir un número (1-20)
 */
export function speakNumber(num) {
    const numbers = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete',
        'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce',
        'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte'];
    const text = numbers[num] || num.toString();
    speak(text, 'count', true);
}

/**
 * Dar corrección de postura
 */
export function speakCorrection(correctionKey) {
    const message = VOICE_MESSAGES.corrections[correctionKey];
    if (message) {
        speak(message, 'correction');
    }
}

/**
 * Dar ánimo
 */
export function speakEncouragement(type = 'good') {
    const message = VOICE_MESSAGES.encouragement[type];
    if (message) {
        speak(message, 'encouragement');
    }
}

/**
 * Instrucción de fase
 */
export function speakPhase(phase) {
    const message = VOICE_MESSAGES.phases[phase];
    if (message) {
        speak(message, 'critical', true);
    }
}

/**
 * Configurar volumen (0-1)
 */
export function setVolume(volume) {
    CONFIG.volume = Math.max(0, Math.min(1, volume));
}

/**
 * Configurar velocidad (0.5-2)
 */
export function setRate(rate) {
    CONFIG.rate = Math.max(0.5, Math.min(2, rate));
}

/**
 * Verificar si está hablando
 */
export function isSpeakingNow() {
    return isSpeaking;
}

export default {
    initVoiceService,
    speak,
    stopSpeaking,
    speakNumber,
    speakCorrection,
    speakEncouragement,
    speakPhase,
    setVolume,
    setRate,
    isSpeakingNow,
    onSpeakingStateChange,
    VOICE_MESSAGES,
};
