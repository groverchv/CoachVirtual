// src/pages/GestionarAlerta/AlertNotifier.jsx
import { useEffect, useRef, useState } from "react";
import { AlertaService } from "../../services/AlertaService";
import { useNavigate } from "react-router-dom";

const SOUND_PREF_KEY = "alerts:soundEnabled";

function canNotify() {
  return typeof window !== "undefined" && "Notification" in window;
}
function requestNotifyPermission() {
  if (!canNotify()) return Promise.resolve("denied");
  if (Notification.permission === "granted") return Promise.resolve("granted");
  if (Notification.permission === "denied") return Promise.resolve("denied");
  return Notification.requestPermission();
}

const fmtDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

export default function AlertNotifier({
  intervalMs = 10000,
  maxVisible = 4,
  cardTTLms = 10000, // ← duración de la tarjeta (10s por defecto)
}) {
  const navigate = useNavigate();

  const audioRef = useRef(null);
  const lastIdRef = useRef(0);
  const timerRef = useRef(null);
  const autoUnlockListenerRef = useRef(null);

  // Estado de tarjetas (panel derecho)
  const [cards, setCards] = useState([]);

  // Preferencia guardada (no volver a mostrar el botón)
  const [soundPref, setSoundPref] = useState(
    typeof window !== "undefined" && localStorage.getItem(SOUND_PREF_KEY) === "1"
  );
  // ¿Audio realmente desbloqueado en ESTA carga de pestaña?
  const [soundUnlocked, setSoundUnlocked] = useState(false);

  const [notifyGranted, setNotifyGranted] = useState(
    typeof Notification !== "undefined" && Notification.permission === "granted"
  );

  // ---- helpers UI ----
  const pushCard = (a) => {
    const key = `${a.id}-${Date.now()}`;
    setCards((prev) => [{ ...a, _key: key }, ...prev].slice(0, maxVisible));
    // ⬇️ ahora dura `cardTTLms` (10s)
    setTimeout(() => {
      setCards((prev) => prev.filter((c) => c._key !== key));
    }, cardTTLms);
  };

  // ---- sonido ----
  const doUnlockSound = async () => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/sounds/alert.mp3");
      audioRef.current.preload = "auto";
    }
    await audioRef.current.play();
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setSoundUnlocked(true);
  };

  const handleEnableSound = async () => {
    try {
      await doUnlockSound();
      localStorage.setItem(SOUND_PREF_KEY, "1");
      setSoundPref(true);
    } catch {
      setSoundPref(false);
      setSoundUnlocked(false);
    }
  };

  const setupAutoUnlock = () => {
    if (!soundPref || soundUnlocked) return;
    const listener = async () => {
      try {
        await doUnlockSound();
      } finally {
        if (autoUnlockListenerRef.current) {
          window.removeEventListener("pointerdown", autoUnlockListenerRef.current, true);
          autoUnlockListenerRef.current = null;
        }
      }
    };
    autoUnlockListenerRef.current = listener;
    window.addEventListener("pointerdown", listener, true);
  };

  // ---- notificación de nueva alerta ----
  const notifyOnce = (a) => {
    pushCard(a);

    // Notificación nativa (no controlamos su duración)
    if (canNotify() && Notification.permission === "granted") {
      if (document.visibilityState === "hidden") {
        new Notification("Nueva alerta", {
          body: `${a.mensaje} — ${fmtDateTime(a.created_at || a.fecha)}`,
          tag: "alerta",
          renotify: false,
        });
      }
    }

    // Sonido
    if (soundUnlocked) {
      audioRef.current?.play().catch(() => {});
    }

    // Vibración
    if (navigator.vibrate) navigator.vibrate([180, 80, 180]);
  };

  // ---- efecto de montaje ----
  useEffect(() => {
    requestNotifyPermission().then((perm) => setNotifyGranted(perm === "granted"));

    audioRef.current = new Audio("/sounds/alert.mp3");
    audioRef.current.preload = "auto";

    setupAutoUnlock();

    let cancelled = false;

    (async () => {
      try {
        const allAsc = await AlertaService.listMineSince(null);
        if (!cancelled) {
          lastIdRef.current =
            Array.isArray(allAsc) && allAsc.length ? allAsc[allAsc.length - 1].id : 0;
        }
      } catch {
        lastIdRef.current = 0;
      }

      if (!cancelled) {
        timerRef.current = setInterval(async () => {
          try {
            const news = await AlertaService.listMineSince(lastIdRef.current);
            if (Array.isArray(news) && news.length > 0) {
              news.forEach((a) => notifyOnce(a));
              lastIdRef.current = news[news.length - 1].id;
            }
          } catch {
            // reintenta en el siguiente tick
          }
        }, intervalMs);
      }
    })();

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoUnlockListenerRef.current) {
        window.removeEventListener("pointerdown", autoUnlockListenerRef.current, true);
        autoUnlockListenerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, soundPref]);

  return (
    <>
      {/* Panel lateral derecho */}
      <div className="fixed right-4 top-20 z-[1000] flex w-96 max-w-[92vw] flex-col gap-3">
        {cards.map((a) => (
          <div
            key={a._key}
            className="translate-x-0 animate-[slideIn_.25s_ease-out] rounded-2xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur shadow-xl"
            style={{
              animationName: "slideIn",
              animationDuration: "250ms",
              animationTimingFunction: "ease-out",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm uppercase tracking-wide text-white/70">
                  Nueva alerta
                </div>
                <div className="mt-1 font-semibold">{a.mensaje}</div>
                <div className="text-xs text-white/60">
                  {fmtDateTime(a.created_at || a.fecha)}
                </div>
              </div>
              <button
                onClick={() =>
                  setCards((prev) => prev.filter((c) => c._key !== a._key))
                }
                className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => navigate("/mis-alertas")}
                className="rounded-xl border border-white/30 bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"
              >
                Ver mis alertas
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Botón: SOLO si nunca lo habilitó antes */}
      {!soundPref && (
        <div className="fixed bottom-3 right-3 z-[1000]">
          <button
            onClick={handleEnableSound}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-white shadow hover:bg-emerald-700"
            title="Habilita sonido de alertas"
          >
            🔊 Habilitar sonido
          </button>
        </div>
      )}

      {/* Keyframes para animación */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(16px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
