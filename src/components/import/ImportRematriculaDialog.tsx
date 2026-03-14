import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RematriculaRow {
  nome: string;
  turma: string;
  data_prevista: string;
  curso_atual: string;
  curso_indicado: string;
  professor: string;
  situacao: string;
  periodo: string;
  periodo_cor: string;
}

const PERIODO_MAP: Record<string, { label: string; cor: string }> = {
  "0": { label: "0 dias (Roxo)", cor: "roxo" },
  "1": { label: "30 dias (Vermelha)", cor: "vermelha" },
  "2": { label: "60 dias (Azul)", cor: "azul" },
  "3": { label: "90 dias (Verde)", cor: "verde" },
};

function cleanName(name: string): string {
  if (!name) return "";
  // Remove markdown links like [Name](url)
  const linkMatch = name.match(/\[([^\]]+)\]/);
  if (linkMatch) return linkMatch[1].trim();
  return name.trim();
}

function parseDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const str = String(val).trim();
  // DD/MM/YYYY or DD/MM/YY
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let year = parseInt(m[3]);
    if (year < 100) year += 2000;
    return `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

function detectPeriodo(sheetName: string, headerRow: string): { label: string; cor: string } {
  const combined = `${sheetName} ${headerRow}`.toLowerCase();
  if (combined.includes("90") || combined.includes("verde")) return { label: "90 dias", cor: "verde" };
  if (combined.includes("60") || combined.includes("azul")) return { label: "60 dias", cor: "azul" };
  if (combined.includes("30") || combined.includes("vermelh")) return { label: "30 dias", cor: "vermelha" };
  if (combined.includes("0 dia") || combined.includes("roxo")) return { label: "0 dias", cor: "roxo" };
  return { label: sheetName, cor: "desconhecido" };
}

export function ImportRematriculaDialog({ open, onOpenChange }: Props) {
  const [rows, setRows] = useState<RematriculaRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ atualizados: number; notificacoes: number } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const allRows: RematriculaRow[] = [];

        wb.SheetNames.forEach((sheetName) => {
          const ws = wb.Sheets[sheetName];
          const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
          if (data.length < 2) return;

          // Detect period from first row (header/title)
          const firstRow = String(data[0]?.[0] || "");
          const periodo = detectPeriodo(sheetName, firstRow);

          // Find header row (contains "Nome")
          let headerIdx = -1;
          for (let i = 0; i < Math.min(5, data.length); i++) {
            const row = data[i];
            if (row && row.some((c: any) => String(c || "").toLowerCase().includes("nome"))) {
              headerIdx = i;
              break;
            }
          }
          if (headerIdx === -1) return;

          // Map columns
          const headers = data[headerIdx].map((h: any) => String(h || "").toLowerCase().trim());
          const colMap = {
            nome: headers.findIndex((h: string) => h.includes("nome")),
            turma: headers.findIndex((h: string) => h.includes("turma")),
            data: headers.findIndex((h: string) => h.includes("data") && h.includes("prev")),
            curso_atual: headers.findIndex((h: string) => h.includes("curso") && h.includes("faz")),
            curso_indicado: headers.findIndex((h: string) => h.includes("curso") && h.includes("indic")),
            professor: headers.findIndex((h: string) => h.includes("professor")),
            situacao: headers.findIndex((h: string) => h.includes("situa")),
          };

          for (let i = headerIdx + 1; i < data.length; i++) {
            const row = data[i];
            if (!row) continue;
            const nome = cleanName(String(row[colMap.nome] || ""));
            if (!nome || nome.length < 3) continue;

            allRows.push({
              nome,
              turma: String(row[colMap.turma] || "").trim(),
              data_prevista: parseDate(row[colMap.data]) || String(row[colMap.data] || ""),
              curso_atual: String(row[colMap.curso_atual] || "").trim(),
              curso_indicado: String(row[colMap.curso_indicado] || "").trim(),
              professor: String(row[colMap.professor] || "").trim(),
              situacao: String(row[colMap.situacao] || "").trim(),
              periodo: periodo.label,
              periodo_cor: periodo.cor,
            });
          }
        });

        setRows(allRows);
        if (allRows.length === 0) {
          toast({ title: "Nenhum dado encontrado", description: "Verifique o formato da planilha.", variant: "destructive" });
        }
      } catch (err: any) {
        toast({ title: "Erro ao ler arquivo", description: err.message, variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
  }, [toast]);

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    let atualizados = 0;
    let notificacoes = 0;

    try {
      for (const row of rows) {
        // Find aluno by name (case-insensitive)
        const { data: alunos } = await supabase
          .from("alunos")
          .select("id, nome")
          .ilike("nome", `%${row.nome}%`)
          .limit(1);

        if (alunos && alunos.length > 0) {
          // Update existing aluno
          await supabase.from("alunos").update({
            curso_indicado: row.curso_indicado || null,
            observacao_rematricula: row.situacao || null,
            status_rematricula: row.situacao?.toLowerCase().includes("interesse") ? "Pendente" : "Pendente",
            interesse_rematricula: detectInteresse(row.situacao),
          } as any).eq("id", alunos[0].id);
          atualizados++;
        } else {
          // Insert new aluno
          await supabase.from("alunos").insert({
            nome: row.nome,
            status: "Ativo",
            curso_indicado: row.curso_indicado || null,
            observacao_rematricula: row.situacao || null,
            status_rematricula: "Pendente",
            interesse_rematricula: detectInteresse(row.situacao),
          } as any);
          atualizados++;
        }

        // Create notification based on period
        const notifMsg = buildNotificacao(row);
        if (notifMsg) {
          await supabase.from("notificacoes").insert({
            tipo: row.periodo_cor === "roxo" ? "danger" : row.periodo_cor === "vermelha" ? "warning" : "info",
            titulo: `📋 Rematrícula ${row.periodo} — ${row.nome}`,
            mensagem: notifMsg,
          });
          notificacoes++;
        }
      }

      setResult({ atualizados, notificacoes });
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
      toast({
        title: "Importação concluída!",
        description: `${atualizados} alunos atualizados, ${notificacoes} notificações criadas.`,
      });
    } catch (err: any) {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Importar Planilha de Rematrícula
          </DialogTitle>
          <DialogDescription>
            Lê todas as abas (90 dias, 60 dias, 30 dias, 0 dias) e atualiza os dados de rematrícula dos alunos com curso indicado, situação e cria notificações por período.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer px-4 py-2 border rounded-lg hover:bg-muted transition-colors">
              <Upload className="h-4 w-4" />
              <span className="text-sm">Selecionar arquivo .xlsx</span>
              <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
            </label>
            {rows.length > 0 && (
              <Badge variant="secondary">{rows.length} registros encontrados</Badge>
            )}
          </div>

          {rows.length > 0 && (
            <>
              <div className="border rounded-lg overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Turma</TableHead>
                      <TableHead>Data Prevista</TableHead>
                      <TableHead>Curso Atual</TableHead>
                      <TableHead>Curso Indicado</TableHead>
                      <TableHead>Professor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Badge variant={r.periodo_cor === "roxo" ? "destructive" : r.periodo_cor === "vermelha" ? "destructive" : r.periodo_cor === "azul" ? "secondary" : "default"} className="text-[10px]">
                            {r.periodo}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-xs">{r.nome}</TableCell>
                        <TableCell className="text-xs">{r.turma}</TableCell>
                        <TableCell className="text-xs">{r.data_prevista}</TableCell>
                        <TableCell className="text-xs">{r.curso_atual}</TableCell>
                        <TableCell className="text-xs">{r.curso_indicado}</TableCell>
                        <TableCell className="text-xs">{r.professor}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Button onClick={handleImport} disabled={importing} className="w-full">
                {importing ? "Importando..." : `Importar ${rows.length} registros`}
              </Button>
            </>
          )}

          {result && (
            <div className="p-4 bg-primary/5 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Importação concluída!</p>
                <p className="text-xs text-muted-foreground">
                  {result.atualizados} alunos atualizados/criados · {result.notificacoes} notificações de rematrícula criadas
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function detectInteresse(situacao: string): string | null {
  if (!situacao) return null;
  const lower = situacao.toLowerCase();
  if (lower.includes("não tem interesse") || lower.includes("sem interesse") || lower.includes("não pretende")) return "Não tem interesse";
  if (lower.includes("interesse") && (lower.includes("bastante") || lower.includes("pretende") || lower.includes("quer"))) return "Alto interesse";
  if (lower.includes("interesse")) return "Médio interesse";
  if (lower.includes("sem condições") || lower.includes("não tem nada em mente")) return "Baixo interesse";
  return "Médio interesse";
}

function buildNotificacao(row: RematriculaRow): string {
  const parts = [];
  if (row.curso_atual) parts.push(`Curso: ${row.curso_atual}`);
  if (row.curso_indicado) parts.push(`Indicado: ${row.curso_indicado}`);
  if (row.data_prevista) parts.push(`Última aula: ${row.data_prevista}`);
  if (row.turma) parts.push(`Turma: ${row.turma}`);
  return parts.join(" | ");
}
