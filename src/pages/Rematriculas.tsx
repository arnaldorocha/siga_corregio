import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTable } from "@/hooks/useSupabaseQuery";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw, Users, CheckCircle2, Clock, PhoneOff, XCircle,
  TrendingUp, AlertTriangle, Search, Filter, Target, BarChart3, Download, BookOpen
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const STATUS_OPTIONS = ["Confirmada", "Pendente", "Não respondeu", "Não vai rematricular"];
const INTERESSE_OPTIONS = ["Alto interesse", "Médio interesse", "Baixo interesse", "Não tem interesse"];

const STATUS_COLORS: Record<string, string> = {
  "Confirmada": "#2563eb",
  "Pendente": "#eab308",
  "Não respondeu": "#6b7280",
  "Não vai rematricular": "#dc2626",
};

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  "Confirmada": "default",
  "Pendente": "secondary",
  "Não respondeu": "outline",
  "Não vai rematricular": "destructive",
};

function calcRiscoEvasao(aluno: any, frequencias: any[], matriculas: any[]) {
  let score = 0;
  const mat = matriculas.find((m: any) => m.aluno_id === aluno.id && m.status === "Ativa");
  if (mat) {
    const faltas = frequencias.filter((f: any) => f.matricula_id === mat.id && !f.presente).length;
    if (faltas > 3) score += 2;
  }
  if (aluno.interesse_rematricula === "Baixo interesse" || aluno.interesse_rematricula === "Não tem interesse") score += 3;
  if (aluno.status_rematricula === "Não respondeu") score += 2;
  if (aluno.status_rematricula === "Pendente") score += 1;
  return score;
}

