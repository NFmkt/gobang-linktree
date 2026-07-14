import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Link } from "@/lib/links/types";
import { LinksManager } from "../LinksManager";

const links: Link[] = [
  { id: "a", title: "A 링크", url: "https://a.test", icon: "home", order: 1, active: true },
  { id: "b", title: "B 링크", url: "https://b.test", icon: "feed", order: 2, active: false },
];

const threeLinks: Link[] = [
  { id: "a", title: "A 링크", url: "https://a.test", icon: "home", order: 1, active: true },
  { id: "b", title: "B 링크", url: "https://b.test", icon: "feed", order: 2, active: false },
  { id: "c", title: "C 링크", url: "https://c.test", icon: "feed", order: 3, active: false },
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

  it("노출 토글에 접근성 이름 '노출'이 노출된다", () => {
    render(<LinksManager initialLinks={links} />);
    expect(screen.getAllByRole("switch", { name: "노출" })).toHaveLength(links.length);
  });

  it("노출 토글을 클릭하면 PATCH 후 목록을 다시 불러온다", async () => {
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
    const toggles = screen.getAllByRole("switch");
    fireEvent.click(toggles[0]);

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
    fireEvent.click(screen.getAllByRole("switch")[0]);

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
    fireEvent.click(screen.getAllByRole("switch")[0]);

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

  it("각 링크 행에 위로 이동/아래로 이동 버튼이 접근성 이름과 함께 노출된다", () => {
    render(<LinksManager initialLinks={threeLinks} />);
    expect(screen.getAllByRole("button", { name: "위로 이동" })).toHaveLength(threeLinks.length);
    expect(screen.getAllByRole("button", { name: "아래로 이동" })).toHaveLength(threeLinks.length);
  });

  it("첫 번째 항목의 위로 이동 버튼은 비활성화된다", () => {
    render(<LinksManager initialLinks={threeLinks} />);
    const upButtons = screen.getAllByRole("button", { name: "위로 이동" });
    expect(upButtons[0]).toBeDisabled();
    expect(upButtons[1]).not.toBeDisabled();
    expect(upButtons[2]).not.toBeDisabled();
  });

  it("마지막 항목의 아래로 이동 버튼은 비활성화된다", () => {
    render(<LinksManager initialLinks={threeLinks} />);
    const downButtons = screen.getAllByRole("button", { name: "아래로 이동" });
    expect(downButtons[0]).not.toBeDisabled();
    expect(downButtons[1]).not.toBeDisabled();
    expect(downButtons[2]).toBeDisabled();
  });

  it("아래로 이동 버튼 클릭 시 인접 항목과 순서를 바꾸고 reorder API를 호출한다", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<LinksManager initialLinks={threeLinks} />);
    const downButtons = screen.getAllByRole("button", { name: "아래로 이동" });
    fireEvent.click(downButtons[0]); // "A 링크"를 아래로

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/links/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: ["b", "a", "c"] }),
      });
    });
  });

  it("위로 이동 버튼 클릭 시 인접 항목과 순서를 바꾸고 reorder API를 호출한다", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<LinksManager initialLinks={threeLinks} />);
    const upButtons = screen.getAllByRole("button", { name: "위로 이동" });
    fireEvent.click(upButtons[2]); // "C 링크"를 위로

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/links/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: ["a", "c", "b"] }),
      });
    });
  });

  it("비활성화된 위로/아래로 이동 버튼을 클릭해도 reorder API를 호출하지 않는다", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<LinksManager initialLinks={threeLinks} />);
    const upButtons = screen.getAllByRole("button", { name: "위로 이동" });
    const downButtons = screen.getAllByRole("button", { name: "아래로 이동" });
    fireEvent.click(upButtons[0]);
    fireEvent.click(downButtons[2]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe("행 아코디언", () => {
    it("기본 상태에서는 어떤 행의 수정 폼도 보이지 않는다", () => {
      render(<LinksManager initialLinks={links} />);
      expect(screen.queryByPlaceholderText("제목")).not.toBeInTheDocument();
    });

    it("수정 버튼은 접힌 상태에서 aria-expanded=false다", () => {
      render(<LinksManager initialLinks={links} />);
      const editButtons = screen.getAllByRole("button", { name: "수정" });
      expect(editButtons[0]).toHaveAttribute("aria-expanded", "false");
    });

    it("수정 버튼을 클릭하면 해당 행에 인라인으로 폼이 펼쳐지고 aria-expanded=true가 된다", () => {
      render(<LinksManager initialLinks={links} />);
      const editButton = screen.getAllByRole("button", { name: "수정" })[0];
      fireEvent.click(editButton);

      expect(screen.getByPlaceholderText("제목")).toHaveValue("A 링크");
      expect(screen.getByRole("button", { name: "닫기" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
    });

    it("펼쳐진 행의 닫기 버튼을 다시 누르면 접혀서 폼이 사라진다", () => {
      render(<LinksManager initialLinks={links} />);
      fireEvent.click(screen.getAllByRole("button", { name: "수정" })[0]);
      expect(screen.getByPlaceholderText("제목")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "닫기" }));
      expect(screen.queryByPlaceholderText("제목")).not.toBeInTheDocument();
    });

    it("한 번에 한 행만 펼쳐진다 — 다른 행의 수정을 누르면 이전 행은 닫힌다", () => {
      render(<LinksManager initialLinks={links} />);
      const editButtons = screen.getAllByRole("button", { name: "수정" });

      fireEvent.click(editButtons[0]);
      expect(screen.getByPlaceholderText("제목")).toHaveValue("A 링크");

      fireEvent.click(screen.getByRole("button", { name: "수정" })); // B 행의 수정
      expect(screen.getByPlaceholderText("제목")).toHaveValue("B 링크");
    });

    it("+ 링크 추가를 누르면 펼쳐져 있던 행의 아코디언이 닫힌다", () => {
      render(<LinksManager initialLinks={links} />);
      fireEvent.click(screen.getAllByRole("button", { name: "수정" })[0]);
      expect(screen.getByPlaceholderText("제목")).toHaveValue("A 링크");

      fireEvent.click(screen.getByRole("button", { name: "+ 링크 추가" }));
      expect(screen.getByPlaceholderText("제목")).toHaveValue("");
    });

    it("행이 펼쳐진 상태에서도 위로/아래로 이동, 삭제, 노출 토글은 정상 동작한다", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);

      render(<LinksManager initialLinks={threeLinks} />);
      fireEvent.click(screen.getAllByRole("button", { name: "수정" })[0]);
      expect(screen.getByPlaceholderText("제목")).toBeInTheDocument();

      fireEvent.click(screen.getAllByRole("button", { name: "아래로 이동" })[0]);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith("/api/admin/links/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: ["b", "a", "c"] }),
        });
      });
    });
  });
});
