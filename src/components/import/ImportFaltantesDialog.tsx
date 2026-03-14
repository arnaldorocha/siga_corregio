import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useExcelParser } from "./useExcelParser";

interface ParsedFaltante {
  nome: string;
  faltas: number;
  recorrencias: number;
  casosAdm: number;
  curso: string;
  turma: string;
  obs: string;
  diaSemana: string;
  professor: string;
  dataRef: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportFaltantesDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [faltantes, setFaltantes] = useState<ParsedFaltante[]>([]);
  const [result, setResult] = useState({ importados: 0, errors: 0 });
  const { fileRef, parseAllSheets } = useExcelParser();
  const { toast } = useToast();
  const qc = useQueryClient();

  const reset = () => { setStep("upload"); setFaltantes([]); setResult({ importados: 0, errors: 0 }); };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sheets = await parseAllSheets(file);
    const parsed: ParsedFaltante[] = [];

    for (const sheet of sheets) {
      let professor = "";
      let diaSemana = "";
      let dataRef = "";
      let headerFound = false;

      for (const row of sheet.rows) {
        const cells = row.map((c: any) => String(c || "").trim());

        // Detect professor and day
        for (const cell of cells) {
          const profMatch = cell.match(/Professor\s*:\s*(.+)/i);
          if (profMatch) professor = profMatch[1].trim();
          
          const dias = ["SEGUNDA-FEIRA", "TERÇA-FEIRA", "QUARTA-FEIRA", "QUINTA-FEIRA", "SEXTA-FEIRA", "SÁBADO"];
          for (const d of dias) {
            if (cell.toUpperCase().includes(d)) diaSemana = d;
          }

          // Date reference
          const dateMatch = cell.match(/(\d{2}\/\d{2}\/\d{4})/);
          if (dateMatch) dataRef = dateMatch[1];
        }

        // Detect header row
        if (cells.some(c => c.toLowerCase() === "aluno" || c.toLowerCase() === "faltas")) {
          headerFound = true;
          continue;
        }

        if (!headerFound) continue;

        // Parse student row: Aluno | faltas | recorrências | casos adm | Curso | Turma | OBS
        const nome = cells[0];
        if (!nome || nome.length < 3 || nome.match(/^\d/) || nome.toLowerCase().includes("professor") || nome.toLowerCase().includes("controle")) continue;

        const faltas = parseInt(cells[1]) || 0;
        if (faltas === 0 && !cells[1]) continue;

        parsed.push({
          nome,
          faltas,
          recorrencias: parseInt(cells[2]) || 0,
          casosAdm: parseInt(cells[3]) || 0,
          curso: cells[4] || "",
          turma: cells[5] || "",
          obs: cells[6] || "",
          diaSemana,
          professor,
          dataRef,
        });
      }
    }

    setFaltantes(parsed);
    setStep("preview");
  };

  const handleImport = async () => {
    setStep("importing");
    let importados = 0, errors = 0;

    for (const f of faltantes) {
      // Parse date
      let dataRefParsed: string | null = null;
      const dm = f.dataRef.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (dm) dataRefParsed = `${dm[3]}-${dm[2]}-${dm[1]}`;

      const { error } = await supabase.from("controle_faltantes").insert({
        aluno_nome: f.nome,
        faltas: f.faltas,
        recorrencias: f.recorrencias,
        casos_adm: f.casosAdm,
        curso: f.curso || null,
        turma_codigo: f.turma || null,
        observacoes: f.obs || null,
        dia_semana: f.diaSemana || null,
        data_referencia: dataRefParsed,
        professor: f.professor || null,
      });
      if (error) errors++; else importados++;
    }

    setResult({ importados, errors });
    setStep("done");
    qc.invalidateQueries({ queryKey: ["controle_faltantes"] });
    toast({ title: `Faltantes: ${importados} registros importados` });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Importar Faltantes
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Selecione a planilha de faltantes (.xlsx)</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            <Button onClick={() => fileRef.current?.click()}>Selecionar Arquivo</Button>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{faltantes.length} faltantes encontrados</p>
            <div className="max-h-72 overflow-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead><TableHead>Faltas</TableHead><TableHead>Recorrências</TableHead><TableHead>Turma</TableHead><TableHead>Dia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faltantes.map((f, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">{f.nome}</TableCell>
                      <TableCell className="text-xs">{f.faltas}</TableCell>
                      <TableCell className="text-xs">{f.recorrencias || "—"}</TableCell>
                      <TableCell className="text-xs">{f.turma || "—"}</TableCell>
                      <TableCell className="text-xs">{f.diaSemana || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}>Voltar</Button>
              <Button onClick={handleImport}>Importar {faltantes.length} registros</Button>
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
            <p className="font-semibold">{result.importados} registros importados</p>
            {result.errors > 0 && <p className="text-sm text-destructive">{result.errors} erros</p>}
            <Button onClick={() => { reset(); onOpenChange(false); }}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
