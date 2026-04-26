-- =============================================================================
-- 065_bestvip77_mock_60_posts — 광고 포털 bestvip77 예시 데이터 60개 이상
-- 앱: 02_Workspace/bestvip77
-- =============================================================================

DO $$
DECLARE
  i INT;
  titles TEXT[] := ARRAY[
    '.06年溫柔慧慧，服務型嫩妹', 
    '.小表妹辰辰', 
    '大波淫姣～思思', 
    '澳門新區星星19 現場自拍', 
    '高質混血模特兒', 
    '清純大學生兼職', 
    '性感御姐在線', 
    '可愛蘿莉雙馬尾', 
    '氣質OL制服誘惑', 
    '火辣車模私拍'
  ];
  prices TEXT[] := ARRAY[
    '家用: 350', 
    '家用: 500', 
    '家用: 300', 
    '家用: 600', 
    '家用: 800', 
    '家用: 400', 
    '家用: 450', 
    '家用: 380', 
    '家用: 550', 
    '家用: 700'
  ];
  v_title TEXT;
  v_price TEXT;
  v_profile TEXT;
  v_gallery TEXT[];
  v_video TEXT;
  v_body TEXT;
BEGIN
  FOR i IN 1..65 LOOP
    v_title := titles[1 + (i % 10)] || ' (No.' || i || ')';
    v_price := prices[1 + (i % 10)];
    -- 랜덤한 이미지 생성을 위해 seed 값에 i를 넣음
    v_profile := 'https://picsum.photos/seed/profile_' || i || '/400/400';
    v_gallery := ARRAY[
      'https://picsum.photos/seed/gallery_' || i || '_1/800/600',
      'https://picsum.photos/seed/gallery_' || i || '_2/800/600',
      'https://picsum.photos/seed/gallery_' || i || '_3/800/600'
    ];
    
    -- 일부 게시글에만 유튜브 쇼츠 영상 URL 넣기 (예: 3의 배수)
    IF i % 3 = 0 THEN
      -- 유튜브 쇼츠 예시 URL
      v_video := 'https://www.youtube.com/shorts/7a42iE6wBwM'; 
    ELSE
      v_video := NULL;
    END IF;
    
    v_body := '這是第 ' || i || ' 號商家的詳細介紹。我們提供最優質的服務，保證讓您滿意！\n\n' ||
              '身高：16' || (5 + (i % 5)) || 'cm\n' ||
              '體重：4' || (5 + (i % 8)) || 'kg\n' ||
              '聯絡方式：+853 66' || (10000 + i * 123) || '\n\n' ||
              '歡迎隨時預約，享受專屬您的美好時光。';

    INSERT INTO public.bestvip77_posts (
      title, price_info, is_pinned, profile_image_url, gallery_image_urls, body_text, video_url
    ) VALUES (
      v_title, v_price, (i <= 5), v_profile, v_gallery, v_body, v_video
    );
  END LOOP;
END $$;
