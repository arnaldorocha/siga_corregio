import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Search } from "lucide-react";
import { useTable, useDelete } from "@/hooks/useSupabaseQuery";
import { ModuloModal } from "@/components/modals/ModuloModal";
import { useUserRole } from "@/hooks/useUserRole";

export default function Modulos() {
  const { data: modulos = [], isLoading } = useTable("modulos", { order: { column: "ordem" } });
  const { data: cursos = [] } = useTable("cursos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { canEdit } = useUserRole();
  const deleteModulo = useDelete("modulos");

  const modulosFiltrados = useMemo(() => {
    return modulos.filter((modulo: any) =>
      modulo.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [modulos, searchTerm]);

  const getCursoNome = (id: string) => cursos.find((c: any) => c.id === id)?.nome || '-';

  const handleDelete = (e: React.MouseEvent, modulo: any) => {
    e.stopPropagation();
    if (confirm(`Excluir módulo "${modulo.nome}"?`)) {
      deleteModulo.mutate(modulo.id);
    }
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Módulos</h1>
          <p className="page-description">Gerenciamento de módulos por curso</p>
        </div>
        {canEdit && <Button onClick={() => { setEditData(null); setModalOpen(true); }}><Plus className="h-4 w-4 mr-2" />Novo Módulo</Button>}
      </div>
      <Card className="p-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar módulo..."
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
              <TableHead>Ordem</TableHead><TableHead>Nome</TableHead><TableHead>Curso</TableHead><TableHead>Carga Horária</TableHead>
              {canEdit && <TableHead className="w-20">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow> :
            modulosFiltrados.map((m: any) => (
              <TableRow key={m.id} className={canEdit ? "cursor-pointer hover:bg-muted/50" : ""} onClick={() => { if (canEdit) { setEditData(m); setModalOpen(true); } }}>
                <TableCell><Badge variant="outline">{m.ordem}º</Badge></TableCell>
                <TableCell className="font-medium">{m.nome}</TableCell>
                <TableCell className="text-muted-foreground">{getCursoNome(m.curso_id)}</TableCell>
                <TableCell>{m.carga_horaria}h</TableCell>
                {canEdit && (
                  <TableCell>
                    <Button size="sm" variant="ghost" title="Excluir" onClick={(e) => handleDelete(e, m)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {canEdit && <ModuloModal open={modalOpen} onOpenChange={setModalOpen} editData={editData} />}
    </div>
  );
}
