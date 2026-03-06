export default function AgentOfflineBanner({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-4 py-3">
      <span className="text-yellow-400 text-lg">&#9888;</span>
      <p className="text-sm text-yellow-200">
        {message ?? "Tu agente no está disponible en este momento. Puedes seguir gestionando tus proyectos y tareas."}
      </p>
    </div>
  );
}