export default function Rematriculas() {
  const { data: alunos = [] } = useTable("alunos");
  const { data: turmas = [] } = useTable("turmas");
  const { data: cursos = [] } = useTable("cursos");
  const { data: matriculas = [] } = useTable("matriculas");
  const { data: frequencias = [] } = useTable("frequencias");
  const { data: professorTurmas = [] } = useTable("professor_turmas");
  const { data: profiles = [] } = useTable("profiles");
  const { canEdit } = useUserRole();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroInteresse, setFiltroInteresse] = useState("todos");
  const [busca, setBusca] = useState("");
  const [tab, setTab] = useState<"dashboard" | "lista" | "risco" | "previsao">("dashboard");

  const alunosAtivos = useMemo(() => alunos.filter((a: any) => a.status === "Ativo"), [alunos]);

  const stats = useMemo(() => {
    const total = alunosAtivos.length;
    const confirmadas = alunosAtivos.filter((a: any) => a.status_rematricula === "Confirmada").length;
    const pendentes = alunosAtivos.filter((a: any) => a.status_rematricula === "Pendente").length;
    const semResposta = alunosAtivos.filter((a: any) => a.status_rematricula === "Não respondeu").length;
    const naoVai = alunosAtivos.filter((a: any) => a.status_rematricula === "Não vai rematricular").length;
    const taxa = total > 0 ? (confirmadas / total) * 100 : 0;
    return { total, confirmadas, pendentes, semResposta, naoVai, taxa };
  }, [alunosAtivos]);

  const pieData = [
    { name: "Confirmadas", value: stats.confirmadas },
    { name: "Pendentes", value: stats.pendentes },
    { name: "Sem resposta", value: stats.semResposta },
    { name: "Não vai", value: stats.naoVai },
  ].filter(d => d.value > 0);

  const interesseData = useMemo(() => {
    return INTERESSE_OPTIONS.map(i => ({
      name: i.replace(" interesse", "").replace("Não tem ", "Nenhum"),
      value: alunosAtivos.filter((a: any) => a.interesse_rematricula === i).length,
    }));
  }, [alunosAtivos]);

  const alunosFiltrados = useMemo(() => {
    return alunosAtivos.filter((a: any) => {
      if (filtroStatus !== "todos" && a.status_rematricula !== filtroStatus) return false;
      if (filtroInteresse !== "todos" && a.interesse_rematricula !== filtroInteresse) return false;
      if (busca && !a.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [alunosAtivos, filtroStatus, filtroInteresse, busca]);

  const alunosComRisco = useMemo(() => {
    return alunosAtivos.map((a: any) => ({
      ...a,
      risco: calcRiscoEvasao(a, frequencias, matriculas),
      turma_nome: turmas.find((t: any) => t.id === a.turma_id)?.nome || "-",
    })).sort((a: any, b: any) => b.risco - a.risco);
  }, [alunosAtivos, frequencias, matriculas, turmas]);

  const previsao = useMemo(() => {
    const total = alunosAtivos.length;
    if (total === 0) return null;
    let estimados = 0;
    alunosAtivos.forEach((a: any) => {
      if (a.status_rematricula === "Confirmada") { estimados += 1; return; }
      if (a.status_rematricula === "Não vai rematricular") return;
      let prob = 0.5;
      if (a.interesse_rematricula === "Alto interesse") prob = 0.85;
      else if (a.interesse_rematricula === "Médio interesse") prob = 0.6;
      else if (a.interesse_rematricula === "Baixo interesse") prob = 0.25;
      else if (a.interesse_rematricula === "Não tem interesse") prob = 0.05;
      const mat = matriculas.find((m: any) => m.aluno_id === a.id && m.status === "Ativa");
      if (mat) {
        const faltas = frequencias.filter((f: any) => f.matricula_id === mat.id && !f.presente).length;
        if (faltas > 5) prob *= 0.5;
        else if (faltas > 3) prob *= 0.7;
      }
      estimados += prob;
    });
    const taxaPrevista = (estimados / total) * 100;
    return { total, estimados: Math.round(estimados), taxaPrevista, saudavel: taxaPrevista >= 70, minimo: taxaPrevista >= 40 };
  }, [alunosAtivos, matriculas, frequencias]);

  const handleUpdateStatus = async (alunoId: string, field: string, value: string) => {
    await supabase.from("alunos").update({ [field]: value } as any).eq("id", alunoId);
    queryClient.invalidateQueries({ queryKey: ["alunos"] });
    toast({ title: "Atualizado!" });
  };

  const getTurmaNome = (id: string) => turmas.find((t: any) => t.id === id)?.nome || "-";

  const getProfessorByTurma = (turmaId: string) => {
    const pt = professorTurmas.find((p: any) => p.turma_id === turmaId);
    if (!pt) return "-";
    const profile = profiles.find((p: any) => p.user_id === pt.user_id);
    return profile?.display_name || "-";
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const hoje = new Date().toLocaleDateString("pt-BR");

    // Title
    doc.setFontSize(18);
    doc.text("Relatório de Rematrículas", 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${hoje}`, 14, 28);

    // Metrics
    doc.setFontSize(12);
    doc.text("Métricas Gerais", 14, 40);
    autoTable(doc, {
      startY: 44,
      head: [["Métrica", "Valor"]],
      body: [
        ["Total de Alunos Ativos", String(stats.total)],
        ["Rematrículas Confirmadas", String(stats.confirmadas)],
        ["Pendentes", String(stats.pendentes)],
        ["Sem Resposta", String(stats.semResposta)],
        ["Não Vai Rematricular", String(stats.naoVai)],
        ["Taxa de Rematrícula", `${stats.taxa.toFixed(1)}%`],
        ["Situação", stats.taxa >= 70 ? "Saudável" : stats.taxa >= 40 ? "Atenção" : "Crítico"],
      ],
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
    });

    // Pending students
    const pendentes = alunosAtivos.filter((a: any) => a.status_rematricula !== "Confirmada" && a.status_rematricula !== "Não vai rematricular");
    const lastY = (doc as any).lastAutoTable?.finalY || 90;
    doc.setFontSize(12);
    doc.text("Alunos Pendentes de Rematrícula", 14, lastY + 12);
    autoTable(doc, {
      startY: lastY + 16,
      head: [["Nome", "Turma", "Status", "Interesse", "Curso Indicado", "Telefone"]],
      body: pendentes.map((a: any) => [
        a.nome,
        getTurmaNome(a.turma_id),
        a.status_rematricula || "Pendente",
        a.interesse_rematricula || "-",
        a.curso_indicado || "-",
        a.telefone || a.telefone_responsavel || "-",
      ]),
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8 },
    });

    // Risk students
    const riscoAltos = alunosComRisco.filter((a: any) => a.risco >= 5);
    if (riscoAltos.length > 0) {
      const lastY2 = (doc as any).lastAutoTable?.finalY || 160;
      if (lastY2 > 240) doc.addPage();
      const startY = lastY2 > 240 ? 20 : lastY2 + 12;
      doc.setFontSize(12);
      doc.text("Alunos em Risco Alto de Evasão (≥5 pts)", 14, startY);
      autoTable(doc, {
        startY: startY + 4,
        head: [["Nome", "Turma", "Risco", "Status", "Interesse"]],
        body: riscoAltos.map((a: any) => [
          a.nome, a.turma_nome, `${a.risco} pts`, a.status_rematricula || "Pendente", a.interesse_rematricula || "-",
        ]),
        theme: "grid",
        headStyles: { fillColor: [220, 38, 38] },
        styles: { fontSize: 8 },
      });
    }

    // Prediction
    if (previsao) {
      const lastY3 = (doc as any).lastAutoTable?.finalY || 200;
      if (lastY3 > 250) doc.addPage();
      const startY = lastY3 > 250 ? 20 : lastY3 + 12;
      doc.setFontSize(12);
      doc.text("Previsão de Rematrículas", 14, startY);
      autoTable(doc, {
        startY: startY + 4,
        head: [["Métrica", "Valor"]],
        body: [
          ["Total de Alunos", String(previsao.total)],
          ["Estimativa de Rematrículas", String(previsao.estimados)],
          ["Taxa Prevista", `${previsao.taxaPrevista.toFixed(1)}%`],
          ["Situação", previsao.saudavel ? "Saudável" : previsao.minimo ? "Atenção" : "Crítico"],
        ],
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235] },
      });
    }

    doc.save(`relatorio-rematriculas-${hoje.replace(/\//g, "-")}.pdf`);
    toast({ title: "PDF exportado!", description: "Relatório salvo com sucesso." });
  };

  const metaMin = 40;
  const metaSaudavel = 70;

  return (
    <div>
      <div className="page-header flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2"><RefreshCw className="h-6 w-6" /> Rematrículas</h1>
          <p className="page-description">Gestão de rematrículas, métricas e previsão de evasão</p>
        </div>
        <Button variant="outline" onClick={exportPDF}>
          <Download className="h-4 w-4 mr-2" />Exportar PDF
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {([
          { key: "dashboard", label: "Dashboard", icon: BarChart3 },
          { key: "lista", label: "Lista de Alunos", icon: Users },
          { key: "risco", label: "Risco de Evasão", icon: AlertTriangle },
          { key: "previsao", label: "Previsão", icon: Target },
        ] as const).map(t => (
          <Button key={t.key} variant={tab === t.key ? "default" : "outline"} size="sm" onClick={() => setTab(t.key)}>
            <t.icon className="h-4 w-4 mr-1.5" />{t.label}
          </Button>
        ))}
      </div>

      {/* DASHBOARD TAB */}
      {tab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Total Alunos", value: stats.total, icon: Users, color: "text-primary", bg: "bg-primary/10" },
              { label: "Confirmadas", value: stats.confirmadas, icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10" },
              { label: "Pendentes", value: stats.pendentes, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
              { label: "Sem Resposta", value: stats.semResposta, icon: PhoneOff, color: "text-muted-foreground", bg: "bg-muted" },
              { label: "Não Vai", value: stats.naoVai, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
              { label: "Taxa", value: `${stats.taxa.toFixed(1)}%`, icon: TrendingUp, color: stats.taxa >= 70 ? "text-primary" : stats.taxa >= 40 ? "text-warning" : "text-destructive", bg: stats.taxa >= 70 ? "bg-primary/10" : stats.taxa >= 40 ? "bg-warning/10" : "bg-destructive/10" },
            ].map(s => (
              <Card key={s.label} className="p-4 border-0 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="p-5 border-0 shadow-sm">
              <h3 className="font-semibold mb-4 text-sm">Status de Rematrícula</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name === "Não vai" ? "Não vai rematricular" : entry.name === "Sem resposta" ? "Não respondeu" : entry.name === "Pendentes" ? "Pendente" : "Confirmada"]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5 border-0 shadow-sm">
              <h3 className="font-semibold mb-4 text-sm">Interesse dos Alunos</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={interesseData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="p-5 border-0 shadow-sm">
            <h3 className="font-semibold mb-3 text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Meta de Rematrícula</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                  <div className="absolute h-full bg-destructive/30 rounded-full" style={{ width: `${metaMin}%` }} />
                  <div className="absolute h-full bg-warning/40 rounded-full" style={{ width: `${metaSaudavel}%` }} />
                  <div className={`absolute h-full rounded-full transition-all ${stats.taxa >= metaSaudavel ? "bg-primary" : stats.taxa >= metaMin ? "bg-warning" : "bg-destructive"}`} style={{ width: `${Math.min(stats.taxa, 100)}%` }} />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>0%</span>
                  <span className="text-destructive">Mín: 40%</span>
                  <span className="text-primary">Saudável: 70%</span>
                  <span>100%</span>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold ${stats.taxa >= metaSaudavel ? "text-primary" : stats.taxa >= metaMin ? "text-warning" : "text-destructive"}`}>{stats.taxa.toFixed(1)}%</p>
                <Badge variant={stats.taxa >= metaSaudavel ? "default" : stats.taxa >= metaMin ? "secondary" : "destructive"}>
                  {stats.taxa >= metaSaudavel ? "Saudável" : stats.taxa >= metaMin ? "Atenção" : "Crítico"}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* LISTA TAB */}
      {tab === "lista" && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar aluno..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[200px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroInteresse} onValueChange={setFiltroInteresse}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Interesse" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os interesses</SelectItem>
                {INTERESSE_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Status Rematrícula</TableHead>
                  <TableHead>Interesse</TableHead>
                  <TableHead>Curso Indicado</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Telefone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alunosFiltrados.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum aluno encontrado</TableCell></TableRow>
                ) : alunosFiltrados.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.nome}</TableCell>
                    <TableCell className="text-xs">{getTurmaNome(a.turma_id)}</TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Select value={a.status_rematricula || "Pendente"} onValueChange={v => handleUpdateStatus(a.id, "status_rematricula", v)}>
                          <SelectTrigger className="h-8 text-xs w-[160px]"><SelectValue /></SelectTrigger>
                          <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={STATUS_BADGE[a.status_rematricula] || "outline"}>{a.status_rematricula || "Pendente"}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Select value={a.interesse_rematricula || ""} onValueChange={v => handleUpdateStatus(a.id, "interesse_rematricula", v)}>
                          <SelectTrigger className="h-8 text-xs w-[160px]"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                          <SelectContent>{INTERESSE_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs">{a.interesse_rematricula || "-"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Select value={a.curso_indicado || ""} onValueChange={v => handleUpdateStatus(a.id, "curso_indicado", v)}>
                          <SelectTrigger className="h-8 text-xs w-[150px]"><BookOpen className="h-3 w-3 mr-1" /><SelectValue placeholder="Indicar..." /></SelectTrigger>
                          <SelectContent>{cursos.map((c: any) => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs">{a.curso_indicado || "-"}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{getProfessorByTurma(a.turma_id)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.data_contato_rematricula ? new Date(a.data_contato_rematricula + "T12:00:00").toLocaleDateString("pt-BR") : "-"}
                    </TableCell>
                    <TableCell className="text-xs">{a.telefone || a.telefone_responsavel || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* RISCO TAB */}
      {tab === "risco" && (
        <div className="space-y-4">
          <Card className="p-4 border-0 shadow-sm">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Índice de Risco de Evasão</h3>
            <p className="text-xs text-muted-foreground mb-1">Pontuação: Faltas &gt;3 = +2pts | Interesse baixo/nenhum = +3pts | Sem resposta = +2pts | Pendente = +1pt</p>
            <p className="text-xs text-muted-foreground">Risco alto: ≥5 pontos | Risco médio: 3-4 pontos</p>
          </Card>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Interesse</TableHead>
                  <TableHead>Curso Indicado</TableHead>
                  <TableHead>Telefone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alunosComRisco.filter((a: any) => a.risco > 0).length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum aluno em risco identificado</TableCell></TableRow>
                ) : alunosComRisco.filter((a: any) => a.risco > 0).map((a: any) => (
                  <TableRow key={a.id} className={a.risco >= 5 ? "bg-destructive/5" : a.risco >= 3 ? "bg-warning/5" : ""}>
                    <TableCell className="font-medium">{a.nome}</TableCell>
                    <TableCell className="text-xs">{a.turma_nome}</TableCell>
                    <TableCell>
                      <Badge variant={a.risco >= 5 ? "destructive" : a.risco >= 3 ? "secondary" : "outline"}>
                        {a.risco} pts — {a.risco >= 5 ? "ALTO" : a.risco >= 3 ? "MÉDIO" : "BAIXO"}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant={STATUS_BADGE[a.status_rematricula] || "outline"} className="text-[10px]">{a.status_rematricula || "Pendente"}</Badge></TableCell>
                    <TableCell className="text-xs">{a.interesse_rematricula || "-"}</TableCell>
                    <TableCell className="text-xs">{a.curso_indicado || "-"}</TableCell>
                    <TableCell className="text-xs">{a.telefone || a.telefone_responsavel || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* PREVISAO TAB */}
      {tab === "previsao" && previsao && (
        <div className="space-y-5">
          <Card className="p-6 border-0 shadow-sm">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Previsão de Rematrículas</h3>
            <p className="text-sm text-muted-foreground mb-4">Baseado no interesse declarado, faltas e histórico de participação.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <p className="text-3xl font-bold text-foreground">{previsao.total}</p>
                <p className="text-xs text-muted-foreground">Total de Alunos</p>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-xl">
                <p className="text-3xl font-bold text-primary">{previsao.estimados}</p>
                <p className="text-xs text-muted-foreground">Estimativa de Rematrículas</p>
              </div>
              <div className={`text-center p-4 rounded-xl ${previsao.saudavel ? "bg-primary/10" : previsao.minimo ? "bg-warning/10" : "bg-destructive/10"}`}>
                <p className={`text-3xl font-bold ${previsao.saudavel ? "text-primary" : previsao.minimo ? "text-warning" : "text-destructive"}`}>
                  {previsao.taxaPrevista.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Taxa Prevista</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-0 shadow-sm">
            <h3 className="font-semibold text-sm mb-3">Referência de Metas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { tipo: "Cursos", taxa: "70%", cor: "bg-primary/10 text-primary" },
                { tipo: "Escola Particular", taxa: "80%", cor: "bg-primary/10 text-primary" },
                { tipo: "Projetos Educacionais", taxa: "60–75%", cor: "bg-secondary/10 text-secondary-foreground" },
              ].map(r => (
                <div key={r.tipo} className={`p-3 rounded-lg ${r.cor}`}>
                  <p className="text-sm font-medium">{r.tipo}</p>
                  <p className="text-lg font-bold">{r.taxa}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 border-0 shadow-sm">
            <h3 className="font-semibold text-sm mb-3">Campanha de Rematrícula — Cronograma Recomendado</h3>
            <div className="space-y-2">
              {[
                { contato: "1º Contato", quando: "2 meses antes", desc: "Pesquisa de interesse e intenção" },
                { contato: "2º Contato", quando: "1 mês antes", desc: "Oferta de incentivos (desconto, vaga garantida)" },
                { contato: "3º Contato", quando: "15 dias antes", desc: "Último prazo, confirmação final" },
              ].map(c => (
                <div key={c.contato} className="flex items-center gap-4 p-3 bg-muted/40 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{c.contato} — {c.quando}</p>
                    <p className="text-xs text-muted-foreground">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 border-0 shadow-sm">
            <h3 className="font-semibold text-sm mb-3">Estratégias de Incentivo</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {["Desconto antecipado", "Vaga garantida", "Material incluso", "Bônus exclusivo"].map(i => (
                <div key={i} className="p-3 bg-primary/5 rounded-lg text-center">
                  <p className="text-sm font-medium text-primary">{i}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "previsao" && !previsao && (
        <Card className="p-8 text-center text-muted-foreground">Nenhum aluno ativo para gerar previsão.</Card>
      )}
    </div>
  );
}
