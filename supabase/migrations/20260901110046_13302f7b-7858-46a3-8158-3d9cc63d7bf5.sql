CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- ROLES ---------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TYPE public.moderation_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.meme_platform AS ENUM ('youtube','instagram','x','other');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles are public" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    lower(regexp_replace(split_part(COALESCE(NEW.email, 'user'), '@', 1) || '_' || substr(NEW.id::text, 1, 4), '[^a-z0-9_]', '', 'g')),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email,'user'), '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CHARACTERS ----------------------------------------------------------
CREATE TABLE public.characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  bio text,
  avatar_url text,
  origin text,
  category text,
  is_fictional boolean NOT NULL DEFAULT true,
  tags text[] NOT NULL DEFAULT '{}',
  popularity numeric NOT NULL DEFAULT 0,
  meme_count integer NOT NULL DEFAULT 0,
  follower_count integer NOT NULL DEFAULT 0,
  search_text text NOT NULL DEFAULT '',
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(search_text,''))) STORED,
  embedding vector(3072),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.characters TO anon;
GRANT SELECT ON public.characters TO authenticated;
GRANT ALL ON public.characters TO service_role;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "characters public read" ON public.characters FOR SELECT USING (true);
CREATE POLICY "admins manage characters" ON public.characters FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX characters_search_idx ON public.characters USING gin (search_vector);
CREATE INDEX characters_trgm_idx ON public.characters USING gin (search_text gin_trgm_ops);
CREATE INDEX characters_embedding_idx ON public.characters USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

CREATE TABLE public.character_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  alias text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX character_aliases_uniq ON public.character_aliases (character_id, lower(alias));
GRANT SELECT ON public.character_aliases TO anon;
GRANT SELECT ON public.character_aliases TO authenticated;
GRANT ALL ON public.character_aliases TO service_role;
ALTER TABLE public.character_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aliases public read" ON public.character_aliases FOR SELECT USING (true);
CREATE POLICY "admins manage aliases" ON public.character_aliases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.character_tag_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  tag text NOT NULL,
  suggested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  votes integer NOT NULL DEFAULT 1,
  status public.moderation_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX character_tag_suggestions_uniq ON public.character_tag_suggestions (character_id, lower(tag));
GRANT SELECT ON public.character_tag_suggestions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.character_tag_suggestions TO authenticated;
GRANT ALL ON public.character_tag_suggestions TO service_role;
ALTER TABLE public.character_tag_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved tags public read" ON public.character_tag_suggestions FOR SELECT
  USING (status = 'approved' OR auth.uid() = suggested_by OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users suggest tags" ON public.character_tag_suggestions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = suggested_by);
CREATE POLICY "admins manage tag suggestions" ON public.character_tag_suggestions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- MEMES ---------------------------------------------------------------
CREATE TABLE public.memes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  platform public.meme_platform NOT NULL DEFAULT 'other',
  external_id text,
  title text NOT NULL,
  description text,
  thumbnail_url text,
  author_name text,
  tags text[] NOT NULL DEFAULT '{}',
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.moderation_status NOT NULL DEFAULT 'pending',
  view_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  save_count integer NOT NULL DEFAULT 0,
  search_text text NOT NULL DEFAULT '',
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(search_text,''))) STORED,
  embedding vector(3072),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX memes_platform_external_uniq ON public.memes (platform, external_id) WHERE external_id IS NOT NULL;
GRANT SELECT ON public.memes TO anon;
GRANT SELECT, INSERT ON public.memes TO authenticated;
GRANT ALL ON public.memes TO service_role;
ALTER TABLE public.memes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved memes public read" ON public.memes FOR SELECT
  USING (status = 'approved' OR auth.uid() = submitted_by OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users submit memes" ON public.memes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitted_by AND status = 'pending');
CREATE POLICY "admins manage memes" ON public.memes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX memes_search_idx ON public.memes USING gin (search_vector);
CREATE INDEX memes_trgm_idx ON public.memes USING gin (search_text gin_trgm_ops);
CREATE INDEX memes_character_idx ON public.memes (character_id);
CREATE INDEX memes_status_created_idx ON public.memes (status, created_at DESC);
CREATE INDEX memes_embedding_idx ON public.memes USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

CREATE TABLE public.meme_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meme_id uuid NOT NULL REFERENCES public.memes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('like','save')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meme_id, user_id, kind)
);
GRANT SELECT, INSERT, DELETE ON public.meme_interactions TO authenticated;
GRANT ALL ON public.meme_interactions TO service_role;
ALTER TABLE public.meme_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own interactions" ON public.meme_interactions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.character_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (character_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.character_follows TO authenticated;
GRANT ALL ON public.character_follows TO service_role;
ALTER TABLE public.character_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own follows" ON public.character_follows FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SEARCH TEXT MAINTENANCE ---------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_character_search_text(_character_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.characters c
  SET search_text = lower(concat_ws(' ',
        c.name, c.slug, c.origin, c.category, c.bio,
        array_to_string(c.tags,' '),
        (SELECT string_agg(a.alias,' ') FROM public.character_aliases a WHERE a.character_id = c.id),
        (SELECT string_agg(s.tag,' ') FROM public.character_tag_suggestions s WHERE s.character_id = c.id AND s.status='approved')
      )),
      updated_at = now()
  WHERE c.id = _character_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.characters_search_text_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.search_text := lower(concat_ws(' ',
    NEW.name, NEW.slug, NEW.origin, NEW.category, NEW.bio, array_to_string(NEW.tags,' '),
    (SELECT string_agg(a.alias,' ') FROM public.character_aliases a WHERE a.character_id = NEW.id),
    (SELECT string_agg(s.tag,' ') FROM public.character_tag_suggestions s WHERE s.character_id = NEW.id AND s.status='approved')
  ));
  RETURN NEW;
