import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileBarChart, Users, BookOpen, GraduationCap, CalendarX, Award, Download, Loader2, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTable } from "@/hooks/useSupabaseQuery";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ReportKey = "alunos_turma" | "progresso" | "carga_horaria" | "modulos_andamento" | "faltas" | "certificacoes";

const reports: { key: ReportKey; title: string; description: string; icon: any }[] = [
  { key: "alunos_turma", title: "Alunos Ativos por Turma", description: "Lista de alunos ativos agrupados por turma", icon: Users },
  { key: "progresso", title: "Progresso por Aluno", description: "Status de módulos e progresso individual", icon: GraduationCap },
  { key: "carga_horaria", title: "Carga Horária Concluída", description: "Total de horas concluídas por aluno", icon: BookOpen },
  { key: "modulos_andamento", title: "Módulos em Andamento", description: "Módulos atualmente em curso", icon: FileBarChart },
  { key: "faltas", title: "Faltas por Aluno", description: "Relatório de frequência e faltas", icon: CalendarX },
  { key: "certificacoes", title: "Certificações", description: "Alunos aptos a receber certificado", icon: Award },
];

interface Filters {
  turmaId: string;
  dataInicio: string;
  dataFim: string;
}

async function fetchReportData(key: ReportKey, filters: Filters) {
  const { turmaId, dataInicio, dataFim } = filters;

  switch (key) {
    case "alunos_turma": {
      const { data: alunos } = await supabase.from("alunos").select("*");
      const { data: turmas } = await supabase.from("turmas").select("*");
      const turmaMap = Object.fromEntries((turmas || []).map(t => [t.id, t.nome]));
      const filtered = (alunos || []).filter(a => {
        if (a.status !== "Ativo") return false;
        if (turmaId && a.turma_id !== turmaId) return false;
        return true;
      });
      return {
        title: "Alunos Ativos por Turma",
        headers: ["Nome", "Email", "Telefone", "Turma", "Status"],
        rows: filtered.map(a => [
          a.nome, a.email || "-", a.telefone || "-", turmaMap[a.turma_id || ""] || "Sem turma", a.status
        ]),
      };
    }
    case "progresso": {
      const { data: prog } = await supabase.from("progresso_modulos").select("*");
      const { data: modulos } = await supabase.from("modulos").select("*");
      const { data: matriculas } = await supabase.from("matriculas").select("*");
      const { data: alunos } = await supabase.from("alunos").select("*");
      const alunoMap = Object.fromEntries((alunos || []).map(a => [a.id, { nome: a.nome, turma_id: a.turma_id }]));
      const matMap = Object.fromEntries((matriculas || []).map(m => [m.id, m.aluno_id]));
      const modMap = Object.fromEntries((modulos || []).map(m => [m.id, m.nome]));
      const filtered = (prog || []).filter(p => {
        const alunoId = matMap[p.matricula_id] || "";
        const aluno = alunoMap[alunoId];
        if (turmaId && aluno?.turma_id !== turmaId) return false;
        if (dataInicio && p.data_inicio < dataInicio) return false;
        if (dataFim && p.data_inicio > dataFim) return false;
        return true;
      });
      return {
        title: "Progresso por Aluno",
        headers: ["Aluno", "Módulo", "Status", "Início", "Previsão Término", "Término Real"],
        rows: filtered.map(p => [
          alunoMap[matMap[p.matricula_id] || ""]?.nome || "-",
          modMap[p.modulo_id] || "-",
          p.status,
          p.data_inicio,
          p.data_previsao_termino,
          p.data_real_termino || "Em andamento"
        ]),
      };
    }
    case "carga_horaria": {
      const { data: prog } = await supabase.from("progresso_modulos").select("*");
      const { data: modulos } = await supabase.from("modulos").select("*");
      const { data: matriculas } = await supabase.from("matriculas").select("*");
      const { data: alunos } = await supabase.from("alunos").select("*");
      const alunoMap = Object.fromEntries((alunos || []).map(a => [a.id, { nome: a.nome, turma_id: a.turma_id }]));
      const matMap = Object.fromEntries((matriculas || []).map(m => [m.id, m.aluno_id]));
      const modMap = Object.fromEntries((modulos || []).map(m => [m.id, m.carga_horaria]));

      const alunoHoras: Record<string, { total: number; concluida: number }> = {};
      (prog || []).forEach(p => {
        const alunoId = matMap[p.matricula_id] || "";
        const aluno = alunoMap[alunoId];
        if (turmaId && aluno?.turma_id !== turmaId) return;
        const nome = aluno?.nome || "Desconhecido";
        const ch = modMap[p.modulo_id] || 0;
        if (!alunoHoras[nome]) alunoHoras[nome] = { total: 0, concluida: 0 };
        alunoHoras[nome].total += ch;
        if (p.status === "Concluído") alunoHoras[nome].concluida += ch;
      });

      return {
        title: "Carga Horária Concluída",
        headers: ["Aluno", "CH Total (h)", "CH Concluída (h)", "% Concluída"],
        rows: Object.entries(alunoHoras).map(([nome, h]) => [
          nome, String(h.total), String(h.concluida), h.total > 0 ? `${Math.round((h.concluida / h.total) * 100)}%` : "0%"
        ]),
      };
    }
    case "modulos_andamento": {
      const { data: prog } = await supabase.from("progresso_modulos").select("*");
      const { data: modulos } = await supabase.from("modulos").select("*");
      const { data: matriculas } = await supabase.from("matriculas").select("*");
      const { data: alunos } = await supabase.from("alunos").select("*");
      const { data: cursos } = await supabase.from("cursos").select("*");
      const alunoMap = Object.fromEntries((alunos || []).map(a => [a.id, { nome: a.nome, turma_id: a.turma_id }]));
      const matMap = Object.fromEntries((matriculas || []).map(m => [m.id, { aluno: m.aluno_id, curso: m.curso_id }]));
      const modMap = Object.fromEntries((modulos || []).map(m => [m.id, m.nome]));
      const cursoMap = Object.fromEntries((cursos || []).map(c => [c.id, c.nome]));
      return {
        title: "Módulos em Andamento",
        headers: ["Aluno", "Curso", "Módulo", "Início", "Previsão Término"],
        rows: (prog || []).filter(p => {
          if (p.status !== "Em andamento") return false;
          const mat = matMap[p.matricula_id] || { aluno: "", curso: "" };
          const aluno = alunoMap[mat.aluno];
          if (turmaId && aluno?.turma_id !== turmaId) return false;
          if (dataInicio && p.data_inicio < dataInicio) return false;
          if (dataFim && p.data_inicio > dataFim) return false;
          return true;
        }).map(p => {
          const mat = matMap[p.matricula_id] || { aluno: "", curso: "" };
          return [
            alunoMap[mat.aluno]?.nome || "-",
            cursoMap[mat.curso] || "-",
            modMap[p.modulo_id] || "-",
            p.data_inicio,
            p.data_previsao_termino,
          ];
        }),
      };
    }
    case "faltas": {
      const { data: freq } = await supabase.from("frequencias").select("*");
      const { data: matriculas } = await supabase.from("matriculas").select("*");
      const { data: alunos } = await supabase.from("alunos").select("*");
      const alunoMap = Object.fromEntries((alunos || []).map(a => [a.id, { nome: a.nome, turma_id: a.turma_id }]));
      const matMap = Object.fromEntries((matriculas || []).map(m => [m.id, m.aluno_id]));

      const faltasMap: Record<string, { total: number; faltas: number }> = {};
      (freq || []).forEach(f => {
        const alunoId = matMap[f.matricula_id] || "";
        const aluno = alunoMap[alunoId];
        if (turmaId && aluno?.turma_id !== turmaId) return;
        if (dataInicio && f.data < dataInicio) return;
        if (dataFim && f.data > dataFim) return;
        const nome = aluno?.nome || "Desconhecido";
        if (!faltasMap[nome]) faltasMap[nome] = { total: 0, faltas: 0 };
        faltasMap[nome].total++;
        if (!f.presente) faltasMap[nome].faltas++;
      });

      return {
        title: "Faltas por Aluno",
        headers: ["Aluno", "Total Aulas", "Faltas", "% Frequência"],
        rows: Object.entries(faltasMap).map(([nome, d]) => [
          nome, String(d.total), String(d.faltas),
          d.total > 0 ? `${Math.round(((d.total - d.faltas) / d.total) * 100)}%` : "0%"
        ]),
      };
    }
    case "certificacoes": {
      const { data: prog } = await supabase.from("progresso_modulos").select("*");
      const { data: matriculas } = await supabase.from("matriculas").select("*");
      const { data: alunos } = await supabase.from("alunos").select("*");
      const { data: cursos } = await supabase.from("cursos").select("*");
      const alunoMap = Object.fromEntries((alunos || []).map(a => [a.id, { nome: a.nome, turma_id: a.turma_id }]));
      const cursoMap = Object.fromEntries((cursos || []).map(c => [c.id, { nome: c.nome, ch: c.carga_horaria_total }]));
      const matMap = Object.fromEntries((matriculas || []).map(m => [m.id, { aluno: m.aluno_id, curso: m.curso_id }]));

      const matProgress: Record<string, { total: number; concluidos: number }> = {};
      (prog || []).forEach(p => {
        if (!matProgress[p.matricula_id]) matProgress[p.matricula_id] = { total: 0, concluidos: 0 };
        matProgress[p.matricula_id].total++;
        if (p.status === "Concluído") matProgress[p.matricula_id].concluidos++;
      });

      const aptos: string[][] = [];
      Object.entries(matProgress).forEach(([matId, mp]) => {
        if (mp.total > 0 && mp.concluidos === mp.total) {
          const mat = matMap[matId];
          if (mat) {
            const aluno = alunoMap[mat.aluno];
            if (turmaId && aluno?.turma_id !== turmaId) return;
            const curso = cursoMap[mat.curso] || { nome: "-", ch: 0 };
            aptos.push([aluno?.nome || "-", curso.nome, String(curso.ch), "Apto"]);
          }
        }
      });

      return {
        title: "Certificações",
        headers: ["Aluno", "Curso", "Carga Horária", "Status"],
        rows: aptos.length > 0 ? aptos : [["Nenhum aluno apto no momento", "-", "-", "-"]],
      };
    }
  }
}

