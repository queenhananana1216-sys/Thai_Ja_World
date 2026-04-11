export type MemoryEntry = {
  id: string;
  /** 본문 (검색 대상) */
  text: string;
  /** 선택 태그 */
  tags?: string[];
  createdAt: string;
};
