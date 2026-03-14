import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Eye, History } from "lucide-react";
import { useTable } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Notificacoes() {
  const { data: notificacoes = [] } = useTable("notificacoes", { order: { column: "data", ascending: false } });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState("pendentes");

  const naoLidas = notificacoes.filter((n: any) => !n.lida);
  const lidas = notificacoes.filter((n: any) => n.lida);

  const marcarComoLida = async (id: string) => {
    await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    toast({ title: "Notificação marcada como lida" });
  };

  const marcarTodasLidas = async () => {
    for (const n of naoLidas) {
      await supabase.from("notificacoes").update({ lida: true }).eq("id", n.id);
    }
    queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    toast({ title: "Todas as notificações foram marcadas como lidas" });
  };

  const renderNotificacao = (n: any, showMarkButton: boolean) => (
    <Card key={n.id} className={`p-4 border-l-4 ${
      n.tipo === 'danger' ? 'border-l-destructive' :
      n.tipo === 'warning' ? 'border-l-warning' : 'border-l-info'
    } ${n.lida ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-sm">{n.titulo}</p>
            {!n.lida && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Nova</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{n.mensagem}</p>
          <p className="text-xs text-muted-foreground mt-1">{new Date(n.data).toLocaleDateString('pt-BR')}</p>
        </div>
        {showMarkButton && !n.lida && (
          <Button variant="ghost" size="sm" onClick={() => marcarComoLida(n.id)} title="Marcar como lida">
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Notificações</h1>
          <p className="page-description">Alertas e avisos do sistema</p>
        </div>
        {naoLidas.length > 0 && (
          <Button variant="outline" size="sm" onClick={marcarTodasLidas}>
            <Check className="h-4 w-4 mr-2" />Marcar todas como lidas
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="pendentes" className="gap-2">
            Pendentes {naoLidas.length > 0 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{naoLidas.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="h-3.5 w-3.5" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes">
          <div className="space-y-3">
            {naoLidas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma notificação pendente.</p>
            ) : naoLidas.map((n: any) => renderNotificacao(n, true))}
          </div>
        </TabsContent>

        <TabsContent value="historico">
          <div className="space-y-3">
            {lidas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma notificação no histórico.</p>
            ) : lidas.map((n: any) => renderNotificacao(n, false))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
