import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Link } from "@/lib/links/types";
import { LinkForm } from "../LinkForm";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LinkForm — create 모드", () => {
  it("제출 시 POST /api/admin/links를 호출하고 onSaved를 부른다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ link: {} }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const onSaved = vi.fn();

    render(<LinkForm mode="create" nextOrder={3} onSaved={onSaved} onCancel={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("제목"), { target: { value: "새 링크" } });
    fireEvent.change(screen.getByPlaceholderText("URL"), { target: { value: "https://new.test" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/links",
      expect.objectContaining({ method: "POST" }),
    );
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body as string)).toMatchObject({
      title: "새 링크",
      url: "https://new.test",
      icon: "home",
      order: 3,
    });
  });
});

describe("LinkForm — edit 모드", () => {
  const link: Link = {
    id: "a",
    title: "A",
    url: "https://a.test",
    icon: "feed",
    order: 1,
    active: true,
    thumbnail: "https://a.test/thumb.png",
  };

  it("초기값을 링크 데이터로 채운다 (썸네일 포함)", () => {
    render(<LinkForm mode="edit" link={link} onSaved={() => {}} onCancel={() => {}} />);
    expect(screen.getByPlaceholderText("제목")).toHaveValue("A");
    expect(screen.getByPlaceholderText("URL")).toHaveValue("https://a.test");
    expect(screen.getByPlaceholderText("썸네일 이미지 URL (선택)")).toHaveValue(
      "https://a.test/thumb.png",
    );
  });

  it("썸네일을 수정해 제출하면 PATCH body에 thumbnail이 포함된다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ link: {} }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<LinkForm mode="edit" link={link} onSaved={() => {}} onCancel={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("썸네일 이미지 URL (선택)"), {
      target: { value: "https://a.test/new-thumb.png" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body as string)).toMatchObject({
      thumbnail: "https://a.test/new-thumb.png",
    });
  });

  it("제출 시 PATCH /api/admin/links/[id]를 호출한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ link: {} }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const onSaved = vi.fn();

    render(<LinkForm mode="edit" link={link} onSaved={onSaved} onCancel={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("제목"), { target: { value: "수정됨" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/links/a",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("취소 버튼 클릭 시 onCancel을 호출한다", () => {
    const onCancel = vi.fn();
    render(<LinkForm mode="edit" link={link} onSaved={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("네트워크 오류로 fetch가 실패하면 에러 메시지를 보여준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    render(<LinkForm mode="edit" link={link} onSaved={() => {}} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(
        screen.getByText("저장 요청에 실패했습니다. 네트워크 상태를 확인해주세요."),
      ).toBeInTheDocument();
    });
  });
});
