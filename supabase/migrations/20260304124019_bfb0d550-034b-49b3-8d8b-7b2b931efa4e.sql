
-- Enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'coordenacao', 'professor', 'financeiro');

-- Turmas
CREATE TABLE public.turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ano INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  turno TEXT NOT NULL CHECK (turno IN ('Manhã', 'Tarde', 'Noite')),
  status TEXT NOT NULL DEFAULT 'Ativa' CHECK (status IN ('Ativa', 'Inativa', 'Encerrada')),
  capacidade_maxima INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cursos
CREATE TABLE public.cursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  carga_horaria_total INTEGER NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Módulos
CREATE TABLE public.modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  carga_horaria INTEGER NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 1,
  curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alunos
CREATE TABLE public.alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo', 'Trancado')),
  turma_id UUID REFERENCES public.turmas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Matrículas
CREATE TABLE public.matriculas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Ativa' CHECK (status IN ('Ativa', 'Concluída', 'Cancelada', 'Trancada')),
  matricula_anterior_id UUID REFERENCES public.matriculas(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Progresso de Módulos
CREATE TABLE public.progresso_modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_id UUID NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
  modulo_id UUID NOT NULL REFERENCES public.modulos(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_previsao_termino DATE NOT NULL,
  data_real_termino DATE,
  status TEXT NOT NULL DEFAULT 'Em andamento' CHECK (status IN ('Em andamento', 'Concluído', 'Atrasado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Frequência
CREATE TABLE public.frequencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_id UUID NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  presente BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(matricula_id, data)
);

-- Notificações
CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('warning', 'danger', 'info')),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles (separate table for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progresso_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frequencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- RLS Policies
CREATE POLICY "auth_read_turmas" ON public.turmas FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_coord_manage_turmas" ON public.turmas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordenacao'));
CREATE POLICY "admin_coord_update_turmas" ON public.turmas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordenacao'));
CREATE POLICY "admin_coord_delete_turmas" ON public.turmas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordenacao'));

CREATE POLICY "auth_read_cursos" ON public.cursos FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_coord_insert_cursos" ON public.cursos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordenacao'));
CREATE POLICY "admin_coord_update_cursos" ON public.cursos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordenacao'));
CREATE POLICY "admin_coord_delete_cursos" ON public.cursos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordenacao'));

CREATE POLICY "auth_read_modulos" ON public.modulos FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_coord_insert_modulos" ON public.modulos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordenacao'));
CREATE POLICY "admin_coord_update_modulos" ON public.modulos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordenacao'));
CREATE POLICY "admin_coord_delete_modulos" ON public.modulos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordenacao'));

CREATE POLICY "auth_read_alunos" ON public.alunos FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_coord_insert_alunos" ON public.alunos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordenacao'));
CREATE POLICY "admin_coord_update_alunos" ON public.alunos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordenacao'));
CREATE POLICY "admin_coord_delete_alunos" ON public.alunos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordenacao'));

CREATE POLICY "auth_read_matriculas" ON public.matriculas FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_coord_insert_matriculas" ON public.matriculas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordenacao'));
CREATE POLICY "admin_coord_update_matriculas" ON public.matriculas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordenacao'));
CREATE POLICY "admin_coord_delete_matriculas" ON public.matriculas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordenacao'));

CREATE POLICY "auth_read_progresso" ON public.progresso_modulos FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_coord_insert_progresso" ON public.progresso_modulos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordenacao'));
CREATE POLICY "admin_coord_update_progresso" ON public.progresso_modulos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordenacao'));
CREATE POLICY "admin_coord_delete_progresso" ON public.progresso_modulos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordenacao'));

CREATE POLICY "auth_read_frequencias" ON public.frequencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_coord_prof_insert_freq" ON public.frequencias FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordenacao') OR public.has_role(auth.uid(), 'professor'));
CREATE POLICY "admin_coord_prof_update_freq" ON public.frequencias FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordenacao') OR public.has_role(auth.uid(), 'professor'));
CREATE POLICY "admin_coord_prof_delete_freq" ON public.frequencias FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordenacao') OR public.has_role(auth.uid(), 'professor'));

CREATE POLICY "auth_read_notificacoes" ON public.notificacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_notificacoes" ON public.notificacoes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_notificacoes" ON public.notificacoes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin_delete_notificacoes" ON public.notificacoes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "read_own_profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "read_own_roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin_manage_roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_delete_roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_turmas_updated_at BEFORE UPDATE ON public.turmas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cursos_updated_at BEFORE UPDATE ON public.cursos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_modulos_updated_at BEFORE UPDATE ON public.modulos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_alunos_updated_at BEFORE UPDATE ON public.alunos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_matriculas_updated_at BEFORE UPDATE ON public.matriculas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_progresso_updated_at BEFORE UPDATE ON public.progresso_modulos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate progresso_modulos when matricula is created
CREATE OR REPLACE FUNCTION public.gerar_progresso_modulos()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  mod RECORD;
  data_acumulada DATE;
  dias_modulo INTEGER;
BEGIN
  data_acumulada := NEW.data_inicio;
  FOR mod IN SELECT id, carga_horaria, ordem FROM public.modulos WHERE curso_id = NEW.curso_id ORDER BY ordem ASC
  LOOP
    dias_modulo := CEIL(mod.carga_horaria::NUMERIC / 4);
    INSERT INTO public.progresso_modulos (matricula_id, modulo_id, data_inicio, data_previsao_termino, status)
    VALUES (NEW.id, mod.id, data_acumulada, data_acumulada + dias_modulo, 'Em andamento');
    data_acumulada := data_acumulada + dias_modulo + 1;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_matricula_created
  AFTER INSERT ON public.matriculas
  FOR EACH ROW EXECUTE FUNCTION public.gerar_progresso_modulos();
