import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { CalendarCheck, CalendarIcon, Save, BarChart3 } from "lucide-react";
import { useTable } from "@/hooks/useSupabaseQuery";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useUserRole, useProfessorTurmas } from "@/hooks/useUserRole";

export default function Frequencia() {
  const [turmaId, setTurmaId] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  const [presencas, setPresencas] = useState<Record<string, boolean>>({});
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"registro" | "resumo">("registro");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canManageFrequencia } = useUserRole();
  const { filterByTurma } = useProfessorTurmas();

  const { data: turmas = [] } = useTable("turmas");
  const { data: alunos = [] } = useTable("alunos");
  const { data: matriculas = [] } = useTable("matriculas");
  const { data: frequencias = [] } = useTable("frequencias");

  const turmasFiltradas = filterByTurma(turmas, "id");

  const alunosDaTurma = useMemo(() => {
    if (!turmaId) return [];
    return alunos
      .filter((a: any) => a.turma_id === turmaId && a.status === "Ativo")
      .map((a: any) => {
        const matricula = matriculas.find((m: any) => m.aluno_id === a.id && m.turma_id === turmaId && m.status === "Ativa");
        return { ...a, matricula_id: matricula?.id };
      })
      .filter((a: any) => a.matricula_id);
  }, [turmaId, alunos, matriculas]);

  const dataStr = format(date, "yyyy-MM-dd");
  const frequenciaDoDia = useMemo(() => {
    const map: Record<string, { id: string; presente: boolean; motivo?: string }> = {};
    frequencias.filter((f: any) => f.data === dataStr).forEach((f: any) => {
      map[f.matricula_id] = { id: f.id, presente: f.presente, motivo: (f as any).motivo };
    });
    return map;
  }, [frequencias, dataStr]);

  const presencaAtual = useMemo(() => {
    const result: Record<string, boolean> = {};
    alunosDaTurma.forEach((a: any) => {
      if (presencas[a.matricula_id] !== undefined) result[a.matricula_id] = presencas[a.matricula_id];
      else if (frequenciaDoDia[a.matricula_id]) result[a.matricula_id] = frequenciaDoDia[a.matricula_id].presente;
      else result[a.matricula_id] = true;
    });
    return result;
  }, [alunosDaTurma, frequenciaDoDia, presencas]);

  // Load existing motivos
  const motivoAtual = useMemo(() => {
    const result: Record<string, string> = {};
    alunosDaTurma.forEach((a: any) => {
      if (motivos[a.matricula_id] !== undefined) result[a.matricula_id] = motivos[a.matricula_id];
      else if (frequenciaDoDia[a.matricula_id]?.motivo) result[a.matricula_id] = frequenciaDoDia[a.matricula_id].motivo!;
      else result[a.matricula_id] = "";
    });
    return result;
  }, [alunosDaTurma, frequenciaDoDia, motivos]);

  const togglePresenca = (matriculaId: string) => {
    setPresencas((prev) => ({ ...prev, [matriculaId]: !(presencaAtual[matriculaId] ?? true) }));
  };

  const marcarTodos = (presente: boolean) => {
    const novo: Record<string, boolean> = {};
    alunosDaTurma.forEach((a: any) => { novo[a.matricula_id] = presente; });
    setPresencas(novo);
  };

  const salvarFrequencia = async () => {
    setSaving(true);
    try {
      for (const aluno of alunosDaTurma) {
        const presente = presencaAtual[aluno.matricula_id] ?? true;
        const motivo = motivoAtual[aluno.matricula_id] || null;
        const existente = frequenciaDoDia[aluno.matricula_id];
        if (existente) {
          await supabase.from("frequencias").update({ presente, motivo } as any).eq("id", existente.id);
        } else {
          await supabase.from("frequencias").insert({ matricula_id: aluno.matricula_id, data: dataStr, presente, motivo } as any);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["frequencias"] });
      toast({ title: "Frequência salva com sucesso!" });
      setPresencas({});
      setMotivos({});
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const resumoFaltas = useMemo(() => {
    const matsFiltradas = filterByTurma(matriculas);
    return matsFiltradas
      .filter((m: any) => (!turmaId || m.turma_id === turmaId) && m.status === "Ativa")
      .map((m: any) => {
        const aluno = alunos.find((a: any) => a.id === m.aluno_id);
        const freq = frequencias.filter((f: any) => f.matricula_id === m.id);
        const faltasGerais = freq.filter((f: any) => !f.presente).length;
        const total = freq.length;
        const presenca = total > 0 ? Math.round(((total - faltasGerais) / total) * 100) : 100;

        // Falta ao vivo: consecutive absences from most recent
        const sorted = [...freq].sort((a: any, b: any) => b.data.localeCompare(a.data));
        let faltasAoVivo = 0;
        for (const f of sorted) {
          if ((f as any).presente) break;
          faltasAoVivo++;
        }

        let nivel: "normal" | "atencao" | "critico" = "normal";
        if (faltasAoVivo === 2) nivel = "atencao";
        if (faltasAoVivo > 2) nivel = "critico";

        return { matriculaId: m.id, nome: aluno?.nome || "-", faltasGerais, faltasAoVivo, total, presenca, nivel };
      })
      .filter((f) => f.total > 0);
  }, [matriculas, alunos, frequencias, turmaId, filterByTurma]);

  const nivelBadge = (nivel: string) => {
    if (nivel === "critico") return <Badge variant="destructive">Crítico</Badge>;
    if (nivel === "atencao") return <Badge className="bg-warning text-warning-foreground">Atenção</Badge>;
    return <Badge variant="secondary">Normal</Badge>;
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Frequência</h1>
          <p className="page-description">Registro e controle de presença</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === "registro" ? "default" : "outline"} onClick={() => setView("registro")}>
            <CalendarCheck className="h-4 w-4 mr-2" />Registrar
          </Button>
          <Button variant={view === "resumo" ? "default" : "outline"} onClick={() => setView("resumo")}>
            <BarChart3 className="h-4 w-4 mr-2" />Resumo
          </Button>
        </div>
      </div>

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[200px]">
            <label className="text-sm font-medium text-foreground mb-1 block">Turma</label>
            <Select value={turmaId} onValueChange={(v) => { setTurmaId(v); setPresencas({}); setMotivos({}); }}>
              <SelectTrigger><SelectValue placeholder="Selecione a turma..." /></SelectTrigger>
              <SelectContent>
                {turmasFiltradas.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome} - {t.turno}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {view === "registro" && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Data</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{format(date, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => { if (d) { setDate(d); setPresencas({}); setMotivos({}); } }} locale={ptBR} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </Card>

      {view === "registro" ? (
        <Card>
          {!turmaId ? (
            <div className="p-8 text-center text-muted-foreground">Selecione uma turma para registrar a frequência.</div>
          ) : alunosDaTurma.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhum aluno com matrícula ativa nesta turma.</div>
          ) : (
            <>
              <div className="p-3 border-b flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{alunosDaTurma.length} aluno(s) — {format(date, "dd/MM/yyyy")}</span>
                {canManageFrequencia && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => marcarTodos(true)}>Todos Presentes</Button>
                    <Button size="sm" variant="outline" onClick={() => marcarTodos(false)}>Todos Ausentes</Button>
                  </div>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center w-28">Presente</TableHead>
                    <TableHead className="w-64">Motivo da Falta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alunosDaTurma.map((a: any, i: number) => {
                    const ausente = !(presencaAtual[a.matricula_id] ?? true);
                    return (
                      <TableRow key={a.id} className={ausente ? "bg-destructive/5" : ""}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{a.nome}</TableCell>
                        <TableCell className="text-muted-foreground">{a.email || "-"}</TableCell>
                        <TableCell className="text-center">
                          <Checkbox checked={presencaAtual[a.matricula_id] ?? true} onCheckedChange={() => togglePresenca(a.matricula_id)} disabled={!canManageFrequencia} />
                        </TableCell>
                        <TableCell>
                          {ausente && canManageFrequencia ? (
                            <Input
                              placeholder="Motivo da falta..."
                              value={motivoAtual[a.matricula_id] || ""}
                              onChange={(e) => setMotivos(prev => ({ ...prev, [a.matricula_id]: e.target.value }))}
                              className="h-8 text-xs"
                            />
                          ) : ausente ? (
                            <span className="text-xs text-muted-foreground">{motivoAtual[a.matricula_id] || "—"}</span>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {canManageFrequencia && (
                <div className="p-4 border-t flex justify-end">
                  <Button onClick={salvarFrequencia} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />{saving ? "Salvando..." : "Salvar Frequência"}
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Faltas ao Vivo</TableHead>
                <TableHead>Faltas Gerais</TableHead>
                <TableHead>Presenças</TableHead>
                <TableHead>% Presença</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resumoFaltas.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum registro.</TableCell></TableRow>
              ) : resumoFaltas.map((f) => (
                <TableRow key={f.matriculaId} className={f.nivel === "critico" ? "bg-destructive/5" : f.nivel === "atencao" ? "bg-warning/5" : ""}>
                  <TableCell className="font-medium">{f.nome}</TableCell>
                  <TableCell className="font-bold">{f.faltasAoVivo}</TableCell>
                  <TableCell>{f.faltasGerais}</TableCell>
                  <TableCell>{f.total - f.faltasGerais}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full">
                        <div className={`h-full rounded-full ${f.presenca >= 75 ? "bg-primary" : "bg-destructive"}`} style={{ width: `${f.presenca}%` }} />
                      </div>
                      <span className="text-xs">{f.presenca}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{nivelBadge(f.nivel)}</TableCell>
                  <TableCell>
                    <Badge variant={f.presenca >= 75 ? "default" : "destructive"}>{f.presenca >= 75 ? "Regular" : "Irregular"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
