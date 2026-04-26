-- =============================================================================
-- 063_bestvip77_mock_posts — 광고 포털 bestvip77 예시 데이터 (Mock Data)
-- 앱: 02_Workspace/bestvip77
-- =============================================================================

insert into public.bestvip77_posts (
  title, 
  price_info, 
  is_pinned, 
  profile_image_url, 
  gallery_image_urls, 
  body_text
) 
values 
(
  '.06年溫柔慧慧，服務型嫩妹', 
  '家用: 350', 
  true, 
  'https://picsum.photos/seed/p1/400/400', 
  ARRAY['https://picsum.photos/seed/g1/800/600', 'https://picsum.photos/seed/g2/800/600', 'https://picsum.photos/seed/g3/800/600'], 
  '這是一段測試用的商家介紹文字。慧慧提供最溫柔的服務，歡迎預約！\n\n聯絡方式：62173118'
), 
(
  '.小表妹辰辰', 
  '家用: 500', 
  true, 
  'https://picsum.photos/seed/p2/400/400', 
  ARRAY['https://picsum.photos/seed/g4/800/600', 'https://picsum.photos/seed/g5/800/600'], 
  '辰辰是最可愛的小表妹，等你來找我玩哦！\n\n聯絡方式：12345678'
), 
(
  '大波淫姣～思思', 
  '家用: 300', 
  false, 
  'https://picsum.photos/seed/p3/400/400', 
  ARRAY['https://picsum.photos/seed/g6/800/600', 'https://picsum.photos/seed/g7/800/600', 'https://picsum.photos/seed/g8/800/600'], 
  '(H房個體戶)有優質服務，優質靚女，24歲度，大波身材超索，任我玩好過癮，按摩都過關，調情起機特別有技巧，聲音導航伴我起飛，好快敗左，瞇眼盡情噴射出去，舒服呀～\n\n聯絡方式：62173118'
);