function exportToExcel(title: string, headers: string[], rows: string[][]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
  XLSX.writeFile(wb, `${title.replace(/\s+/g, "_")}.xlsx`);
}

function exportToPdf(title: string, headers: string[], rows: string[][]) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 20);
  doc.setFontSize(8);
  doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 27);
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 32,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [59, 130, 246] },
  });
  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}

export default function Relatorios() {
  const [loading, setLoading] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ turmaId: "", dataInicio: "", dataFim: "" });
  const { data: turmas = [] } = useTable("turmas");
  const { toast } = useToast();

  const handleExport = async (key: ReportKey, format: "xlsx" | "pdf") => {
    setLoading(`${key}_${format}`);
    try {
      const data = await fetchReportData(key, filters);
      if (format === "xlsx") {
        exportToExcel(data.title, data.headers, data.rows);
      } else {
        exportToPdf(data.title, data.headers, data.rows);
      }
      toast({ title: "Relatório gerado!", description: `${data.title} exportado como ${format.toUpperCase()}.` });
    } catch (err: any) {
      toast({ title: "Erro ao gerar relatório", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Relatórios</h1>
        <p className="page-description">Gere relatórios acadêmicos e exporte em Excel ou PDF</p>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6 border-0 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Filtros</h3>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">Turma</label>
            <Select value={filters.turmaId || "todas"} onValueChange={v => setFilters(f => ({ ...f, turmaId: v === "todas" ? "" : v }))}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todas as turmas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as turmas</SelectItem>
                {turmas.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Data início</label>
            <Input
              type="date"
              className="h-9 w-[160px]"
              value={filters.dataInicio}
              onChange={e => setFilters(f => ({ ...f, dataInicio: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Data fim</label>
            <Input
              type="date"
              className="h-9 w-[160px]"
              value={filters.dataFim}
              onChange={e => setFilters(f => ({ ...f, dataFim: e.target.value }))}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => setFilters({ turmaId: "", dataInicio: "", dataFim: "" })}
          >
            Limpar filtros
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(r => (
          <Card key={r.key} className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <r.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">{r.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{r.description}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={loading !== null}
                onClick={() => handleExport(r.key, "xlsx")}
              >
                {loading === `${r.key}_xlsx` ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Download className="h-3 w-3 mr-1" />}
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={loading !== null}
                onClick={() => handleExport(r.key, "pdf")}
              >
                {loading === `${r.key}_pdf` ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Download className="h-3 w-3 mr-1" />}
                PDF
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
