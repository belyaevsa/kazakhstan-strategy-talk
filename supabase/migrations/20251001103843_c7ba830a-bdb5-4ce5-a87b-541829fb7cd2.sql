-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Pages table for document structure
CREATE TABLE public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pages are viewable by everyone"
  ON public.pages FOR SELECT
  USING (true);

-- Paragraphs table
CREATE TABLE public.paragraphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  order_index INT NOT NULL,
  comment_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.paragraphs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paragraphs are viewable by everyone"
  ON public.paragraphs FOR SELECT
  USING (true);

-- Comments table (supports both paragraph and page-level comments with threading)
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paragraph_id UUID REFERENCES public.paragraphs(id) ON DELETE CASCADE,
  page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  agree_count INT DEFAULT 0,
  disagree_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT comment_target CHECK (
    (paragraph_id IS NOT NULL AND page_id IS NULL) OR
    (paragraph_id IS NULL AND page_id IS NOT NULL)
  )
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Comment votes table
CREATE TABLE public.comment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('agree', 'disagree')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes are viewable by everyone"
  ON public.comment_votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON public.comment_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes"
  ON public.comment_votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON public.comment_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update comment counts on paragraphs
CREATE OR REPLACE FUNCTION update_paragraph_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.paragraph_id IS NOT NULL THEN
    UPDATE paragraphs
    SET comment_count = comment_count + 1
    WHERE id = NEW.paragraph_id;
  ELSIF TG_OP = 'DELETE' AND OLD.paragraph_id IS NOT NULL THEN
    UPDATE paragraphs
    SET comment_count = GREATEST(0, comment_count - 1)
    WHERE id = OLD.paragraph_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_paragraph_comment_count_trigger
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION update_paragraph_comment_count();

-- Function to update vote counts on comments
CREATE OR REPLACE FUNCTION update_comment_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'agree' THEN
      UPDATE comments SET agree_count = agree_count + 1 WHERE id = NEW.comment_id;
    ELSE
      UPDATE comments SET disagree_count = disagree_count + 1 WHERE id = NEW.comment_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type = 'agree' THEN
      UPDATE comments SET agree_count = GREATEST(0, agree_count - 1) WHERE id = OLD.comment_id;
    ELSE
      UPDATE comments SET disagree_count = GREATEST(0, disagree_count - 1) WHERE id = OLD.comment_id;
    END IF;
    IF NEW.vote_type = 'agree' THEN
      UPDATE comments SET agree_count = agree_count + 1 WHERE id = NEW.comment_id;
    ELSE
      UPDATE comments SET disagree_count = disagree_count + 1 WHERE id = NEW.comment_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'agree' THEN
      UPDATE comments SET agree_count = GREATEST(0, agree_count - 1) WHERE id = OLD.comment_id;
    ELSE
      UPDATE comments SET disagree_count = GREATEST(0, disagree_count - 1) WHERE id = OLD.comment_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_comment_vote_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.comment_votes
FOR EACH ROW
EXECUTE FUNCTION update_comment_vote_count();

-- Create indexes for better performance
CREATE INDEX idx_paragraphs_page_id ON public.paragraphs(page_id);
CREATE INDEX idx_comments_paragraph_id ON public.comments(paragraph_id);
CREATE INDEX idx_comments_page_id ON public.comments(page_id);
CREATE INDEX idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX idx_comment_votes_comment_id ON public.comment_votes(comment_id);