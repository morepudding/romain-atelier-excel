begin;
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('radar-rework', 'radar-rework', false, 8388608, array['image/png','image/jpeg','image/webp']);
create policy rework_image_read on storage.objects for select to authenticated using (
  bucket_id = 'radar-rework' and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists(select 1 from public.radar_rework_projects p where p.id::text = (storage.foldername(name))[2] and p.user_id = (select auth.uid()))
);
create policy rework_image_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'radar-rework' and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists(select 1 from public.radar_rework_projects p where p.id::text = (storage.foldername(name))[2] and p.user_id = (select auth.uid()))
);
commit;
