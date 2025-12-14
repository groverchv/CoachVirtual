import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";

/** Botón seguro para iconos (no roba foco) */
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
    className={`absolute p-1 rounded-md text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 z-20 ${className}`}
  >
    {children}
  </button>
);

/** Input de contraseña accesible */
const PasswordInput = ({
  value,
  onChange,
  name = "password",
  placeholder = "Contraseña",
  autoComplete = "current-password",
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
        className="w-full px-4 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300 shadow"
        placeholder={placeholder}
      />
      <SafeIconButton
        onClick={() => setShow((s) => !s)}
        className="right-3 top-1/2 -translate-y-1/2"
        title={show ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {show ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3l18 18" />
            <path d="M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 2.42-4.42" />
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.29 20.29 0 0 1 5.06-5.94" />
            <path d="M9.88 4.24A10.88 10.88 0 0 1 12 4c7 0 11 8 11 8a20.27 20.27 0 0 1-3.06 4.2" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </SafeIconButton>
    </div>
  );
};

const IniciarSesion = ({ signIn, onSuccess /*, onSwitchToRegister*/ }) => {
  const navigate = useNavigate();
  const { isSuper } = useAuth(); // ← leer rol desde contexto
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await signIn(formData.email, formData.password);
      onSuccess?.();

      // Redirección por rol:
      if (isSuper) {
        navigate("/home", { replace: true });
      } else {
        const next = localStorage.getItem("cv.category") ? "/musculo" : "/seleccionar";
        navigate(next, { replace: true });
      }
    } catch (err) {
      setError(
        err?.message || "Error al iniciar sesión. Verifica tus credenciales."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Alerta (no empuja layout) */}
      {error && (
        <div className="mb-4 bg-red-100/90 border border-red-400 text-red-800 px-4 py-3 rounded-lg text-center shadow">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4">
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300 shadow"
            placeholder="Correo electrónico"
          />
          <PasswordInput
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-gradient-to-r from-red-500 to-yellow-500 hover:from-red-600 hover:to-yellow-600 text-white font-semibold rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
        >
          {isLoading ? "Procesando..." : "Iniciar sesión"}
        </button>
      </form>
    </div>
  );
};

export default IniciarSesion;
