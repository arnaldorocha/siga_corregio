import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTable, useDelete } from "@/hooks/useSupabaseQuery";
import { useUserRole } from "@/hooks/useUserRole";
import { AlunoModal } from "./AlunoModal";
import { Pencil, Trash2, Plus, Search } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turma: any;
}

export function TurmaAlunosModal({ open, onOpenChange, turma }: Props) {
  const { data: alunos = [] } = useTable("alunos");
  const { canEdit } = useUserRole();
  const deleteAluno = useDelete("alunos");
  const [editAluno, setEditAluno] = useState<any>(null);
  const [alunoModalOpen, setAlunoModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const turmaAlunos = useMemo(() => {
    if (!turma) return [];
    return alunos
      .filter((a: any) => a.turma_id === turma.id)
      .filter((a: any) => !search || a.nome.toLowerCase().includes(search.toLowerCase()));
  }, [alunos, turma, search]);

  const vagasOcupadas = useMemo(() => {
    if (!turma) return 0;
    return alunos.filter((a: any) => {
      if (a.turma_id !== turma.id) return false;
      if (a.status === 'Trancado' || a.status === 'Inativo' || a.status === 'Cancelado' || a.status === 'Finalizado') return false;
      if (a.modalidade === 'EAD') return false;
      return true;
    }).length;
  }, [alunos, turma]);

  const handleDelete = (e: React.MouseEvent, aluno: any) => {
    e.stopPropagation();
    if (confirm(`Excluir aluno "${aluno.nome}"?`)) {
      deleteAluno.mutate(aluno.id);
    }
  };

  const handleAddAluno = () => {
    setEditAluno({ turma_id: turma?.id });
    setAlunoModalOpen(true);
  };

  if (!turma) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Alunos da {turma.nome}</span>
              <div className="flex items-center gap-2 text-sm font-normal">
                <Badge variant="outline">{turma.dia_semana || "—"}</Badge>
                <Badge variant="outline">{turma.horario || "—"}</Badge>
                <Badge>{turma.turno}</Badge>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar aluno na turma..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            {canEdit && (
              <Button size="sm" onClick={handleAddAluno}><Plus className="h-4 w-4 mr-1" />Adicionar Aluno</Button>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            {turmaAlunos.length} aluno(s) total • <strong>{vagasOcupadas}</strong> vagas ocupadas (presencial ativo) • Capacidade: {turma.capacidade_maxima} • Disponíveis: {turma.capacidade_maxima - vagasOcupadas}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Modalidade</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Telefone</TableHead>
                {canEdit && <TableHead className="w-20">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {turmaAlunos.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum aluno nesta turma</TableCell></TableRow>
              ) : turmaAlunos.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.nome}</TableCell>
                  <TableCell><Badge variant={a.modalidade === 'EAD' ? 'secondary' : 'outline'}>{a.modalidade || 'Presencial'}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{a.tipo_aluno || 'Normal'}</Badge></TableCell>
                  <TableCell><Badge variant={a.status === 'Ativo' ? 'default' : 'secondary'}>{a.status}</Badge></TableCell>
                  <TableCell className="text-xs">{a.telefone || "—"}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditAluno(a); setAlunoModalOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={(e) => handleDelete(e, a)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {canEdit && (
        <AlunoModal
          open={alunoModalOpen}
          onOpenChange={(o) => { setAlunoModalOpen(o); if (!o) setEditAluno(null); }}
          editData={editAluno}
        />
      )}
    </>
  );
}
