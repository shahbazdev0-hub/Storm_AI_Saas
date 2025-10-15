import { useState } from "react"
import { useAuthStore } from "../../store/authStore"

export default function Chatbot() {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<{role:"user"|"bot";text:string}[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim()) return
    const newMsg = { role: "user", text: input }
    setMessages([...messages, newMsg])
    setLoading(true)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/${import.meta.env.VITE_API_PREFIX || 'api/v1'}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: user?.company_id,   // scope to tenant
          peer: user?.id || "anon",
          text: input
        }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: "bot", text: data.reply }])
    } catch (e) {
      setMessages((prev) => [...prev, { role: "bot", text: "⚠️ Error talking to AI" }])
    }
    setInput("")
    setLoading(false)
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-black shadow-xl rounded-2xl flex flex-col overflow-hidden">
      <div className="bg-primary-600 text-white px-3 py-2 font-semibold">AI Assistant</div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={m.role==="user" ? "text-right" : "text-left"}>
            <div className={`inline-block px-3 py-2 rounded-lg text-sm ${
              m.role==="user"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-800"
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-gray-500">AI is typing…</div>}
      </div>
      <div className="border-t flex">
        <input
          className="flex-1 px-3 py-2 text-sm outline-none"
          value={input}
          onChange={(e)=>setInput(e.target.value)}
          placeholder="Type your message..."
          onKeyDown={(e)=>e.key==="Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="px-4 bg-primary-600 text-white disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  )
}
