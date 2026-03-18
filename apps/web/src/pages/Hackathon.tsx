import { useState, useEffect, useRef } from "react";
import { Trophy, Clock } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { apiFetch } from "@/lib/api";
import { useWorkspace } from "../providers/WorkspaceProvider";
import { useHackathons, PHASE_NAMES, type HackathonData } from "../hooks/use-hackathons";
import { PhaseCard } from "../components/hackathon/PhaseCard";

export function Hackathon() {
  const { workspace, slug } = useWorkspace();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getToken } = useAuth();
  const {
    hackathons,
    isLoading,
    create,
    toggle,
    remove,
    getTimeRemaining,
    getProgress,
    addNote,
  } = useHackathons(workspace?.id);

  const [isConfiguring, setIsConfiguring] = useState(false);
  const [selectedHackathon, setSelectedHackathon] = useState<HackathonData | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    deadline: "",
    hackathonUrl: "",
    resourcesUrl: "",
  });
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Refs for focus management
  const nameInputRef = useRef<HTMLInputElement>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);

  // Focus management for modal
  useEffect(() => {
    if (showDeleteConfirm && deleteModalRef.current) {
      deleteModalRef.current.focus();
    }
  }, [showDeleteConfirm]);

  // Focus name input when configuring
  useEffect(() => {
    if (isConfiguring && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isConfiguring]);

  // Sync selectedHackathon with updated data from hackathons list
  useEffect(() => {
    if (selectedHackathon && hackathons.length > 0) {
      const updated = hackathons.find(h => h.id === selectedHackathon.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedHackathon)) {
        setSelectedHackathon(updated);
      }
    }
  }, [hackathons, selectedHackathon?.id]);


  // Auto-select hackathon from URL query param
  useEffect(() => {
    const selectedId = searchParams.get("selected");
    if (selectedId && hackathons.length > 0 && !selectedHackathon) {
      const hackathon = hackathons.find(h => h.id === Number(selectedId));
      if (hackathon) {
        setSelectedHackathon(hackathon);
      }
    }
  }, [searchParams, hackathons, selectedHackathon]);
  const openHackathonChat = async (hackathonId: number, hackathonName: string) => {
    if (!workspace?.id) return;
    setIsOpeningChat(true);
    try {
      const token = await getToken();
      const conv = await apiFetch<{ id: number }>("/api/conversations/hackathon", {
        method: "POST",
        body: JSON.stringify({ workspaceId: workspace.id, hackathonId, hackathonName }),
        token,
      });
      navigate(`/studio/${slug}/chat/${conv.id}`);
    } catch (err) {
      console.error("Error opening hackathon chat:", err);
    } finally {
      setIsOpeningChat(false);
    }
  };

  // Validate form before submit
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "El nombre es obligatorio";
    if (formData.name.length > 255) errors.name = "Máximo 255 caracteres";
    if (!formData.deadline) errors.deadline = "La fecha es obligatoria";
    if (formData.deadline && new Date(formData.deadline) < new Date()) {
      errors.deadline = "La fecha debe ser en el futuro";
    }
    if (formData.hackathonUrl && !formData.hackathonUrl.startsWith("http")) {
      errors.hackathonUrl = "La URL debe empezar con http:// o https://";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      await create({
        name: formData.name,
        deadline: formData.deadline,
        hackathonUrl: formData.hackathonUrl || undefined,
        resourcesUrl: formData.resourcesUrl || undefined,
      });
      setIsConfiguring(false);
      setFormData({ name: "", deadline: "", hackathonUrl: "", resourcesUrl: "" });
    } catch (err) {
      console.error("Create error:", err);
      alert("Error al crear: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDelete = async () => {
    if (!selectedHackathon) return;
    try {
      await remove(selectedHackathon.id);
      setShowDeleteConfirm(false);
      setSelectedHackathon(null);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error al eliminar: " + (err instanceof Error ? err.message : String(err)));
      setShowDeleteConfirm(false);
    }
  };

  const handleToggle = async () => {
    if (!selectedHackathon) return;
    try {
      const updated = await toggle(selectedHackathon.id);
      setSelectedHackathon(updated);
    } catch (err) {
      console.error("Toggle error:", err);
      alert("Error al cambiar estado: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Keyboard handler for modal
  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" role="status" aria-label="Cargando hackathons">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" aria-hidden="true" />
        <span className="sr-only">Cargando hackathons...</span>
      </div>
    );
  }

  // Empty state - no hackathons
  if (hackathons.length === 0 && !isConfiguring) {
    return (
      <main className="flex flex-col items-center justify-center h-full p-8" aria-labelledby="empty-heading">
        <Trophy className="w-16 h-16 mb-6 text-amber-400 stroke-[1.5]" aria-hidden="true" />
        <h1 id="empty-heading" className="text-2xl font-bold text-zinc-100 mb-2">
          ¿Estás en un hackathon?
        </h1>
        <p className="text-zinc-400 text-center mb-6 max-w-md">
          Activa este modo y tu agente te guiará fase por fase hasta entregar
          tu proyecto.
        </p>
        <button
          onClick={() => setIsConfiguring(true)}
          className="px-6 py-3 bg-pink-500 hover:bg-pink-600 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-magenta focus:ring-offset-2 focus:ring-offset-zinc-900"
          aria-label="Configurar nuevo hackathon"
        >
          Configurar Hackathon
        </button>
      </main>
    );
  }

  // Configure new hackathon form
  if (isConfiguring) {
    return (
      <main className="flex flex-col items-center justify-center h-full p-8" aria-labelledby="form-heading">
        <div className="w-full max-w-md">
          <h1 id="form-heading" className="text-2xl font-bold text-zinc-100 mb-6 text-center">
            Nuevo hackathon
          </h1>
          <form onSubmit={handleCreate} className="space-y-4" aria-label="Formulario de nuevo hackathon">
            <div>
              <label htmlFor="hackathon-name" className="block text-sm font-medium text-zinc-300 mb-1">
                Nombre del hackathon *
              </label>
              <input
                ref={nameInputRef}
                id="hackathon-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Monad Blitz Monterrey"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-magenta/50 text-zinc-100"
                aria-invalid={!!formErrors.name}
                aria-describedby={formErrors.name ? "name-error" : undefined}
              />
              {formErrors.name && (
                <p id="name-error" className="text-xs text-magenta mt-1" role="alert">
                  ⚠ {formErrors.name}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="hackathon-deadline" className="block text-sm font-medium text-zinc-300 mb-1">
                Fecha límite de entrega *
              </label>
              <input
                id="hackathon-deadline"
                type="datetime-local"
                required
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-magenta/50 text-zinc-100"
                aria-invalid={!!formErrors.deadline}
                aria-describedby={formErrors.deadline ? "deadline-error" : undefined}
              />
              {formErrors.deadline && (
                <p id="deadline-error" className="text-xs text-magenta mt-1" role="alert">
                  ⚠ {formErrors.deadline}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="hackathon-url" className="block text-sm font-medium text-zinc-300 mb-1">
                Link del hackathon (opcional)
              </label>
              <input
                id="hackathon-url"
                type="url"
                value={formData.hackathonUrl}
                onChange={(e) => setFormData({ ...formData, hackathonUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-magenta/50 text-zinc-100"
              />
            </div>
            {formData.hackathonUrl && (
              <div>
                <label htmlFor="resources-url" className="block text-sm font-medium text-zinc-300 mb-1">
                  Link de recursos (opcional)
                </label>
                <input
                  id="resources-url"
                  type="url"
                  value={formData.resourcesUrl}
                  onChange={(e) => setFormData({ ...formData, resourcesUrl: e.target.value })}
                  placeholder="https://docs..."
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-magenta/50 text-zinc-100"
                />
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsConfiguring(false);
                  setFormData({ name: "", deadline: "", hackathonUrl: "", resourcesUrl: "" });
                }}
                className="flex-1 px-6 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-pink-500 hover:bg-pink-600 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-magenta focus:ring-offset-2 focus:ring-offset-zinc-900"
              >
                Crear
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  // Phase detail view
  if (selectedHackathon && selectedPhase !== null) {
    const phase = selectedHackathon.phases[selectedPhase];
    
    const handleAddNote = async () => {
      if (!newNote.trim()) return;
      try {
        const updated = await addNote(selectedHackathon.id, selectedPhase, newNote.trim());
        setNewNote("");
        if (updated) setSelectedHackathon(updated);
      } catch (err) {
        console.error("Error adding note:", err);
      }
    };

    return (
      <main className="p-8 max-w-2xl mx-auto" aria-labelledby="phase-heading">
        <nav aria-label="Navegación de fases">
          <button
            onClick={() => setSelectedPhase(null)}
            className="text-zinc-400 hover:text-zinc-200 mb-6 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-magenta rounded"
            aria-label="Volver a la lista de fases"
          >
            ← Volver a fases
          </button>
        </nav>
        <article className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
          <header className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span className="text-sm text-zinc-400 uppercase tracking-wider">FASE {selectedPhase}</span>
              <h1 id="phase-heading" className="text-xl font-bold text-white">
                {PHASE_NAMES[selectedPhase]}
              </h1>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                phase.status === "done"
                  ? "bg-green-500/20 text-green-400"
                  : phase.status === "current"
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-zinc-700 text-zinc-400"
              }`}
              role="status"
              aria-label={`Estado: ${phase.status === "done" ? "Completada" : phase.status === "current" ? "En progreso" : "Pendiente"}`}
            >
              {phase.status === "done"
                ? "Completada"
                : phase.status === "current"
                ? "En progreso"
                : "Pendiente"}
            </span>
          </header>
          
          <section aria-label="Notas de la fase">
            {phase.notes.length > 0 ? (
              <div className="mb-4">
                <h2 className="text-sm font-medium text-zinc-400 mb-2 sr-only">
                  📝 Notas guardadas:
                </h2>
                <ul className="space-y-2" aria-label={`${phase.notes.length} notas guardadas`}>
                  {phase.notes.map((note, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-zinc-300 bg-zinc-900/50 p-2 rounded"
                    >
                      <span className="text-green-400 mt-0.5" aria-hidden="true">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-zinc-500 italic mb-4">
                Aún no hay notas para esta fase.
              </p>
            )}
          </section>

          <section className="mb-6 hidden" aria-label="Agregar nueva nota">
            <h2 className="text-sm font-medium text-zinc-400 mb-2 sr-only">
              ➕ Agregar nota:
            </h2>
            <div className="flex gap-2">
              <label htmlFor="new-note" className="sr-only">Nueva nota</label>
              <input
                ref={noteInputRef}
                id="new-note"
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                placeholder="Ej: Definí la idea del proyecto..."
                className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-magenta/50"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg text-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500"
                aria-label="Guardar nota"
              >
                Guardar
              </button>
            </div>
          </section>

          <button
            onClick={() => openHackathonChat(selectedHackathon.id, selectedHackathon.name)}
            className="w-full px-4 py-2 bg-magenta/80 hover:bg-magenta rounded-lg text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-magenta"
            aria-label="Abrir chat del hackathon"
          >
            Abrir Chat
          </button>
        </article>
      </main>
    );
  }

  // Hackathon detail view
  if (selectedHackathon) {
    return (
      <main className="p-8" aria-labelledby="hackathon-heading">
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            onKeyDown={handleModalKeyDown}
          >
            <div 
              ref={deleteModalRef}
              className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 max-w-md mx-4"
              tabIndex={-1}
            >
              <h2 id="delete-dialog-title" className="text-lg font-bold text-zinc-100 mb-2">
                ¿Eliminar hackathon?
              </h2>
              <p className="text-zinc-400 mb-4">
                Esto eliminará <strong className="text-zinc-200">{selectedHackathon.name}</strong> y todo su progreso. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-magenta"
                  aria-label={`Confirmar eliminación de ${selectedHackathon.name}`}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Back button */}
        <nav aria-label="Navegación de hackathons">
          <button
            onClick={() => { setSelectedHackathon(null); setSearchParams({}); }}
            className="text-zinc-400 hover:text-zinc-200 mb-6 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-magenta rounded"
            aria-label="Volver a la lista de hackathons"
          >
            ← Volver a lista
          </button>
        </nav>

        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Trophy className="w-6 h-6 text-amber-400 stroke-[1.5]" />
              <h1 id="hackathon-heading" className="text-2xl font-bold text-zinc-100">
                {selectedHackathon.name}
              </h1>
              {!selectedHackathon.active && (
                <span className="px-2 py-1 bg-zinc-700 text-zinc-400 text-xs rounded" role="status">
                  Inactivo
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-zinc-400">
              <span className="text-zinc-300">
                <Clock className="w-4 h-4 inline stroke-[1.5]" /> Deadline: {new Date(selectedHackathon.deadline).toLocaleDateString()}
              </span>
              {selectedHackathon.active && getTimeRemaining(selectedHackathon) && (
                <span className="text-pink-400" role="timer" aria-label="Tiempo restante">
                  {getTimeRemaining(selectedHackathon)} restantes
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3" role="group" aria-label="Acciones del hackathon">
            {selectedHackathon.active && (
              <button
                onClick={() => openHackathonChat(selectedHackathon.id, selectedHackathon.name)}
                disabled={isOpeningChat}
                className="px-4 py-2 bg-magenta/80 hover:bg-magenta rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-magenta focus:ring-offset-2 focus:ring-offset-zinc-900"
                aria-label="Abrir chat del hackathon"
              >
                {isOpeningChat ? "Abriendo..." : "Abrir Chat"}
              </button>
            )}
            <button hidden
              onClick={handleToggle}
              className={`px-4 py-2 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                selectedHackathon.active
                  ? "bg-zinc-700 hover:bg-zinc-600 focus:ring-zinc-500"
                  : "bg-green-600 hover:bg-green-500 focus:ring-green-500"
              }`}
              aria-pressed={selectedHackathon.active}
              aria-label={selectedHackathon.active ? "Desactivar hackathon" : "Activar hackathon"}
            >
              {selectedHackathon.active ? "Desactivar" : "Activar"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-magenta/20 hover:bg-magenta/40 border border-magenta/50 rounded-lg text-sm text-magenta transition-colors focus:outline-none focus:ring-2 focus:ring-magenta"
              aria-label="Eliminar hackathon"
            >
              Eliminar
            </button>
          </div>
        </header>

        {/* Links */}
        <nav className="flex gap-4 mb-6" aria-label="Enlaces del hackathon">
          {selectedHackathon.hackathonUrl && (
            <a
              href={selectedHackathon.hackathonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-400 hover:text-pink-300 text-sm focus:outline-none focus:ring-2 focus:ring-magenta rounded"
            >
              🔗 Página del hackathon
            </a>
          )}
          {selectedHackathon.resourcesUrl && (
            <a
              href={selectedHackathon.resourcesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-400 hover:text-pink-300 text-sm focus:outline-none focus:ring-2 focus:ring-magenta rounded"
            >
              Recursos
            </a>
          )}
        </nav>

        {/* Phase Grid */}
        <section aria-label="Fases del hackathon">
          <div className="grid grid-cols-3 gap-4 mb-8" role="list">
            {selectedHackathon.phases.slice(0, 3).map((phase) => (
              <PhaseCard
                key={phase.number}
                number={phase.number}
                status={phase.status}
                onClick={() => setSelectedPhase(phase.number)}
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 mb-8" role="list">
            {selectedHackathon.phases.slice(3, 6).map((phase) => (
              <PhaseCard
                key={phase.number}
                number={phase.number}
                status={phase.status}
                onClick={() => setSelectedPhase(phase.number)}
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 mb-8" role="list">
            {selectedHackathon.phases.slice(6, 9).map((phase) => (
              <PhaseCard
                key={phase.number}
                number={phase.number}
                status={phase.status}
                onClick={() => setSelectedPhase(phase.number)}
              />
            ))}
          </div>
        </section>

        {/* Progress Bar */}
        <section aria-label="Progreso del hackathon">
          <div 
            className="bg-zinc-800/50 rounded-sm h-3 overflow-hidden"
            role="progressbar"
            aria-valuenow={getProgress(selectedHackathon)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progreso: ${getProgress(selectedHackathon)}%`}
          >
            <div
              className="bg-magenta h-full transition-all duration-500"
              style={{ width: getProgress(selectedHackathon) + "%" }}
            />
          </div>
          <p className="text-center text-zinc-300 mt-2" aria-hidden="true">
            Progreso: {getProgress(selectedHackathon)}%
          </p>
        </section>
      </main>
    );
  }

  // Hackathon LIST view
  return (
    <main className="p-8" aria-labelledby="list-heading">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 id="list-heading" className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-400 stroke-[1.5]" />
            Mis Hackathons
          </h1>
          <p className="text-zinc-400 mt-1">
            {hackathons.length} hackathon{hackathons.length !== 1 ? "es" : ""} activo{hackathons.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setIsConfiguring(true)}
          className="px-4 py-2 bg-pink-500 hover:bg-pink-600 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-magenta focus:ring-offset-2 focus:ring-offset-zinc-900"
          aria-label="Crear nuevo hackathon"
        >
          + Nuevo hackathon
        </button>
      </header>

      <section aria-label="Lista de hackathons">
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
          {hackathons.map((hackathon) => (
            <li key={hackathon.id}>
              <button
                onClick={() => setSelectedHackathon(hackathon)}
                className="w-full text-left p-6 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:border-pink-500/50 transition-colors focus:outline-none focus:ring-2 focus:ring-magenta"
                aria-label={`Abrir ${hackathon.name}, ${getProgress(hackathon)}% completado`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-zinc-100 truncate">{hackathon.name}</h2>
                  {hackathon.active ? (
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                      Activo
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-zinc-700 text-zinc-400 text-xs rounded-full">
                      Inactivo
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-zinc-400 mb-3">
                  <Clock className="w-4 h-4 inline stroke-[1.5]" />
                  <span>{new Date(hackathon.deadline).toLocaleDateString()}</span>
                  {hackathon.active && (
                    <span className="text-pink-400">• {getTimeRemaining(hackathon)}</span>
                  )}
                </div>

                {/* Mini progress bar */}
                <div 
                  className="bg-zinc-700 rounded-full h-2 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={getProgress(hackathon)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="bg-magenta h-full transition-all"
                    style={{ width: getProgress(hackathon) + "%" }}
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1" aria-hidden="true">
                  {getProgress(hackathon)}% completado
                </p>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
