import { useEffect, useRef, useState, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import api from "../../api/api";

/* ===== Utilidad para clases ===== */
const cls = (...xs) => xs.filter(Boolean).join(" ");

/* ===== Ocultar icono nativo negro del date (WebKit/Chromium) ===== */
const HideNativeDateStyles = () => (
  <style>{`
    .hide-native-date::-webkit-calendar-picker-indicator {
      opacity: 0;
      display: none;
      pointer-events: none;
    }
    .hide-native-date {
      position: relative;
      background-position: right 0.75rem center;
      background-repeat: no-repeat;
    }
  `}</style>
);

/* ===== Botón de icono seguro ===== */
const SafeIconButton = ({
  onClick,
  className = "",
  title,
  ariaLabel,
  children,
}) => (
  <button
    type="button"
    title={title}
    aria-label={ariaLabel || title}
    onMouseDown={(e) => e.preventDefault()}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick?.(e);
    }}
    className={cls(
      "absolute p-1 rounded-md text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 z-20",
      className
    )}
  >
    {children}
  </button>
);

/* ===== Password input ===== */
const PasswordInput = ({
  value,
  onChange,
  name = "password",
  placeholder = "Contraseña",
  autoComplete = "new-password",
  required = false,
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        name={name}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        className="w-full px-4 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-200/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 shadow"
        placeholder={placeholder}
      />
      <SafeIconButton
        onClick={() => setShow((s) => !s)}
        className="right-3 top-1/2 -translate-y-1/2"
        title={show ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {show ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 3l18 18" />
            <path d="M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 2.42-4.42" />
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.29 20.29 0 0 1 5.06-5.94" />
            <path d="M9.88 4.24A10.88 10.88 0 0 1 12 4c7 0 11 8 11 8a20.27 20.27 0 0 1-3.06 4.2" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </SafeIconButton>
    </div>
  );
};

/* ===== Cerrar al click fuera ===== */
const useClickOutside = (refs, onOutside) => {
  useEffect(() => {
    const handler = (e) => {
      const inside = refs.some(
        (r) => r.current && r.current.contains(e.target)
      );
      if (!inside) onOutside?.();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [refs, onOutside]);
};

/* ===== Select Género (toggle) ===== */
const GenderSelect = ({
  name = "genero",
  value,
  onChange,
  placeholder = "Género",
  options,
}) => {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  useClickOutside([ref], () => setOpen(false));

  const current = options.find((o) => o.value === value);

  const choose = (val) => {
    onChange?.({ target: { name, value: val } });
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="w-full text-left px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 shadow"
        onClick={() => setOpen((s) => !s)}
      >
        <span className={cls(current ? "text-white" : "text-white/80")}>
          {current ? current.label : placeholder}
        </span>
        <span className="float-right opacity-80">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-2xl overflow-hidden">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => choose(o.value)}
              className={cls(
                "w-full text-left px-4 py-2 hover:bg-white/10 text-white",
                value === o.value ? "bg-blue-600" : ""
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ===== Date input nativo (oculta ícono negro nativo) ===== */
const DateInputNative = forwardRef(
  (
    { name = "fecha_nacimiento", valueISO, onChangeISO, minISO, maxISO },
    ref
  ) => {
    const inputRef = useRef(null);

    useEffect(() => {
      if (typeof ref === "function") ref(inputRef.current);
      else if (ref) ref.current = inputRef.current;
    }, [ref]);

    const openPicker = () => {
      try {
        inputRef.current?.showPicker?.();
      } catch {}
      inputRef.current?.focus?.();
    };

    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="date"
          name={name}
          value={valueISO || ""}
          min={minISO}
          max={maxISO}
          onChange={onChangeISO}
          className="hide-native-date w-full px-4 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-200/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 shadow"
        />
        <SafeIconButton
          onClick={openPicker}
          className="right-3 top-1/2 -translate-y-1/2"
          title="Abrir calendario"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </SafeIconButton>
      </div>
    );
  }
);

const Register = ({ signIn, onSuccess, onSwitchToLogin }) => {
  const navigate = useNavigate();
  const { isSuper } = useAuth(); // ← leer rol tras signIn

  const [regData, setRegData] = useState({
    email: "",
    username: "",
    password: "",
    nombre: "",
    apellido: "",
    fecha_nacimiento: "",
    genero: "",
    altura: "",
    peso: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const handleRegChange = (e) =>
    setRegData((s) => ({ ...s, [e.target.name]: e.target.value }));

  // Refs para enfocar en errores
  const refs = {
    email: useRef(null),
    username: useRef(null),
    password: useRef(null),
    nombre: useRef(null),
    apellido: useRef(null),
    fecha_nacimiento: useRef(null),
    altura: useRef(null),
    peso: useRef(null),
  };

  const scrollAndFocus = (el, extra) => {
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      el.focus?.();
      extra?.();
    }, 150);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setOkMsg("");

    const {
      email,
      username,
      password,
      nombre,
      apellido,
      fecha_nacimiento,
      genero,
      altura,
      peso,
    } = regData;

    if (!email.trim()) {
      setError("Falta Email");
      return scrollAndFocus(refs.email.current);
    }
    if (!username.trim()) {
      setError("Falta Usuario");
      return scrollAndFocus(refs.username.current);
    }
    if (!password) {
      setError("Falta Contraseña");
      return scrollAndFocus(refs.password.current);
    }
    if (!nombre.trim()) {
      setError("Falta Nombre");
      return scrollAndFocus(refs.nombre.current);
    }
    if (!apellido.trim()) {
      setError("Falta Apellido");
      return scrollAndFocus(refs.apellido.current);
    }
    if (!fecha_nacimiento) {
      setError("Falta Fecha de Nacimiento");
      return scrollAndFocus(refs.fecha_nacimiento.current, () =>
        refs.fecha_nacimiento.current?.showPicker?.()
      );
    }
    if (!genero) {
      setError("Falta Género");
      return;
    }

    const h = parseFloat(altura);
    if (Number.isNaN(h) || h <= 0) {
      setError("Altura debe ser > 0");
      return scrollAndFocus(refs.altura.current);
    }
    const p = parseFloat(peso);
    if (Number.isNaN(p) || p <= 0) {
      setError("Peso debe ser > 0");
      return scrollAndFocus(refs.peso.current);
    }

    setIsLoading(true);
    try {
      const payload = {
        email: email.trim(),
        username: username.trim(),
        password,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        fecha_nacimiento,
        genero,
        altura: h,
        peso: p,
      };

      await api.post("/usuarios/", payload);

      setOkMsg("¡Cuenta creada! Iniciando sesión...");
      try {
        await signIn(email, password);
        onSuccess?.();

        // Redirección por rol:
        if (isSuper) {
          navigate("/home", { replace: true });
        } else {
          const next = localStorage.getItem("cv.category") ? "/musculo" : "/seleccionar";
          navigate(next, { replace: true });
        }
      } catch {
        setOkMsg("Cuenta creada. Inicia sesión con tus credenciales.");
        onSwitchToLogin?.();
      }
    } catch (err) {
      const msg = err?.response?.data
        ? Object.entries(err.response.data)
            .map(
              ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`
            )
            .join(" | ")
        : err?.message || "Error al registrar la cuenta.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Ocultar ícono nativo del date solo aquí */}
      <HideNativeDateStyles />

      {/* Alertas */}
      {error && (
        <div className="mb-4 bg-red-100/90 border border-red-400 text-red-800 px-4 py-3 rounded-lg text-center shadow">
          {error}
        </div>
      )}
      {okMsg && (
        <div className="mb-4 bg-green-100/90 border border-green-400 text-green-800 px-4 py-3 rounded-lg text-center shadow">
          {okMsg}
        </div>
      )}

      {/* SIN enlaces aquí para evitar duplicados */}
      <form onSubmit={handleRegister} className="space-y-4">
        <input
          ref={refs.email}
          name="email"
          type="email"
          autoComplete="email"
          value={regData.email}
          onChange={handleRegChange}
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-200/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 shadow"
          placeholder="Email"
        />

        <input
          ref={refs.username}
          name="username"
          type="text"
          autoComplete="username"
          value={regData.username}
          onChange={handleRegChange}
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-200/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 shadow"
          placeholder="Usuario"
        />

        <PasswordInput
          value={regData.password}
          onChange={handleRegChange}
          name="password"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            ref={refs.nombre}
            name="nombre"
            type="text"
            autoComplete="given-name"
            value={regData.nombre}
            onChange={handleRegChange}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-200/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 shadow"
            placeholder="Nombre"
          />

          <input
            ref={refs.apellido}
            name="apellido"
            type="text"
            autoComplete="family-name"
            value={regData.apellido}
            onChange={handleRegChange}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-200/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 shadow"
            placeholder="Apellido"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <DateInputNative
            ref={refs.fecha_nacimiento}
            name="fecha_nacimiento"
            valueISO={regData.fecha_nacimiento}
            onChangeISO={handleRegChange}
          />

          <GenderSelect
            name="genero"
            value={regData.genero}
            onChange={handleRegChange}
            options={[
              { value: "", label: "Género" },
              { value: "M", label: "Masculino" },
              { value: "F", label: "Femenino" },
              { value: "O", label: "Otro / Prefiero no decir" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            ref={refs.altura}
            name="altura"
            type="number"
            step="0.01"
            min="0"
            value={regData.altura}
            onChange={handleRegChange}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-200/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 shadow"
            placeholder="Altura (m)"
          />

          <input
            ref={refs.peso}
            name="peso"
            type="number"
            step="0.1"
            min="0"
            value={regData.peso}
            onChange={handleRegChange}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-200/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 shadow"
            placeholder="Peso (kg)"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Procesando..." : "Registrarme"}
        </button>
      </form>
    </div>
  );
};

export default Register;
