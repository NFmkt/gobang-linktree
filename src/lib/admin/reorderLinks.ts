import type { Link } from "@/lib/links/types";

/**
 * draggedId를 targetId 위치로 옮긴 새 배열을 반환한다(원본 불변).
 * order 필드는 새 배열의 인덱스+1로 재계산해서 반환한다.
 */
export function reorderLinks(links: Link[], draggedId: string, targetId: string): Link[] {
  if (draggedId === targetId) return links;

  const draggedIndex = links.findIndex((link) => link.id === draggedId);
  const targetIndex = links.findIndex((link) => link.id === targetId);
  if (draggedIndex === -1 || targetIndex === -1) return links;

  const next = [...links];
  const [dragged] = next.splice(draggedIndex, 1);
  next.splice(targetIndex, 0, dragged);

  return next.map((link, index) => ({ ...link, order: index + 1 }));
}
