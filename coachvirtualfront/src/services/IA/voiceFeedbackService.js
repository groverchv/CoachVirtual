/**
 * Servicio de voz mejorado para corrección de ejercicios
 * VOZ MASCULINA con actitud de entrenador motivador
 */

// Configuración - VOZ MASCULINA MOTIVADORA
const CONFIG = {
    lang: 'es-ES',
    rate: 1.15,        // Más rápido - actitud energética
    pitch: 0.85,       // Más grave - voz masculina
    volume: 1.0,
    cooldown: 2500,    // Respuesta más rápida
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

// Mensajes predefinidos - ESTILO ENTRENADOR MOTIVADOR
export const VOICE_MESSAGES = {
    // Inicio de ejercicio
    start: {
        generic: '¡Vamos! ¡A darle con todo!',
        squat: '¡Posición! Pies firmes, espalda recta. ¡Ahora!',
        pushup: '¡Al suelo! Posición de plancha, manos bien puestas.',
        plank: '¡Como una tabla! Cuerpo recto, sin excusas.',
        curl: '¡Codos pegados! Controla cada repetición.',
        stretch: 'Respira hondo y estira. ¡Tú puedes!',
    },

    // Correcciones de postura - DIRECTO Y FIRME
    corrections: {
        // Espalda
        backBent: '¡Espalda recta! ¡Vamos!',
        backArched: '¡No arquees la espalda!',
        shouldersUneven: '¡Hombros nivelados!',

        // Caderas
        hipsTooLow: '¡Sube esa cadera!',
        hipsTooHigh: '¡Baja la cadera!',
        hipsUneven: '¡Caderas firmes y niveladas!',

        // Rodillas
        kneesPastToes: '¡Rodillas atrás! No pases los pies.',
        kneesNotBent: '¡Más flexión de rodillas!',
        kneesTooWide: '¡Acerca las rodillas!',

        // Brazos
        elbowsFlared: '¡Codos al cuerpo!',
        armsNotStraight: '¡Brazos rectos!',
        wristsNotAligned: '¡Muñecas alineadas!',

        // Cabeza y cuello
        headForward: '¡Cabeza atrás!',
        headTilted: '¡Cabeza recta!',
        neckStrained: '¡Relaja el cuello!',

        // General
        leaningForward: '¡No te inclines!',
        leaningBack: '¡Mantén la posición!',
        offBalance: '¡Equilibrio! ¡Estabiliza!',
    },

    // Ánimo - ESTILO MOTIVADOR INTENSO
    encouragement: {
        good: '¡Eso es! ¡Sigue así!',
        perfect: '¡Perfecto! ¡Así se hace!',
        almostThere: '¡Ya casi! ¡No pares!',
        keepGoing: '¡Dale duro! ¡No aflojes!',
        greatForm: '¡Excelente forma! ¡Mantén!',
        halfwayThere: '¡Mitad del camino! ¡Vamos!',
        lastRep: '¡Última! ¡Con todo!',
        completed: '¡Completado! ¡Eres una máquina!',
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

    // Instrucciones de fase - DIRECTAS
    phases: {
        inhale: '¡Inhala!',
        exhale: '¡Exhala!',
        hold: '¡Mantén!',
        relax: '¡Relaja!',
        down: '¡Baja!',
        up: '¡Sube!',
        squeeze: '¡Aprieta!',
        extend: '¡Extiende!',
        bend: '¡Flexiona!',
    },
};

/**
 * Inicializar el servicio de voz - PREFERIR VOZ MASCULINA
 */
export function initVoiceService(options = {}) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        console.warn('Speech synthesis not available');
        return false;
    }

    // Aplicar opciones
    Object.assign(CONFIG, options);

    // Buscar voz MASCULINA en español
    const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const spanishVoices = voices.filter(v => v.lang.startsWith('es'));

        // Priorizar voces masculinas (buscar por nombre común de voces masculinas)
        const maleKeywords = ['male', 'hombre', 'jorge', 'pablo', 'david', 'diego', 'carlos', 'andres', 'microsoft pablo', 'google español'];
        const femaleKeywords = ['female', 'mujer', 'paulina', 'monica', 'conchita', 'lucia', 'maria'];

        // Intentar encontrar voz masculina
        let selectedVoice = spanishVoices.find(v => {
            const nameLower = v.name.toLowerCase();
            const isMale = maleKeywords.some(k => nameLower.includes(k));
            const isFemale = femaleKeywords.some(k => nameLower.includes(k));
            return isMale && !isFemale;
        });

        // Si no hay masculina explícita, buscar una que NO sea femenina
        if (!selectedVoice) {
            selectedVoice = spanishVoices.find(v => {
                const nameLower = v.name.toLowerCase();
                return !femaleKeywords.some(k => nameLower.includes(k));
            });
        }

        // Fallback a cualquier voz española o la primera disponible
        voiceInstance = selectedVoice || spanishVoices[0] || voices[0];

        console.log('🎤 Voz seleccionada:', voiceInstance?.name || 'default');
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
