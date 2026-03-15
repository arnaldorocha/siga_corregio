import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdate, useTable } from "@/hooks/useSupabaseQuery";

const schema = z.object({
  data_inicio: z.string().min(1, "Data obrigatória"),
  status: z.string().min(1, "Status obrigatório"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matricula: any;
}

export function MatriculaEditModal({ open, onOpenChange, matricula }: Props) {
  const update = useUpdate("matriculas");
  const { data: alunos } = useTable("alunos");
  const { data: cursos } = useTable("cursos");
  const { data: turmas } = useTable("turmas");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      data_inicio: matricula?.data_inicio || "",
      status: matricula?.status || "Ativa",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (matricula) {
      await update.mutateAsync({ id: matricula.id, ...values });
      onOpenChange(false);
    }
  };

  if (!matricula) return null;

  const aluno = alunos?.find((a: any) => a.id === matricula.aluno_id);
  const curso = cursos?.find((c: any) => c.id === matricula.curso_id);
  const turma = turmas?.find((t: any) => t.id === matricula.turma_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar Matrícula</DialogTitle></DialogHeader>
        <div className="space-y-4 mb-4">
          <div><strong>Aluno:</strong> {aluno?.nome || "N/A"}</div>
          <div><strong>Curso:</strong> {curso?.nome || "N/A"}</div>
          <div><strong>Turma:</strong> {turma?.nome || "N/A"}</div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="data_inicio" render={({ field }) => (
              <FormItem><FormLabel>Data de Início</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                <SelectItem value="Ativa">Ativa</SelectItem>
                <SelectItem value="Concluída">Concluída</SelectItem>
                <SelectItem value="Cancelada">Cancelada</SelectItem>
                <SelectItem value="Trancada">Trancada</SelectItem>
              </SelectContent></Select><FormMessage /></FormItem>
            )} />
            <Button type="submit" className="w-full" disabled={update.isPending}>
              {update.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}