
CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = 'avatars' AND auth.uid()::text = split_part((storage.filename(name)), '.', 1));

CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'media' AND (storage.foldername(name))[1] = 'avatars' AND auth.uid()::text = split_part((storage.filename(name)), '.', 1));

CREATE POLICY "Public read media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'media');
