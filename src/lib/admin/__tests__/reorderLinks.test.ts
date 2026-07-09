import { describe, it, expect } from "vitest";
import { reorderLinks } from "../reorderLinks";
import type { Link } from "@/lib/links/types";

const links: Link[] = [
  { id: "a", title: "A", url: "https://a.test", icon: "home", order: 1, active: true },
  { id: "b", title: "B", url: "https://b.test", icon: "home", order: 2, active: true },
  { id: "c", title: "C", url: "https://c.test", icon: "home", order: 3, active: true },
];

describe("reorderLinks", () => {
  it("draggedId를 targetId 위치로 옮기고 order를 재계산한다", () => {
    const result = reorderLinks(links, "c", "a");
    expect(result.map((l) => l.id)).toEqual(["c", "a", "b"]);
    expect(result.map((l) => l.order)).toEqual([1, 2, 3]);
  });

  it("draggedId와 targetId가 같으면 원본과 동일한 순서를 반환한다", () => {
    const result = reorderLinks(links, "a", "a");
    expect(result.map((l) => l.id)).toEqual(["a", "b", "c"]);
  });

  it("존재하지 않는 id가 있으면 원본 배열을 그대로 반환한다", () => {
    const result = reorderLinks(links, "missing", "a");
    expect(result).toBe(links);
  });

  it("원본 배열을 변형하지 않는다", () => {
    const original = [...links];
    reorderLinks(links, "c", "a");
    expect(links).toEqual(original);
  });
});
