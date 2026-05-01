export type BoardPostRow = {
  id: string;
  user_id: string;
  board_type: string;
  title: string;
  content: string;
  image_urls: string[];
  lat: number | null;
  lng: number | null;
  address: string | null;
  created_at: string;
  updated_at: string;
};
