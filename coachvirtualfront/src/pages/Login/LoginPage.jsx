// src/pages/Login/LoginPage.jsx
import { useState } from "react";
import { useAuth } from "../../auth/useAuth";
import IniciarSesion from "./IniciarSesion";
import Register from "./Register";

const LoginPage = () => {
  const { signIn } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"

  // Misma imagen para ambas vistas
  const gymImage =
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1470&q=80";

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 px-4"
    >
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-0 rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black/60">
        {/* Imagen (arriba en móvil, a la izquierda en desktop) */}
        <div className="relative h-48 md:h-auto">
          <img
            src={gymImage}
            alt="Fondo gimnasio"
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent" />
          <div className="relative z-10 h-full w-full flex items-center justify-center md:justify-start md:pl-8">
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500">
                Coach Virtual
              </h1>
              <p className="text-white/90 mt-1">
                Tu entrenador personal digital
              </p>
            </div>
          </div>
        </div>

        {/* Panel de formularios */}
        <div className="p-6 sm:p-8 md:p-10 flex flex-col">
          {/* Tabs SIEMPRE visibles (web y responsive) */}
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl mb-6 w-full">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                mode === "login"
                  ? "bg-white/90 text-gray-900 shadow"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                mode === "register"
                  ? "bg-white/90 text-gray-900 shadow"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              Crear cuenta
            </button>
          </div>

          {/* Título único */}
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500 mb-6">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h2>

          {/* Formulario centrado */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-md">
              {mode === "login" ? (
                <IniciarSesion
                  signIn={signIn}
                  onSuccess={() => {}}
                  onSwitchToRegister={() => setMode("register")}
                />
              ) : (
                <Register
                  signIn={signIn}
                  onSuccess={() => setMode("login")}
                  onSwitchToLogin={() => setMode("login")}
                />
              )}
            </div>
          </div>

          {/* Enlace alterno abajo */}
          <div className="mt-6 text-center">
            {mode === "login" ? (
              <button
                type="button"
                onClick={() => setMode("register")}
                className="text-sm text-gray-200 hover:text-white"
              >
                ¿No tienes cuenta? Crear cuenta
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-sm text-gray-200 hover:text-white"
              >
                ¿Ya tienes cuenta? Iniciar sesión
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
