
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

DROP POLICY IF EXISTS "Avatars public read" ON storage.objects;
CREATE POLICY "Avatars public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatars users upload own" ON storage.objects;
CREATE POLICY "Avatars users upload own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatars users update own" ON storage.objects;
CREATE POLICY "Avatars users update own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatars users delete own" ON storage.objects;
CREATE POLICY "Avatars users delete own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
