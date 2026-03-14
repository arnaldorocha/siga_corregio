import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap } from "lucide-react";

type Mode = "login" | "forgot";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin
      }
    });
    if (error) {
      toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cadastro realizado!", description: "Verifique seu email para confirmar." });
      setMode("login");
    }
    setLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email enviado!", description: "Verifique sua caixa de entrada." });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-primary/10 mb-3">
            <GraduationCap className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">SIGA - Instituto Correrio 
 
          </h1>
          <p className="text-sm text-muted-foreground">Sistema Integrado de Gestão Acadêmica</p>
        </div>

        {mode === "login" && <form onSubmit={handleLogin} className="space-y-4">
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" /></div>
            <div><Label htmlFor="password">Senha</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1" /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
            <div className="flex justify-end text-sm">
              <button type="button" onClick={() => setMode("forgot")} className="text-muted-foreground hover:underline">Esqueci a senha</button>
            </div>
          </form>}


        {mode === "forgot" &&
        <form onSubmit={handleForgot} className="space-y-4">
            <div><Label htmlFor="email3">Email</Label><Input id="email3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Enviando..." : "Enviar link"}</Button>
            <button type="button" onClick={() => setMode("login")} className="text-sm text-primary hover:underline w-full text-center">Voltar ao login</button>
          </form>
        }
      </Card>
    </div>);

}