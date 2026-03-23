import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";

const FloatingChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ text: string; from: "user" | "bot" }[]>([
    { text: "Olá! 👋 Como posso te ajudar hoje?", from: "bot" },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    setMessages((prev) => [...prev, { text: message, from: "user" }]);
    setMessage("");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { text: "Obrigado pela mensagem! Em breve um atendente responderá. 😊", from: "bot" },
      ]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="mb-4 w-[340px] rounded-3xl border border-border/50 glass shadow-card-hover overflow-hidden"
          >
            {/* Header */}
            <div className="relative overflow-hidden px-5 py-4">
              <div className="absolute inset-0 bg-gradient-gold opacity-90" />
              <div className="absolute inset-0 scanlines" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/20">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="font-display text-[12px] font-bold text-primary-foreground tracking-wider uppercase">
                      Suporte
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-[10px] text-primary-foreground/70 font-body">Online</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-primary-foreground/60 transition-all hover:text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="h-72 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-end gap-2 ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.from === "bot" && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full glass-gold">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[13px] font-body leading-relaxed ${
                      msg.from === "user"
                        ? "bg-gradient-gold text-primary-foreground rounded-br-sm"
                        : "bg-muted/80 text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.from === "user" && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20">
                      <User className="h-3 w-3 text-primary" />
                    </div>
                  )}
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border/30 p-3 flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Digite sua mensagem..."
                className="flex-1 rounded-xl border border-border/30 bg-muted/50 px-4 py-2.5 text-[13px] text-foreground font-body placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/30 transition-all"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                className="rounded-xl bg-gradient-gold p-2.5 text-primary-foreground transition-all hover:shadow-gold"
              >
                <Send className="h-4 w-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button with ripple */}
      <div className="relative">
        {/* Ripple rings */}
        {!isOpen && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/20"
              animate={{ scale: [1, 2], opacity: [0.4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/15"
              animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
            />
          </>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground shadow-gold-intense z-10"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <X className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                <MessageCircle className="h-5 w-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
};

export default FloatingChat;
