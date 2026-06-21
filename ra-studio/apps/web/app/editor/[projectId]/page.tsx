"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import io from "socket.io-client";

const MonacoEditor = dynamic(
  async () => {
    const monaco = await import("react-monaco-editor").then((m) => m.default);
    return monaco;
  },
  { ssr: false }
);

export default function EditorPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const [socket, setSocket] = useState<any>(null);
  const [terminal, setTerminal] = useState<string>("");

  useEffect(() => {
    const s = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000");
    s.on("connect", () => {
      s.emit("join-project", projectId);
    });
    s.on("terminal-output", (msg: string) => {
      setTerminal((t) => t + msg + "\n");
    });
    setSocket(s);
    return () => s.disconnect();
  }, [projectId]);

  function sendInput(input: string) {
    socket.emit("terminal-input", { projectId, payload: input });
  }

  return (
    <div>
      <h2 className="text-xl">Editor - {projectId}</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="border">
          {/* Monaco placeholder - content loading disabled for brevity */}
          <textarea className="w-full h-96 p-2" defaultValue={`// Abra um arquivo para editar`} />
        </div>
        <div className="border p-2">
          <div className="bg-black text-white h-72 p-2 overflow-auto whitespace-pre-wrap">{terminal}</div>
          <div className="mt-2">
            <input id="cmd" placeholder="Comando..." className="border p-1 mr-2" />
            <button
              className="px-3 py-1 bg-blue-600 text-white"
              onClick={() => {
                // @ts-ignore
                const input = (document.getElementById("cmd") as HTMLInputElement).value;
                sendInput(input);
              }}
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
