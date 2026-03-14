import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function Configuracoes() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Configurações</h1>
        <p className="page-description">Configurações gerais do sistema</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Informações da Instituição</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome da Instituição</Label>
              <Input id="nome" defaultValue="Instituto de Educação Técnica" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="email">Email de Contato</Label>
              <Input id="email" defaultValue="contato@instituicao.edu.br" className="mt-1" />
            </div>
          </div>
          <Separator className="my-4" />
          <Button>Salvar Alterações</Button>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Calendário Acadêmico</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inicio">Início do Período</Label>
              <Input id="inicio" type="date" defaultValue="2026-02-01" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="fim">Fim do Período</Label>
              <Input id="fim" type="date" defaultValue="2026-12-15" className="mt-1" />
            </div>
          </div>
          <Separator className="my-4" />
          <Button>Salvar Calendário</Button>
        </Card>
      </div>
    </div>
  );
}
