-- 회의 음성을 잠시 보관하는 비공개 저장 공간을 만든다.
-- 접근 규칙(정책)을 만들지 않으므로 서버 키와 서버가 발급한 일회용 업로드 주소로만 쓸 수 있다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audio',
  'audio',
  false,
  26214400, -- 25MB
  -- 브라우저와 운영체제마다 mp3, m4a, wav를 다른 이름으로 알려 주므로 모두 허용한다.
  array[
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/vnd.wave'
  ]
);
