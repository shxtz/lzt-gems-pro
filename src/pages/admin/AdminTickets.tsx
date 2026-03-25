import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, CheckCircle, Clock, User, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

const AdminTickets = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "closed">("open");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: tickets } = useQuery({
    queryKey: ["admin-tickets", filter],
    queryFn: async () => {
      let q = supabase
        .from("support_tickets")
        .select("*")
        .order("updated_at", { ascending: false });

      if (filter !== "all") q = q.eq("status", filter);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Ticket[];
    },
  });

  const { data: ticketMessages } = useQuery({
    queryKey: ["admin-ticket-messages", selectedTicket],
    enabled: !!selectedTicket,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", selectedTicket!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  // Realtime for messages
  useEffect(() => {
    if (!selectedTicket) return;

    const channel = supabase
      .channel(`admin-ticket-${selectedTicket}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${selectedTicket}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-ticket-messages", selectedTicket] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedTicket, queryClient]);

  // Realtime for new tickets
  useEffect(() => {
    const channel = supabase
      .channel("admin-tickets-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticketMessages]);

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!reply.trim() || !selectedTicket || !user) return;
      const { error } = await supabase.from("ticket_messages").insert({
        ticket_id: selectedTicket,
        sender_id: user.id,
        message: reply.trim(),
        is_admin: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["admin-ticket-messages", selectedTicket] });
      toast.success("Resposta enviada");
    },
    onError: () => toast.error("Erro ao enviar resposta"),
  });

  const closeTicket = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status: "closed", updated_at: new Date().toISOString() })
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      toast.success("Ticket fechado");
    },
  });

  const filteredTickets = tickets?.filter(
    (t) => !search || t.subject.toLowerCase().includes(search.toLowerCase()) || t.user_id.includes(search)
  );

  const selectedTicketData = tickets?.find((t) => t.id === selectedTicket);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-foreground">Suporte / Tickets</h1>

      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-12rem)]">
        {/* Ticket list */}
        <div className="w-full lg:w-80 flex flex-col rounded-2xl border border-border/40 bg-card overflow-hidden shrink-0">
          <div className="p-3 space-y-2 border-b border-border/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar tickets..."
                className="pl-9 h-9 text-xs"
              />
            </div>
            <div className="flex gap-1">
              {(["open", "closed", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                    filter === f ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {f === "open" ? "Abertos" : f === "closed" ? "Fechados" : "Todos"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredTickets && filteredTickets.length > 0 ? (
              filteredTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket.id)}
                  className={`w-full text-left p-3 border-b border-border/20 transition-colors hover:bg-muted/30 ${
                    selectedTicket === ticket.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {ticket.status === "open" ? (
                      <Clock className="h-3 w-3 text-yellow-500 shrink-0" />
                    ) : (
                      <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                    )}
                    <span className="text-xs font-medium text-foreground truncate">{ticket.subject || "Sem assunto"}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground pl-5">
                    {new Date(ticket.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageCircle className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">Nenhum ticket encontrado</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col rounded-2xl border border-border/40 bg-card overflow-hidden min-h-0">
          {selectedTicket && selectedTicketData ? (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between p-4 border-b border-border/30">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{selectedTicketData.subject || "Sem assunto"}</p>
                    <p className="text-[10px] text-muted-foreground">ID: {selectedTicketData.user_id.slice(0, 8)}</p>
                  </div>
                </div>
                {selectedTicketData.status === "open" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => closeTicket.mutate(selectedTicket)}
                    className="text-xs h-8"
                  >
                    <CheckCircle className="h-3 w-3 mr-1.5" />
                    Fechar
                  </Button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <AnimatePresence>
                  {ticketMessages?.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-end gap-2 ${msg.is_admin ? "justify-end" : "justify-start"}`}
                    >
                      {!msg.is_admin && (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                          msg.is_admin
                            ? "bg-gradient-gold text-primary-foreground rounded-br-sm"
                            : "bg-muted/80 text-foreground rounded-bl-sm"
                        }`}
                      >
                        {msg.message}
                        <p className={`text-[9px] mt-1 ${msg.is_admin ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Reply input */}
              {selectedTicketData.status === "open" && (
                <div className="border-t border-border/30 p-3 flex gap-2">
                  <Input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !sendReply.isPending && sendReply.mutate()}
                    placeholder="Responder..."
                    className="text-sm"
                    maxLength={1000}
                  />
                  <Button
                    onClick={() => sendReply.mutate()}
                    disabled={sendReply.isPending || !reply.trim()}
                    className="bg-gradient-gold text-primary-foreground hover:shadow-gold shrink-0"
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm">Selecione um ticket para visualizar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTickets;
