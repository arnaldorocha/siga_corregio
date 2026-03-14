import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInsert, useUpdate, useTable } from "@/hooks/useSupabaseQuery";

const schema = z.object({
  nome: z.string().min(1, "Nome obrigatório").max(200),
  carga_horaria: z.coerce.number().min(1),
  ordem: z.coerce.number().min(1),
  curso_id: z.string().min(1, "Selecione um curso"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: any;
}

export function ModuloModal({ open, onOpenChange, editData }: Props) {
  const insert = useInsert("modulos");
  const update = useUpdate("modulos");
  const { data: cursos } = useTable("cursos");
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: "", carga_horaria: 0, ordem: 1, curso_id: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset(editData ? {
        nome: editData.nome || "",
        carga_horaria: editData.carga_horaria || 0,
        ordem: editData.ordem || 1,
        curso_id: editData.curso_id || "",
      } : { nome: "", carga_horaria: 0, ordem: 1, curso_id: "" });
    }
  }, [open, editData]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editData?.id ? "Editar Módulo" : "Novo Módulo"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="nome" render={({ field }) => (
              <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="curso_id" render={({ field }) => (
              <FormItem><FormLabel>Curso</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{cursos?.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="carga_horaria" render={({ field }) => (
                <FormItem><FormLabel>Carga Horária (h)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="ordem" render={({ field }) => (
                <FormItem><FormLabel>Ordem</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <Button type="submit" className="w-full" disabled={insert.isPending || update.isPending}>
              {editData?.id ? "Salvar" : "Criar"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
