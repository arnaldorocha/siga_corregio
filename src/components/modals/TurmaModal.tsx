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
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import { useDelete } from "@/hooks/useSupabaseQuery";

const schema = z.object({
  nome: z.string().min(1, "Nome obrigatório").max(100),
  ano: z.coerce.number().min(2020).max(2050),
  turno: z.enum(["Manhã", "Tarde", "Noite"]),
  dia_semana: z.string().optional().nullable(),
  horario: z.string().optional().nullable(),
  status: z.enum(["Ativa", "Inativa", "Encerrada"]),
  capacidade_maxima: z.coerce.number().min(1).max(200),
  professor_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const defaults: FormValues = {
  nome: "", ano: new Date().getFullYear(), turno: "Manhã", dia_semana: "", horario: "", status: "Ativa", capacidade_maxima: 30, professor_id: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: any;
}

export function TurmaModal({ open, onOpenChange, editData }: Props) {
  const insert = useInsert("turmas");
  const update = useUpdate("turmas");
  const deleteTurma = useDelete("turmas");
  const { data: profiles = [] } = useTable("profiles");
  const { data: professorTurmas = [] } = useTable("professor_turmas");
  const { data: userRoles = [] } = useTable("user_roles");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get professors (users with professor role)
  const professors = profiles.filter((p: any) => 
    userRoles.some((r: any) => r.user_id === p.user_id && (r.role === "professor" || r.role === "admin" || r.role === "coordenacao"))
  );

  const currentProfessorId = editData?.id
    ? professorTurmas.find((pt: any) => pt.turma_id === editData.id)?.user_id || ""
    : "";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  // Reset form when editData changes
  useEffect(() => {
    if (open) {
      if (editData) {
        form.reset({
          nome: editData.nome || "",
          ano: editData.ano || new Date().getFullYear(),
          turno: editData.turno || "Manhã",
          dia_semana: editData.dia_semana || "",
          horario: editData.horario || "",
          status: editData.status || "Ativa",
          capacidade_maxima: editData.capacidade_maxima || 30,
          professor_id: currentProfessorId,
        });
      } else {
        form.reset(defaults);
      }
    }
  }, [open, editData, currentProfessorId]);

  const onSubmit = async (values: FormValues) => {
    const { professor_id, ...turmaValues } = values;
    let turmaId = editData?.id;

    if (turmaId) {
      await update.mutateAsync({ id: turmaId, ...turmaValues });
    } else {
      const result = await insert.mutateAsync(turmaValues);
      turmaId = result.id;
    }

    // Handle professor assignment
    if (turmaId && professor_id !== currentProfessorId) {
      // Remove old assignment
      const oldPt = professorTurmas.find((pt: any) => pt.turma_id === turmaId);
      if (oldPt) {
        await supabase.from("professor_turmas").delete().eq("id", oldPt.id);
      }
      // Add new assignment
      if (professor_id) {
        await supabase.from("professor_turmas").insert({ turma_id: turmaId, user_id: professor_id });
      }
      queryClient.invalidateQueries({ queryKey: ["professor_turmas"] });
    }

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (editData?.id && confirm(`Excluir turma "${editData.nome}"?`)) {
      deleteTurma.mutate(editData.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{editData ? "Editar Turma" : "Nova Turma"}</DialogTitle>
            {editData && (
              <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-1" /> Excluir
              </Button>
            )}
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="nome" render={({ field }) => (
              <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="ano" render={({ field }) => (
                <FormItem><FormLabel>Ano</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="turno" render={({ field }) => (
                <FormItem><FormLabel>Turno</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Manhã">Manhã</SelectItem><SelectItem value="Tarde">Tarde</SelectItem><SelectItem value="Noite">Noite</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="dia_semana" render={({ field }) => (
                <FormItem><FormLabel>Dia da Semana</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Segunda-feira">Segunda-feira</SelectItem><SelectItem value="Terça-feira">Terça-feira</SelectItem><SelectItem value="Quarta-feira">Quarta-feira</SelectItem><SelectItem value="Quinta-feira">Quinta-feira</SelectItem><SelectItem value="Sexta-feira">Sexta-feira</SelectItem><SelectItem value="Sábado">Sábado</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="horario" render={({ field }) => (
                <FormItem><FormLabel>Horário</FormLabel><FormControl><Input placeholder="Ex: 18h" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Ativa">Ativa</SelectItem><SelectItem value="Inativa">Inativa</SelectItem><SelectItem value="Encerrada">Encerrada</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="capacidade_maxima" render={({ field }) => (
                <FormItem><FormLabel>Capacidade</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="professor_id" render={({ field }) => (
              <FormItem><FormLabel>Professor</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}><FormControl><SelectTrigger><SelectValue placeholder="Selecione o professor..." /></SelectTrigger></FormControl><SelectContent>
                {professors.map((p: any) => <SelectItem key={p.user_id} value={p.user_id}>{p.display_name || p.user_id}</SelectItem>)}
              </SelectContent></Select><FormMessage /></FormItem>
            )} />
            <Button type="submit" className="w-full" disabled={insert.isPending || update.isPending}>
              {editData ? "Salvar" : "Criar"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
