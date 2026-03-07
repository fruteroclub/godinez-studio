const STUB_REPLIES = [
  "Entendido, estoy procesando tu solicitud. Dame un momento para revisar los detalles.",
  "He analizado tu mensaje. Aquí va mi recomendación basada en lo que me compartiste.",
  "Perfecto, ya tengo claro lo que necesitas. Déjame preparar una respuesta completa.",
  "Gracias por la información. Estoy trabajando en una solución para tu equipo.",
  "Recibido. Estoy revisando los datos disponibles para darte la mejor respuesta.",
];

const ACTION_REPLY =
  `Perfecto, voy a crear un proyecto para organizar esto.\n\n` +
  `:::action\n` +
  `type: create_project\n` +
  `label: Crear proyecto "Plan de Marketing"\n` +
  `payload:\n` +
  `  name: Plan de Marketing\n` +
  `  description: Proyecto para gestionar la estrategia de marketing digital\n` +
  `:::\n\n` +
  `También creo una tarea inicial:\n\n` +
  `:::action\n` +
  `type: create_task\n` +
  `label: Crear tarea "Definir audiencia objetivo"\n` +
  `payload:\n` +
  `  title: Definir audiencia objetivo\n` +
  `  description: Investigar y definir el perfil de cliente ideal\n` +
  `  priority: high\n` +
  `:::\n\n` +
  `> [Stub response — connect OpenClaw Gateway for real agent replies]`;

function getStubReply(userMessage: string): string {
  // Every 3rd message triggers action blocks for testing
  if (userMessage.length % 3 === 0) {
    return ACTION_REPLY;
  }
  const idx = userMessage.length % STUB_REPLIES.length;
  return `${STUB_REPLIES[idx]}\n\n> [Stub response — connect OpenClaw Gateway for real agent replies]`;
}

export function createStubRun(userMessage: string): {
  runId: string;
  simulateStream: (handlers: {
    onDelta: (text: string) => void;
    onFinal: (text: string) => void;
  }) => void;
} {
  const runId = crypto.randomUUID();
  const reply = getStubReply(userMessage);

  return {
    runId,
    simulateStream: (handlers) => {
      const words = reply.split(" ");
      let accumulated = "";
      let i = 0;

      const interval = setInterval(() => {
        if (i < words.length) {
          accumulated += (i > 0 ? " " : "") + words[i];
          handlers.onDelta(accumulated);
          i++;
        } else {
          clearInterval(interval);
          handlers.onFinal(accumulated);
        }
      }, 80);
    },
  };
}
