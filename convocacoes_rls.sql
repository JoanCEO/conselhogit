-- RLS para convocacoes
ALTER TABLE public.convocacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Convocacoes visíveis para autenticados" ON public.convocacoes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuário cria convocacoes" ON public.convocacoes
  FOR INSERT WITH CHECK (auth.uid() = autor_id);

CREATE POLICY "Usuário edita suas convocacoes" ON public.convocacoes
  FOR UPDATE USING (auth.uid() = autor_id);

CREATE POLICY "Usuário exclui suas convocacoes" ON public.convocacoes
  FOR DELETE USING (auth.uid() = autor_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.convocacoes;