END;
$$;
CREATE TRIGGER characters_search_text BEFORE INSERT OR UPDATE OF name, slug, origin, category, bio, tags
  ON public.characters FOR EACH ROW EXECUTE FUNCTION public.characters_search_text_trigger();

CREATE OR REPLACE FUNCTION public.alias_touch_character()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.refresh_character_search_text(COALESCE(NEW.character_id, OLD.character_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER aliases_touch AFTER INSERT OR UPDATE OR DELETE ON public.character_aliases
  FOR EACH ROW EXECUTE FUNCTION public.alias_touch_character();
CREATE TRIGGER tag_suggestions_touch AFTER INSERT OR UPDATE OR DELETE ON public.character_tag_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.alias_touch_character();

CREATE OR REPLACE FUNCTION public.memes_search_text_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ch record;
BEGIN
  SELECT name, origin, search_text INTO ch FROM public.characters WHERE id = NEW.character_id;
  NEW.search_text := lower(concat_ws(' ', NEW.title, NEW.description, NEW.author_name,
    array_to_string(NEW.tags,' '), ch.name, ch.origin, ch.search_text));
  RETURN NEW;
END;
$$;
CREATE TRIGGER memes_search_text BEFORE INSERT OR UPDATE OF title, description, author_name, tags, character_id
  ON public.memes FOR EACH ROW EXECUTE FUNCTION public.memes_search_text_trigger();

-- COUNTERS ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_character_meme_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
  cid := COALESCE(NEW.character_id, OLD.character_id);
  UPDATE public.characters SET meme_count = (SELECT count(*) FROM public.memes m WHERE m.character_id = cid AND m.status='approved') WHERE id = cid;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER memes_count_sync AFTER INSERT OR UPDATE OF status OR DELETE ON public.memes
  FOR EACH ROW EXECUTE FUNCTION public.sync_character_meme_count();

CREATE OR REPLACE FUNCTION public.sync_interaction_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE mid uuid;
BEGIN
  mid := COALESCE(NEW.meme_id, OLD.meme_id);
  UPDATE public.memes SET
    like_count = (SELECT count(*) FROM public.meme_interactions i WHERE i.meme_id = mid AND i.kind='like'),
    save_count = (SELECT count(*) FROM public.meme_interactions i WHERE i.meme_id = mid AND i.kind='save')
  WHERE id = mid;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER interactions_count_sync AFTER INSERT OR DELETE ON public.meme_interactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_interaction_counts();

CREATE OR REPLACE FUNCTION public.sync_follow_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
  cid := COALESCE(NEW.character_id, OLD.character_id);
  UPDATE public.characters SET follower_count = (SELECT count(*) FROM public.character_follows f WHERE f.character_id = cid) WHERE id = cid;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER follows_count_sync AFTER INSERT OR DELETE ON public.character_follows
  FOR EACH ROW EXECUTE FUNCTION public.sync_follow_counts();

-- POPULARITY ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_popularity()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.characters c SET popularity = COALESCE(s.score, 0)
  FROM (
    SELECT m.character_id,
           sum((m.like_count * 3 + m.save_count * 4 + m.view_count * 0.5)
               * exp(-extract(epoch FROM (now() - m.created_at)) / (60*60*24*14))
               + 1) AS score
    FROM public.memes m WHERE m.status = 'approved'
    GROUP BY m.character_id
  ) s WHERE s.character_id = c.id;
$$;

CREATE OR REPLACE FUNCTION public.increment_meme_view(_meme_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.memes SET view_count = view_count + 1 WHERE id = _meme_id AND status = 'approved';
$$;
GRANT EXECUTE ON FUNCTION public.increment_meme_view(uuid) TO anon, authenticated;