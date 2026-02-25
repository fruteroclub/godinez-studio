const STUB_REPLIES = [
  "Entendido, estoy procesando tu solicitud. Dame un momento para revisar los detalles.",
  "He analizado tu mensaje. Aquí va mi recomendación basada en lo que me compartiste.",
  "Perfecto, ya tengo claro lo que necesitas. Déjame preparar una respuesta completa.",
  "Gracias por la información. Estoy trabajando en una solución para tu equipo.",
  "Recibido. Estoy revisando los datos disponibles para darte la mejor respuesta.",
];

function getStubReply(userMessage: string): string {
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
