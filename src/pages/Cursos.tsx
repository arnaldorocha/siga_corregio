import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Search } from "lucide-react";
import { useTable, useDelete } from "@/hooks/useSupabaseQuery";
import { CursoModal } from "@/components/modals/CursoModal";
import { useUserRole } from "@/hooks/useUserRole";

export default function Cursos() {
  const { data: cursos = [], isLoading } = useTable("cursos");
  const { data: modulos = [] } = useTable("modulos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { canEdit } = useUserRole();
  const deleteCurso = useDelete("cursos");

  const cursosFiltrados = useMemo(() => {
    return cursos.filter((curso: any) =>
      curso.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [cursos, searchTerm]);

  const handleDelete = (e: React.MouseEvent, curso: any) => {
    e.stopPropagation();
    if (confirm(`Excluir curso "${curso.nome}"?`)) {
      deleteCurso.mutate(curso.id);
    }
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Cursos</h1>
          <p className="page-description">Gerenciamento de cursos e carga horária</p>
        </div>
        {canEdit && <Button onClick={() => { setEditData(null); setModalOpen(true); }}><Plus className="h-4 w-4 mr-2" />Novo Curso</Button>}
      </div>
      <Card className="p-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar curso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </Card>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead><TableHead>Carga Horária Total</TableHead><TableHead>Módulos</TableHead><TableHead>Status</TableHead>
              {canEdit && <TableHead className="w-20">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow> :
            cursosFiltrados.map((c: any) => (
              <TableRow key={c.id} className={canEdit ? "cursor-pointer hover:bg-muted/50" : ""} onClick={() => { if (canEdit) { setEditData(c); setModalOpen(true); } }}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>{c.carga_horaria_total}h</TableCell>
                <TableCell>{modulos.filter((m: any) => m.curso_id === c.id).length}</TableCell>
                <TableCell><Badge variant={c.ativo ? 'default' : 'secondary'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                {canEdit && (
                  <TableCell>
                    <Button size="sm" variant="ghost" title="Excluir" onClick={(e) => handleDelete(e, c)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {canEdit && <CursoModal open={modalOpen} onOpenChange={setModalOpen} editData={editData} />}
    </div>
  );
}
