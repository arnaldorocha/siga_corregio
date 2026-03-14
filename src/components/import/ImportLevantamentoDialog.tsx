import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useExcelParser, cleanName, parseDate, cleanPhone } from "./useExcelParser";

interface ParsedAluno {
  nome: string;
  turma: string;
  dataNascimento: string | null;
  telefone: string | null;
  telefoneResp: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_\s]+/g, " ").trim();
}

function matchesAny(header: string, aliases: string[]): boolean {
  const h = normalize(header);
  return aliases.some(a => {
    const na = normalize(a);
    return h === na || h.includes(na) || na.includes(h);
  });
}

export function ImportLevantamentoDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [alunos, setAlunos] = useState<ParsedAluno[]>([]);
  const [result, setResult] = useState({ criados: 0, atualizados: 0, errors: 0 });
  const { fileRef, parseAllSheets } = useExcelParser();
  const { toast } = useToast();
  const qc = useQueryClient();

  const reset = () => { setStep("upload"); setAlunos([]); setResult({ criados: 0, atualizados: 0, errors: 0 }); };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sheets = await parseAllSheets(file);
    const parsed: ParsedAluno[] = [];

    for (const sheet of sheets) {
      let currentTurma = "";
      let colMap = { nome: -1, nascimento: -1, telAluno: -1, telResp: -1 };
      let headerFound = false;

      for (const row of sheet.rows) {
        const cells = row.map((c: any) => String(c || "").trim());

        // Detect turma header: "TURMA 2886 18h - SEGUNDA" or just sheet name with turma code
        for (const cell of cells) {
          const turmaMatch = cell.match(/TURMA\s+(\d{3,5})/i);
          if (turmaMatch) {
            currentTurma = turmaMatch[1];
          }
        }

        // Detect header row - look for columns with student name indicators
        const hasNameCol = cells.some(c => matchesAny(c, ["aluno", "nome", "nome do aluno", "nome completo", "estudante"]));
        if (hasNameCol) {
          cells.forEach((c, i) => {
            if (matchesAny(c, ["aluno", "nome", "nome do aluno", "nome completo", "estudante"])) colMap.nome = i;
            if (matchesAny(c, ["nascimento", "data de nascimento", "dt nasc", "data nasc", "aniversario"])) colMap.nascimento = i;
            if (matchesAny(c, ["telefone do aluno", "tel aluno", "celular aluno", "telefone", "celular", "tel", "contato"])) {
              if (colMap.telAluno === -1) colMap.telAluno = i;
            }
            if (matchesAny(c, ["telefone responsavel", "tel responsavel", "tel resp", "responsavel", "tel. resp", "contato responsavel"])) colMap.telResp = i;
          });
          // If no specific tel resp found, look for second phone column
          if (colMap.telResp === -1 && colMap.telAluno >= 0) {
            cells.forEach((c, i) => {
              if (i !== colMap.telAluno && matchesAny(c, ["telefone", "tel", "celular", "contato"]) && colMap.telResp === -1) {
                colMap.telResp = i;
              }
            });
          }
          headerFound = true;
          continue;
        }

        // If no header found yet, try to detect name column by content (first cell with a name-like value)
        if (!headerFound) {
          // Also check if turma info is in the sheet name
          if (!currentTurma) {
            const sheetTurma = sheet.name.match(/(\d{3,5})/);
            if (sheetTurma) currentTurma = sheetTurma[1];
          }
          continue;
        }

        // Parse student row
        const nameIdx = colMap.nome >= 0 ? colMap.nome : 0;
        const rawName = cells[nameIdx] || "";
        const nome = cleanName(rawName);
        if (!nome || nome.length < 4) continue;
        if (nome.match(/^\d/)) continue;
        if (nome.match(/^(TURMA|SEGUNDA|TERÇA|QUARTA|QUINTA|SEXTA|SÁBADO|PROFESSOR|CONTROLE|ALUNO|NOME|TOTAL|OBSERV)/i)) continue;
        if (!nome.match(/^[A-ZÀ-Ü]/i)) continue;
        // Must have at least 2 words (first + last name)
        if (!nome.includes(" ")) continue;

        parsed.push({
          nome,
          turma: currentTurma,
          dataNascimento: colMap.nascimento >= 0 ? parseDate(row[colMap.nascimento]) : null,
          telefone: colMap.telAluno >= 0 ? cleanPhone(row[colMap.telAluno]) : null,
          telefoneResp: colMap.telResp >= 0 ? cleanPhone(row[colMap.telResp]) : null,
        });
      }
    }

    // Deduplicate by name
    const unique = parsed.filter((a, i, arr) => arr.findIndex(b => b.nome.toLowerCase() === a.nome.toLowerCase()) === i);
    setAlunos(unique);
    setStep("preview");
  };

  const handleImport = async () => {
    setStep("importing");
    let criados = 0, atualizados = 0, errors = 0;

    // Fetch turmas to map codes
    const { data: turmasDb } = await supabase.from("turmas").select("id, nome");
    const turmaMap: Record<string, string> = {};
    (turmasDb || []).forEach((t: any) => {
      const match = t.nome.match(/(\d{3,5})/);
      if (match) turmaMap[match[1]] = t.id;
    });

    for (const a of alunos) {
      const turmaId = turmaMap[a.turma] || null;
      const updateData: any = {};
      if (a.dataNascimento) updateData.data_nascimento = a.dataNascimento;
      if (a.telefone) updateData.telefone = a.telefone;
      if (a.telefoneResp) updateData.telefone_responsavel = a.telefoneResp;
      if (turmaId) updateData.turma_id = turmaId;

      const { data: existing } = await supabase.from("alunos").select("id").ilike("nome", a.nome).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("alunos").update(updateData).eq("id", existing.id);
        if (error) errors++; else atualizados++;
      } else {
        const { error } = await supabase.from("alunos").insert({
          nome: a.nome, status: "Ativo", ...updateData,
        });
        if (error) errors++; else criados++;
      }
    }

    setResult({ criados, atualizados, errors });
    setStep("done");
    qc.invalidateQueries({ queryKey: ["alunos"] });
    toast({ title: `Levantamento: ${criados} criados, ${atualizados} atualizados` });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Importar Levantamento
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Selecione a planilha de levantamento (.xlsx)</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            <Button onClick={() => fileRef.current?.click()}>Selecionar Arquivo</Button>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{alunos.length} alunos encontrados</p>
            <div className="max-h-72 overflow-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead><TableHead>Turma</TableHead><TableHead>Nascimento</TableHead><TableHead>Tel. Aluno</TableHead><TableHead>Tel. Resp.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alunos.slice(0, 30).map((a, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">{a.nome}</TableCell>
                      <TableCell className="text-xs">{a.turma || "—"}</TableCell>
                      <TableCell className="text-xs">{a.dataNascimento || "—"}</TableCell>
                      <TableCell className="text-xs">{a.telefone || "—"}</TableCell>
                      <TableCell className="text-xs">{a.telefoneResp || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {alunos.length > 30 && <p className="text-xs text-muted-foreground">Mostrando 30 de {alunos.length}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}>Voltar</Button>
              <Button onClick={handleImport}>Importar {alunos.length} alunos</Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            <p className="text-sm text-muted-foreground">Importando dados...</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Check className="h-12 w-12 text-primary" />
            <p className="font-semibold">{result.criados} alunos criados</p>
            <p className="text-sm">{result.atualizados} alunos atualizados</p>
            {result.errors > 0 && <p className="text-sm text-destructive">{result.errors} erros</p>}
            <Button onClick={() => { reset(); onOpenChange(false); }}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
