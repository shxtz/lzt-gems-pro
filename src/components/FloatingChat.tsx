import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FloatingChat = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ text: string; from: "user" | "bot"; id?: string }[]>([
    { text: "Olá! 👋 Como posso te ajudar hoje?", from: "bot" },
  ]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load or create ticket when chat opens
  useEffect(() => {
    if (!isOpen || !user) return;

    const loadTicket = async () => {
      // Find existing open ticket
      const { data: existing } = await supabase
        .from("support_tickets")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        setTicketId(existing.id);
        // Load messages
        const { data: msgs } = await supabase
          .from("ticket_messages")
          .select("*")
          .eq("ticket_id", existing.id)
          .order("created_at", { ascending: true });

        if (msgs && msgs.length > 0) {
          setMessages([
            { text: "Olá! 👋 Como posso te ajudar hoje?", from: "bot" },
            ...msgs.map((m) => ({
              text: m.message,
              from: (m.is_admin ? "bot" : "user") as "user" | "bot",
              id: m.id,
            })),
          ]);
        }
      }
    };

    loadTicket();
  }, [isOpen, user]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const msg = payload.new as any;
          if (msg.is_admin) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, { text: msg.message, from: "bot", id: msg.id }];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  const handleSend = async () => {
    if (!message.trim()) return;

    if (!user) {
      toast.error("Faça login para enviar mensagens");
      return;
    }

    const text = message.trim();
    setMessage("");
    setSending(true);

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, { text, from: "user", id: tempId }]);

    try {
      let currentTicketId = ticketId;

      if (!currentTicketId) {
        const { data: ticket, error } = await supabase
          .from("support_tickets")
          .insert({ user_id: user.id, subject: text.slice(0, 100) })
          .select("id")
          .single();

        if (error) throw error;
        currentTicketId = ticket.id;
        setTicketId(ticket.id);
      }

      await supabase.from("ticket_messages").insert({
        ticket_id: currentTicketId,
        sender_id: user.id,
        message: text,
        is_admin: false,
      });
    } catch {
      toast.error("Erro ao enviar mensagem");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="mb-4 w-[calc(100vw-2rem)] sm:w-[340px] rounded-3xl border border-border/50 glass shadow-card-hover overflow-hidden"
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
            <div className="h-64 sm:h-72 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={msg.id || i}
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
                onKeyDown={(e) => e.key === "Enter" && !sending && handleSend()}
                placeholder={user ? "Digite sua mensagem..." : "Faça login para enviar..."}
                disabled={!user || sending}
                maxLength={500}
                className="flex-1 rounded-xl border border-border/30 bg-muted/50 px-4 py-2.5 text-[13px] text-foreground font-body placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/30 transition-all disabled:opacity-50"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                disabled={!user || sending || !message.trim()}
                className="rounded-xl bg-gradient-gold p-2.5 text-primary-foreground transition-all hover:shadow-gold disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <div className="relative">
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
          className="relative flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground shadow-gold-intense z-10"
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
