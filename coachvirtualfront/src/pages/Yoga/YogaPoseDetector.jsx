import { useEffect, useRef, useState } from 'react';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Camera, RefreshCw, XCircle, AlertTriangle } from 'lucide-react';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 segundos entre reintentos

export default function YogaPoseDetector({ onPoseDetected, highlightedAngles = [] }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const poseLandmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const onPoseDetectedRef = useRef(onPoseDetected);
  const highlightedAnglesRef = useRef(highlightedAngles);
  const smoothedLandmarksRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  // Actualizar referencias
  useEffect(() => {
    onPoseDetectedRef.current = onPoseDetected;
    highlightedAnglesRef.current = highlightedAngles;
  }, [onPoseDetected, highlightedAngles]);

  // Función de suavizado exponencial (EMA - Exponential Moving Average)
  const smoothLandmarks = (newLandmarks, smoothingFactor = 0.2) => {
    if (!smoothedLandmarksRef.current) {
      smoothedLandmarksRef.current = newLandmarks;
      return newLandmarks;
    }

    const smoothed = newLandmarks.map((landmark, idx) => {
      const prev = smoothedLandmarksRef.current[idx];
      if (!prev) return landmark;

      return {
        x: prev.x * smoothingFactor + landmark.x * (1 - smoothingFactor),
        y: prev.y * smoothingFactor + landmark.y * (1 - smoothingFactor),
        z: prev.z * smoothingFactor + landmark.z * (1 - smoothingFactor),
        visibility: landmark.visibility
      };
    });

    smoothedLandmarksRef.current = smoothed;
    return smoothed;
  };

  useEffect(() => {
    let stream = null;
    let isMounted = true;

    const initializePoseDetector = async (attempt = 0) => {
      try {
        setIsLoading(true);
        setError(null);
        console.log(`📷 Intento ${attempt + 1} de ${MAX_RETRIES} para inicializar cámara...`);

        // 1. Verificar si hay cámara disponible
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Tu navegador no soporta acceso a la cámara');
        }

        // 2. Solicitar acceso a la cámara PRIMERO (antes de cargar modelos pesados)
        console.log('Solicitando acceso a la cámara...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: 'user',
            frameRate: { ideal: 30, max: 30 }
          }
        });
        console.log('✅ Cámara autorizada');

        // 3. Cargar MediaPipe mientras la cámara está lista
        console.log('Cargando modelo MediaPipe...');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
        );

        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        console.log('✅ MediaPipe cargado');

        poseLandmarkerRef.current = poseLandmarker;

        // 4. Configurar el video y esperar a que esté listo
        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          try {
            // Llamar explícitamente a play() y ESPERAR a que comience
            await videoRef.current.play();
            console.log('✅ Video reproduciendo');

            // Esperar a que el video tenga metadata
            await new Promise((resolve) => {
              if (videoRef.current.readyState >= 2) {
                resolve();
              } else {
                videoRef.current.addEventListener('loadedmetadata', resolve, { once: true });
              }
            });

            console.log(`Video resolution: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
            setIsLoading(false);
            startDetection();
          } catch (err) {
            console.error('Error al iniciar el video:', err);
            setError('No se pudo iniciar la cámara. Intenta recargar la página.');
            setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('❌ Error al inicializar:', err);

        // Mensajes de error más específicos
        let errorMsg = 'Error desconocido';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMsg = '🚫 Permiso de cámara denegado. Por favor, autoriza el acceso a la cámara en tu navegador.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMsg = '📷 No se encontró ninguna cámara en tu dispositivo.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMsg = '⚠️ La cámara está siendo usada por otra aplicación. Cierra otras apps que usen la cámara.';
        } else if (err.message && err.message.includes('soporta')) {
          errorMsg = err.message;
        } else {
          errorMsg = `Error al cargar: ${err.message || 'Verifica tu conexión y permisos de cámara'}`;
        }

        // Reintentar automáticamente si no se alcanzó el máximo de intentos
        if (attempt < MAX_RETRIES - 1 && isMounted) {
          console.log(`🔄 Reintentando en ${RETRY_DELAY / 1000} segundos... (intento ${attempt + 2}/${MAX_RETRIES})`);
          setError(`Conectando cámara... (intento ${attempt + 2}/${MAX_RETRIES})`);
          retryTimeoutRef.current = setTimeout(() => {
            if (isMounted) {
              setRetryCount(attempt + 1);
              initializePoseDetector(attempt + 1);
            }
          }, RETRY_DELAY);
        } else {
          // Máximo de intentos alcanzado, mostrar error final
          setError(errorMsg);
          setIsLoading(false);
        }
      }
    };

    const startDetection = () => {
      if (videoRef.current && canvasRef.current) {
        detectPose();
      }
    };

    // Función para dibujar líneas entre puntos
    const drawLine = (ctx, point1, point2, color = '#00FF00', lineWidth = 8) => {
      ctx.beginPath();
      ctx.moveTo(point1.x, point1.y);
      ctx.lineTo(point2.x, point2.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    };

    // Función para dibujar círculos en puntos clave
    const drawPoint = (ctx, point, color = '#AAFF00', radius = 8) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    };

    // Función para convertir coordenadas normalizadas a píxeles
    const normalizedToPixel = (landmark, width, height) => ({
      x: landmark.x * width,
      y: landmark.y * height,
      z: landmark.z,
      visibility: landmark.visibility
    });

    const detectPose = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || !poseLandmarkerRef.current) return;

      // Ajustar tamaño del canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;

      const detect = async () => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          const startTimeMs = performance.now();
          const results = poseLandmarkerRef.current.detectForVideo(video, startTimeMs);

          // Limpiar canvas
          ctx.clearRect(0, 0, width, height);

          if (results.landmarks && results.landmarks.length > 0) {
            const rawLandmarks = results.landmarks[0];

            // Aplicar suavizado ligero para reducir jitter sin añadir lag
            const landmarks = smoothLandmarks(rawLandmarks, 0.2);

            // Convertir todos los landmarks a coordenadas de píxeles
            const points = landmarks.map(l => normalizedToPixel(l, width, height));

            // Obtener ángulos destacados desde props
            const highlighted = highlightedAnglesRef.current || [];

            // Dibujar conexiones específicas para yoga con colores según validación
            const drawConnection = (indices, isValid = null) => {
              const color = isValid === null ? '#00FF00'
                : isValid ? 'green'
                  : 'red';

              for (let i = 0; i < indices.length - 1; i++) {
                drawLine(ctx, points[indices[i]], points[indices[i + 1]], color, 8);
              }
            };

            // Dibujar todas las conexiones principales con validación
            highlighted.forEach(({ indices, isValid }) => {
              drawConnection(indices, isValid);
            });

            // Si no hay ángulos destacados, dibujar esqueleto básico
            if (highlighted.length === 0) {
              // Brazos
              drawConnection([11, 13, 15]); // Brazo izquierdo
              drawConnection([12, 14, 16]); // Brazo derecho

              // Torso
              drawConnection([11, 12]); // Hombros
              drawConnection([11, 23]); // Lado izquierdo
              drawConnection([12, 24]); // Lado derecho
              drawConnection([23, 24]); // Caderas

              // Piernas
              drawConnection([23, 25, 27]); // Pierna izquierda
              drawConnection([24, 26, 28]); // Pierna derecha
            }

            // Dibujar puntos clave solo si tienen buena visibilidad
            [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach(idx => {
              if (points[idx] && landmarks[idx].visibility > 0.5) {
                drawPoint(ctx, points[idx], '#AAFF00', 8);
              }
            });

            // Dibujar ángulos si están destacados y tienen buena visibilidad
            highlighted.forEach(({ indices, angle, isValid }) => {
              if (angle !== undefined && indices.length >= 3) {
                const middlePoint = points[indices[1]];
                const landmarkVisible = landmarks[indices[1]].visibility > 0.5;

                if (middlePoint && landmarkVisible) {
                  ctx.fillStyle = isValid ? '#00FF00' : '#FF0000';
                  ctx.font = 'bold 28px Arial';
                  ctx.strokeStyle = 'black';
                  ctx.lineWidth = 3;
                  const text = `${Math.round(angle)}°`;
                  const x = middlePoint.x + 15;
                  const y = middlePoint.y + 40;

                  // Contorno negro para mejor legibilidad
                  ctx.strokeText(text, x, y);
                  ctx.fillText(text, x, y);
                }
              }
            });

            // Enviar landmarks suavizados al callback
            if (onPoseDetectedRef.current) {
              onPoseDetectedRef.current(rawLandmarks);
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(detect);
      };

      detect();
    };

    initializePoseDetector(0);

    // Cleanup
    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
      }
      // Reset smoothed landmarks
      smoothedLandmarksRef.current = null;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg text-white">Cargando detector de poses...</p>
          <p className="text-sm text-gray-400 mt-2">Espera un momento</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 bg-red-900 rounded-lg">
        <div className="text-center">
          <p className="text-lg text-white font-semibold">⚠️ Error</p>
          <p className="text-red-200 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-lg overflow-hidden"
      style={{
        minHeight: '400px',
        width: '100%',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d1b4e 50%, #1a1a2e 100%)'
      }}
    >
      {/* Fondo con indicador de cámara cuando no hay video */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 z-0">
        <Camera className="w-16 h-16 mb-4 animate-pulse" />
        <p className="text-sm mb-4">Posiciónate frente a la cámara</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Reintentar cámara
        </button>
      </div>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        width="1280"
        height="720"
        style={{
          width: '100%',
          height: 'auto',
          minHeight: '400px',
          display: 'block',
          transform: 'scaleX(-1)',
          objectFit: 'cover',
          position: 'relative',
          zIndex: 1,
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ transform: 'scaleX(-1)', zIndex: 2 }}
      />
    </div>
  );
}
