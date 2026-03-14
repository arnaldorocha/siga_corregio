import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cake } from "lucide-react";
import { useTable } from "@/hooks/useSupabaseQuery";

export function AniversariosCard() {
  const { data: alunos = [] } = useTable("alunos");

  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const diaAtual = hoje.getDate();

  const aniversariantes = alunos
    .filter((a: any) => {
      if (!a.data_nascimento || a.status !== "Ativo") return false;
      const d = new Date(a.data_nascimento + "T12:00:00");
      return d.getMonth() === mesAtual;
    })
    .map((a: any) => {
      const d = new Date(a.data_nascimento + "T12:00:00");
      const dia = d.getDate();
      const idade = hoje.getFullYear() - d.getFullYear();
      const isToday = dia === diaAtual;
      const isPast = dia < diaAtual;
      return { ...a, dia, idade, isToday, isPast };
    })
    .sort((a: any, b: any) => a.dia - b.dia);

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  if (aniversariantes.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Cake className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-sm">Aniversariantes de {meses[mesAtual]}</h3>
        <Badge variant="secondary" className="ml-auto">{aniversariantes.length}</Badge>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {aniversariantes.map((a: any) => (
          <div key={a.id} className={`flex items-center justify-between text-sm p-2 rounded ${a.isToday ? "bg-primary/10 border border-primary/30" : ""}`}>
            <div className="flex items-center gap-2">
              {a.isToday && <span className="text-lg">🎂</span>}
              <div>
                <p className={`font-medium ${a.isToday ? "text-primary" : a.isPast ? "text-muted-foreground" : ""}`}>{a.nome}</p>
                <p className="text-xs text-muted-foreground">{a.dia}/{mesAtual + 1} — {a.idade} anos</p>
              </div>
            </div>
            {a.isToday && <Badge className="bg-primary text-primary-foreground">Hoje!</Badge>}
          </div>
        ))}
      </div>
    </Card>
  );
}
