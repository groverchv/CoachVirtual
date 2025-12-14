// src/pages/.../SelectCategory.jsx
import GestionarTipoUsuario from "../GestionarTipo/GestionarTipoUsuario"; // ajusta la ruta según tu estructura

export default function SelectCategory() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
      <section className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 md:p-12 max-w-4xl w-full text-center border border-white/20">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-4">
          ¿Qué deseas entrenar hoy?
        </h1>
        <p className="text-white/80 text-base md:text-lg mb-8">
          Elige una categoría para cargar tus rutinas.
        </p>

        {/* 🔹 Aquí antes estaban los botones "Gimnasio" y "Fisioterapia".
            Ahora mostramos los tipos que vienen del backend */}
        <GestionarTipoUsuario />

        <footer className="mt-8 text-white/40 text-xs">
          Coach Virtual &copy; {new Date().getFullYear()}
        </footer>
      </section>
    </main>
  );
}
