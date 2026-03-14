import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";

interface ColumnMapping {
  excelCol: string;
  dbCol: string;
}

const DB_FIELDS_ALUNOS = [
  { value: "nome", label: "Nome" },
  { value: "email", label: "Email" },
  { value: "telefone", label: "Telefone Aluno" },
  { value: "telefone_responsavel", label: "Telefone Responsável" },
  { value: "data_nascimento", label: "Data de Nascimento" },
  { value: "status", label: "Status" },
  { value: "__ignorar", label: "— Ignorar —" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetTable: "alunos";
}

export function ImportExcel({ open, onOpenChange, targetTable }: Props) {
  const [step, setStep] = useState<"upload" | "map" | "preview" | "done">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState({ success: 0, errors: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const dbFields = DB_FIELDS_ALUNOS;

  const reset = () => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMappings([]);
    setImportResult({ success: 0, errors: 0 });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (json.length < 2) {
        toast({ title: "Planilha vazia", variant: "destructive" });
        return;
      }
      // Find the header row (first row with "Aluno" or "Nome")
      let headerIdx = 0;
      for (let i = 0; i < Math.min(json.length, 15); i++) {
        const row = json[i].map((c: any) => String(c).toLowerCase().trim());
        if (row.some((c: string) => c.includes("aluno") || c === "nome")) {
          headerIdx = i;
          break;
        }
      }
      const h = json[headerIdx].map((c: any) => String(c).trim());
      setHeaders(h);
      setRows(json.slice(headerIdx + 1).filter((r) => r.some((c: any) => String(c).trim())));

      // Auto-map columns
      const autoMap: ColumnMapping[] = h.map((col) => {
        const lower = col.toLowerCase();
        let dbCol = "__ignorar";
        if (lower.includes("aluno") || lower === "nome") dbCol = "nome";
        else if (lower.includes("nascimento")) dbCol = "data_nascimento";
        else if (lower.includes("tel") && lower.includes("resp")) dbCol = "telefone_responsavel";
        else if (lower.includes("tel") && lower.includes("aluno")) dbCol = "telefone";
        else if (lower.includes("email")) dbCol = "email";
        return { excelCol: col, dbCol };
      });
      setMappings(autoMap);
      setStep("map");
    };
    reader.readAsBinaryString(file);
  };

  const updateMapping = (idx: number, dbCol: string) => {
    setMappings((prev) => prev.map((m, i) => (i === idx ? { ...m, dbCol } : m)));
  };

  const getMappedData = () => {
    return rows
      .filter((row) => {
        const nameIdx = mappings.findIndex((m) => m.dbCol === "nome");
        return nameIdx >= 0 && String(row[nameIdx]).trim().length > 0;
      })
      .map((row) => {
        const obj: any = {};
        mappings.forEach((m, i) => {
          if (m.dbCol === "__ignorar") return;
          let val = row[i];
          if (m.dbCol === "data_nascimento" && val) {
            if (val instanceof Date) {
              val = val.toISOString().split("T")[0];
            } else {
              // Try parse dd/mm/yyyy
              const parts = String(val).match(/(\d{2})\/(\d{2})\/(\d{4})/);
              if (parts) val = `${parts[3]}-${parts[2]}-${parts[1]}`;
              else val = null;
            }
          }
          obj[m.dbCol] = val ? String(val).trim() : null;
        });
        if (!obj.status) obj.status = "Ativo";
        return obj;
      });
  };

  const handleImport = async () => {
    setImporting(true);
    const data = getMappedData();
    let success = 0;
    let errors = 0;
    for (const item of data) {
      const { error } = await supabase.from(targetTable).insert(item);
      if (error) errors++;
      else success++;
    }
    setImportResult({ success, errors });
    setStep("done");
    setImporting(false);
    queryClient.invalidateQueries({ queryKey: [targetTable] });
    toast({ title: `Importação concluída: ${success} registros, ${errors} erros` });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Importar Planilha Excel
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Selecione um arquivo .xlsx ou .xls</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            <Button onClick={() => fileRef.current?.click()}>Selecionar Arquivo</Button>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Mapeie as colunas da planilha para os campos do sistema:</p>
            <div className="space-y-2">
              {headers.map((h, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-48 truncate" title={h}>{h}</span>
                  <span className="text-muted-foreground">→</span>
                  <Select value={mappings[i]?.dbCol || "__ignorar"} onValueChange={(v) => updateMapping(i, v)}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {dbFields.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}>Voltar</Button>
              <Button onClick={() => setStep("preview")} disabled={!mappings.some((m) => m.dbCol === "nome")}>
                Pré-visualizar
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{getMappedData().length} registros serão importados</p>
            <div className="max-h-60 overflow-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    {mappings.filter((m) => m.dbCol !== "__ignorar").map((m, i) => (
                      <TableHead key={i}>{dbFields.find((f) => f.value === m.dbCol)?.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getMappedData().slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      {mappings.filter((m) => m.dbCol !== "__ignorar").map((m, j) => (
                        <TableCell key={j} className="text-xs">{row[m.dbCol] || "-"}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {getMappedData().length > 10 && (
              <p className="text-xs text-muted-foreground">Mostrando 10 de {getMappedData().length} registros</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("map")}>Voltar</Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importando..." : `Importar ${getMappedData().length} registros`}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Check className="h-12 w-12 text-green-500" />
            <p className="font-semibold">{importResult.success} importados com sucesso</p>
            {importResult.errors > 0 && (
              <p className="text-sm text-destructive">{importResult.errors} erros (possíveis duplicatas)</p>
            )}
            <Button onClick={() => { reset(); onOpenChange(false); }}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
