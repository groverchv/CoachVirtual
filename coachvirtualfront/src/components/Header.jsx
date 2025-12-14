import React from "react";
import { useAuth } from "../auth/useAuth";
import { useNavigate } from "react-router-dom";
import { useCategory } from "../context/CategoryContext";

const Header = ({ onMenuClick }) => {
  const { user, isAuthenticated, signOut } = useAuth();
  const { category, clearCategory } = useCategory();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const changeCategory = () => {
    clearCategory();
    navigate("/seleccionar");
  };

  // Etiqueta legible para la categoría (soporta string u objeto)
  const categoryLabel = (() => {
    if (!category) return "";
    if (typeof category === "string") {
      return category === "gym" ? "Gimnasio" : "Fisioterapia";
    }
    // si es objeto { id, nombre, ... }
    return category.nombre || `Tipo #${category.id}`;
  })();

  return (
    <nav className="fixed top-0 left-0 w-full h-16 bg-blue-600 px-2 sm:px-4 flex items-center z-50 shadow">
      <div className="max-w-7xl mx-auto flex items-center w-full gap-2">
        {/* Botón menú */}
        <button
          className="text-white focus:outline-none text-2xl ml-1 sm:ml-2"
          onClick={onMenuClick}
          aria-label="Abrir/Cerrar menú"
          title="Menú"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Título */}
        <div className="flex-1 text-center text-white font-bold text-lg sm:text-xl">
          Coach Virtual
        </div>

        {/* Acciones derecha */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Chip de categoría actual + cambiar (visible también en móvil) */}
          {isAuthenticated && category && (
            <button
              onClick={changeCategory}
              className="flex items-center gap-1 sm:gap-2 bg-white/10 text-white px-2 py-1 rounded-lg border border-white/20 text-xs sm:text-sm max-w-[8rem] sm:max-w-none truncate"
              title="Cambiar categoría"
            >
              <span className="truncate">{categoryLabel}</span>
              <span className="underline">Cambiar</span>
            </button>
          )}

          {isAuthenticated && (
            <>
              {/* Nombre/Email del usuario: solo en pantallas >= sm */}
              {user && (user.name || user.email) && (
                <span className="hidden sm:block text-white/90 text-sm max-w-[10rem] truncate">
                  {user.name || user.email}
                </span>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 sm:gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg border border-white/20 transition-colors text-xs sm:text-sm"
                title="Cerrar sesión"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="hidden xs:inline sm:inline">Cerrar sesión</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Header;
