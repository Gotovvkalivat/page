-- Templates table for storing user response templates
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  text text NOT NULL,
  tag text,
  favorite boolean DEFAULT false,
  "order" integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT title_length CHECK (char_length(title) <= 200)
);

-- Bindings table for storing CRM field bindings
CREATE TABLE IF NOT EXISTS bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  domain text NOT NULL,
  textarea_selector text NOT NULL,
  send_btn_selector text,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT domain_unique_per_user UNIQUE(user_id, domain)
);

-- User profiles for storing preferences
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  at_menu_enabled boolean DEFAULT true,
  grid_cols integer DEFAULT 3,
  grid_height text DEFAULT '240px',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_favorite ON templates(favorite) WHERE favorite = true;
CREATE INDEX idx_templates_order ON templates("order");
CREATE INDEX idx_bindings_user_id ON bindings(user_id);

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates
CREATE POLICY "users_can_view_own_templates" ON templates
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_templates" ON templates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_templates" ON templates
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_templates" ON templates
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for bindings
CREATE POLICY "users_can_view_own_bindings" ON bindings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_bindings" ON bindings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_bindings" ON bindings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_bindings" ON bindings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for user_profiles
CREATE POLICY "users_can_view_own_profile" ON user_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_profile" ON user_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_profile" ON user_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_templates_updated
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_user_profiles_updated
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
