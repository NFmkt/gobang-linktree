import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Link } from "@/lib/links/types";
import { LinksManager } from "../LinksManager";

const links: Link[] = [
  { id: "a", title: "A 링크", url: "https://a.test", icon: "home", order: 1, active: true },
  { id: "b", title: "B 링크", url: "https://b.test", icon: "feed", order: 2, active: false },
];

describe("LinksManager", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("전달받은 링크 목록을 렌더한다", () => {
    render(<LinksManager initialLinks={links} />);
    expect(screen.getByText("A 링크")).toBeInTheDocument();
    expect(screen.getByText("B 링크")).toBeInTheDocument();
  });

  it("노출 체크박스를 토글하면 PATCH 후 목록을 다시 불러온다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ links: [{ ...links[0], active: false }, links[1]] }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<LinksManager initialLinks={links} />);
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/links/a", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/links");
  });

  it("삭제 버튼 클릭 시 확인 후 DELETE를 호출하고 목록을 다시 불러온다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ links: [links[1]] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<LinksManager initialLinks={links} />);
    fireEvent.click(screen.getAllByRole("button", { name: "삭제" })[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/links/a", { method: "DELETE" });
    });
    expect(window.confirm).toHaveBeenCalled();
  });

  it("삭제 확인을 취소하면 DELETE를 호출하지 않는다", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<LinksManager initialLinks={links} />);
    fireEvent.click(screen.getAllByRole("button", { name: "삭제" })[0]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("+ 링크 추가 버튼 클릭 시 생성 폼이 나타난다", () => {
    render(<LinksManager initialLinks={links} />);
    fireEvent.click(screen.getByRole("button", { name: "+ 링크 추가" }));
    expect(screen.getByPlaceholderText("제목")).toBeInTheDocument();
  });

  it("수정 버튼 클릭 시 해당 링크 값으로 폼이 나타난다", () => {
    render(<LinksManager initialLinks={links} />);
    fireEvent.click(screen.getAllByRole("button", { name: "수정" })[0]);
    expect(screen.getByPlaceholderText("제목")).toHaveValue("A 링크");
  });

  it("노출 토글 중 네트워크 오류가 나면 에러 메시지를 보여준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    render(<LinksManager initialLinks={links} />);
    fireEvent.click(screen.getAllByRole("checkbox")[0]);

    await waitFor(() => {
      expect(
        screen.getByText("노출 상태 변경 요청에 실패했습니다. 네트워크 상태를 확인해주세요."),
      ).toBeInTheDocument();
    });
  });

  it("노출 토글 응답이 실패(non-2xx)면 에러 메시지를 보여주고 목록을 다시 불러오지 않는다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<LinksManager initialLinks={links} />);
    fireEvent.click(screen.getAllByRole("checkbox")[0]);

    await waitFor(() => {
      expect(screen.getByText("노출 상태 변경에 실패했습니다.")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("삭제 중 네트워크 오류가 나면 에러 메시지를 보여준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    render(<LinksManager initialLinks={links} />);
    fireEvent.click(screen.getAllByRole("button", { name: "삭제" })[0]);

    await waitFor(() => {
      expect(
        screen.getByText("삭제 요청에 실패했습니다. 네트워크 상태를 확인해주세요."),
      ).toBeInTheDocument();
    });
  });

  it("링크를 드래그해서 놓으면 새 순서로 reorder API를 호출한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 })); // reorder PATCH
    vi.stubGlobal("fetch", fetchMock);

    render(<LinksManager initialLinks={links} />);
    const items = screen.getAllByRole("listitem");

    fireEvent.dragStart(items[1]); // "B 링크"를 집어서
    fireEvent.dragOver(items[0]);
    fireEvent.drop(items[0]); // "A 링크" 위치에 놓음

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/links/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: ["b", "a"] }),
      });
    });
  });
});
