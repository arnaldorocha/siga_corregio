import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdate, useTable } from "@/hooks/useSupabaseQuery";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matriculaId: string | null;
  canEdit?: boolean;
}

export function ProgressoModal({ open, onOpenChange, matriculaId, canEdit = false }: Props) {
  const update = useUpdate("progresso_modulos");
  const { data: progressoModulos = [] } = useTable("progresso_modulos");
  const { data: modulos = [] } = useTable("modulos");
  const [localData, setLocalData] = useState<Record<string, { data_inicio: string; data_previsao_termino: string }>>({});

  const progressoDaMatricula = progressoModulos.filter((p: any) => p.matricula_id === matriculaId);

  const handleSave = async (progressoId: string) => {
    const data = localData[progressoId];
    if (data) {
      await update.mutateAsync({ id: progressoId, ...data });
    }
  };

  const handleChange = (progressoId: string, field: string, value: string) => {
    setLocalData(prev => ({
      ...prev,
      [progressoId]: { ...prev[progressoId], [field]: value }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Progresso dos Módulos</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {progressoDaMatricula.map((prog: any) => {
            const modulo = modulos.find((m: any) => m.id === prog.modulo_id);
            const current = localData[prog.id] || { data_inicio: prog.data_inicio, data_previsao_termino: prog.data_previsao_termino };
            return (
              <div key={prog.id} className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">{modulo?.nome || 'Módulo'}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data Início</Label>
                    <Input
                      type="date"
                      value={current.data_inicio}
                      onChange={(e) => handleChange(prog.id, 'data_inicio', e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label>Data Previsão Término</Label>
                    <Input
                      type="date"
                      value={current.data_previsao_termino}
                      onChange={(e) => handleChange(prog.id, 'data_previsao_termino', e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Status: {prog.status}</p>
                {canEdit && (
                  <Button size="sm" className="mt-2" onClick={() => handleSave(prog.id)}>
                    Salvar
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}