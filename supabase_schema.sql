-- ============================================================
-- O CONSELHO BLAZE — Supabase Schema
-- Execute este SQL no SQL Editor do Supabase
-- ============================================================

-- 1. Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de perfis (complementa auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de avaliações
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_name TEXT NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('Online', 'Multiplayer', 'História', 'Co-op', 'Competitivo', 'Battle Royale')),
  genre TEXT NOT NULL CHECK (genre IN ('RPG', 'FPS', 'Ação', 'Aventura', 'Estratégia', 'Terror', 'Corrida', 'Esporte', 'Plataforma', 'Puzzle', 'Simulação', 'MOBA', 'MMO', 'Outros')),
  rating NUMERIC(3,1) NOT NULL CHECK (rating >= 0 AND rating <= 10),
  comment TEXT NOT NULL,
  cover_color TEXT DEFAULT '#1a1a1a',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de comentários
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de reações
CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'fire', 'agree', 'disagree')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id, type)
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX idx_reviews_genre ON public.reviews(genre);
CREATE INDEX idx_reviews_game_type ON public.reviews(game_type);
CREATE INDEX idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE INDEX idx_comments_review_id ON public.comments(review_id);
CREATE INDEX idx_reactions_review_id ON public.reactions(review_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- Políticas: profiles
CREATE POLICY "Perfis visíveis para todos autenticados" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuário cria seu próprio perfil" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuário edita seu próprio perfil" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Políticas: reviews
CREATE POLICY "Avaliações visíveis para todos autenticados" ON public.reviews
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuário cria avaliações" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário edita suas avaliações" ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuário exclui suas avaliações" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas: comments
CREATE POLICY "Comentários visíveis para todos autenticados" ON public.comments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuário cria comentários" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário edita seus comentários" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuário exclui seus comentários" ON public.comments
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas: reactions
CREATE POLICY "Reações visíveis para todos autenticados" ON public.reactions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuário cria reações" ON public.reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário remove suas reações" ON public.reactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: criar perfil automaticamente ao registrar
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- REALTIME — habilitar nas tabelas
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;

-- ============================================================
-- VIEW: avaliações com dados do autor
-- ============================================================
CREATE OR REPLACE VIEW public.reviews_with_profiles AS
SELECT
  r.*,
  p.username,
  p.full_name,
  p.avatar_url,
  COUNT(DISTINCT c.id)::INT AS comment_count,
  COUNT(DISTINCT rc.id)::INT AS reaction_count
FROM public.reviews r
JOIN public.profiles p ON r.user_id = p.id
LEFT JOIN public.comments c ON c.review_id = r.id
LEFT JOIN public.reactions rc ON rc.review_id = r.id
GROUP BY r.id, p.username, p.full_name, p.avatar_url;
