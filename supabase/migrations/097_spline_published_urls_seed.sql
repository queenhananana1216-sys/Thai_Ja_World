-- 097: 사용자 제공 my.spline.design 퍼블리시 URL 을 6슬롯에 반영 (로컬·기존 DB 동기화)

update public.spline_scenes
set
  published_url = 'https://my.spline.design/untitled-6MEZrYbp1Q8JjOqv4fPvflGo/',
  updated_at = now()
where slot = 'logo';

update public.spline_scenes
set
  published_url = 'https://my.spline.design/untitled-VNuwDHWlYGdhHyZRp7N0cLuJ/',
  updated_at = now()
where slot = 'hero';

update public.spline_scenes
set
  published_url = 'https://my.spline.design/untitled-Dklf63Kz4NY2Y7hGH4TNbgxD/',
  updated_at = now()
where slot = 'accent1';

update public.spline_scenes
set
  published_url = 'https://my.spline.design/untitled-ICV6BBSwTo8WMeUdlEuI37qR/',
  updated_at = now()
where slot = 'accent2';

update public.spline_scenes
set
  published_url = 'https://my.spline.design/untitled-x483V0uq2y847YLaUqdPdkcv/',
  updated_at = now()
where slot = 'accent3';

update public.spline_scenes
set
  published_url = 'https://my.spline.design/untitled-x483V0uq2y847YLaUqdPdkcv/',
  updated_at = now()
where slot = 'accent4';
