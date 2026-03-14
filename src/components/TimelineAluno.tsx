import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTable } from "@/hooks/useSupabaseQuery";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { format } from "date-fns";

export default function TimelineAluno() {
  const { data: matriculas = [] } = useTable("matriculas");
  const { data: alunos = [] } = useTable("alunos");
  const { data: cursos = [] } = useTable("cursos");
  const { data: modulos = [] } = useTable("modulos");
  const { data: progressoModulos = [] } = useTable("progresso_modulos");
  const [selectedMatricula, setSelectedMatricula] = useState("");

  const matriculasAtivas = matriculas.filter((m: any) => m.status === "Ativa");

  const timeline = useMemo(() => {
    if (!selectedMatricula) return null;
    const mat = matriculas.find((m: any) => m.id === selectedMatricula);
    if (!mat) return null;

    const aluno = alunos.find((a: any) => a.id === mat.aluno_id);
    const curso = cursos.find((c: any) => c.id === mat.curso_id);
    const progs = progressoModulos
      .filter((p: any) => p.matricula_id === mat.id)
      .sort((a: any, b: any) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime());

    const items = progs.map((p: any) => {
      const mod = modulos.find((m: any) => m.id === p.modulo_id);
      return { ...p, nomeModulo: mod?.nome || "Módulo", ordem: mod?.ordem || 0 };
    });

    const inicio = mat.data_inicio;
    const ultimoFim = items.length > 0
      ? items[items.length - 1].data_real_termino || items[items.length - 1].data_previsao_termino
      : mat.data_inicio;

    return { aluno, curso, mat, items, inicio, ultimoFim };
  }, [selectedMatricula, matriculas, alunos, cursos, modulos, progressoModulos]);

  const statusColor = (s: string) => {
    if (s === "Concluído") return "bg-primary";
    if (s === "Atrasado") return "bg-destructive";
    return "bg-muted-foreground/40";
  };

  return (
    <div>
      <div className="mb-4">
        <label className="text-sm font-medium text-foreground mb-1 block">Selecione a matrícula</label>
        <Select value={selectedMatricula} onValueChange={setSelectedMatricula}>
          <SelectTrigger className="w-full max-w-md">
            <SelectValue placeholder="Escolha um aluno/matrícula..." />
          </SelectTrigger>
          <SelectContent>
            {matriculasAtivas.map((m: any) => {
              const al = alunos.find((a: any) => a.id === m.aluno_id);
              const cu = cursos.find((c: any) => c.id === m.curso_id);
              return (
                <SelectItem key={m.id} value={m.id}>
                  {al?.nome || "?"} — {cu?.nome || "?"}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {timeline && (
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">{timeline.aluno?.nome}</h3>
            <p className="text-sm text-muted-foreground">
              {timeline.curso?.nome} · Início: {format(new Date(timeline.inicio), "dd/MM/yyyy")} · Previsão fim: {format(new Date(timeline.ultimoFim), "dd/MM/yyyy")}
            </p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-4">
              {timeline.items.map((item: any, i: number) => (
                <div key={item.id} className="relative flex items-start gap-4 pl-10">
                  <div className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full ${statusColor(item.status)} ring-2 ring-background`} />
                  <div className="flex-1 bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{item.ordem}º — {item.nomeModulo}</span>
                      <Badge variant={item.status === "Concluído" ? "default" : item.status === "Atrasado" ? "destructive" : "secondary"}>
                        {item.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-4">
                      <span>Início: {format(new Date(item.data_inicio), "dd/MM/yyyy")}</span>
                      <span>Previsão: {format(new Date(item.data_previsao_termino), "dd/MM/yyyy")}</span>
                      {item.data_real_termino && <span>Conclusão: {format(new Date(item.data_real_termino), "dd/MM/yyyy")}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {!selectedMatricula && (
        <Card className="p-8 text-center text-muted-foreground">
          Selecione uma matrícula para visualizar a linha do tempo do aluno no curso.
        </Card>
      )}
    </div>
  );
}
