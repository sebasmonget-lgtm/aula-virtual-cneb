-- Keep the private bucket aligned with the validated local evidence limit.
-- Existing object ownership policies remain unchanged.
update storage.buckets
set file_size_limit = 8000000,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp',
      'audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg'
    ]
where id = 'student-evidence';
