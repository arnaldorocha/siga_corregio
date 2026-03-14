import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInsert, useUpdate, useTable, useDelete } from "@/hooks/useSupabaseQuery";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ModuloModal } from "./ModuloModal";

const schema = z.object({
  nome: z.string().min(1, "Nome obrigatório").max(200),
  carga_horaria_total: z.coerce.number().min(1, "Carga horária obrigatória"),
  ativo: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: any;
}

export function CursoModal({ open, onOpenChange, editData }: Props) {
  const insert = useInsert("cursos");
  const update = useUpdate("cursos");
  const { data: modulos = [] } = useTable("modulos", { order: { column: "ordem" } });
  const deleteModulo = useDelete("modulos");
  const [moduloModalOpen, setModuloModalOpen] = useState(false);
  const [editModulo, setEditModulo] = useState<any>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: "", carga_horaria_total: 0, ativo: true },
  });

  useEffect(() => {
    if (open) {
      form.reset(editData ? {
        nome: editData.nome || "",
        carga_horaria_total: editData.carga_horaria_total || 0,
        ativo: editData.ativo ?? true,
      } : { nome: "", carga_horaria_total: 0, ativo: true });
    }
  }, [open, editData]);

  const cursoModulos = editData?.id ? modulos.filter((m: any) => m.curso_id === editData.id) : [];

  const handleDeleteModulo = (e: React.MouseEvent, modulo: any) => {
    e.stopPropagation();
    if (confirm(`Excluir módulo "${modulo.nome}"?`)) {
      deleteModulo.mutate(modulo.id);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (editData?.id) {
      await update.mutateAsync({ id: editData.id, ...values });
    } else {
      await insert.mutateAsync(values);
    }
    onOpenChange(false);
    form.reset();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={editData?.id ? "max-w-2xl max-h-[85vh] overflow-y-auto" : ""}>
          <DialogHeader><DialogTitle>{editData ? "Editar Curso" : "Novo Curso"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="carga_horaria_total" render={({ field }) => (
                <FormItem><FormLabel>Carga Horária Total (horas)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="ativo" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel>Ativo</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={insert.isPending || update.isPending}>
                {editData ? "Salvar" : "Criar"}
              </Button>
            </form>
          </Form>

          {editData?.id && (
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Módulos do Curso</h3>
                <Button size="sm" variant="outline" onClick={() => { setEditModulo(null); setModuloModalOpen(true); }}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Adicionar Módulo
                </Button>
              </div>
              {cursoModulos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum módulo cadastrado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ordem</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Carga Horária</TableHead>
                      <TableHead className="w-20">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cursoModulos.map((m: any) => (
                      <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setEditModulo(m); setModuloModalOpen(true); }}>
                        <TableCell><Badge variant="outline">{m.ordem}º</Badge></TableCell>
                        <TableCell className="font-medium">{m.nome}</TableCell>
                        <TableCell>{m.carga_horaria}h</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={(e) => handleDeleteModulo(e, m)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ModuloModal
        open={moduloModalOpen}
        onOpenChange={(o) => { setModuloModalOpen(o); if (!o) setEditModulo(null); }}
        editData={editModulo ? editModulo : editData?.id ? { curso_id: editData.id } : null}
      />
    </>
  );
}
