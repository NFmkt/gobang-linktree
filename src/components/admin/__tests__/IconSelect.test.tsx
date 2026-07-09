import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IconSelect, ICON_OPTIONS } from "../IconSelect";

describe("IconSelect", () => {
  it("ICON_OPTIONS의 모든 키를 옵션으로 렌더한다", () => {
    render(<IconSelect value="home" onChange={() => {}} />);
    for (const key of ICON_OPTIONS) {
      expect(screen.getByRole("option", { name: key })).toBeInTheDocument();
    }
  });

  it("현재 value를 select의 값으로 반영한다", () => {
    render(<IconSelect value="youtube" onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveValue("youtube");
  });

  it("다른 옵션 선택 시 onChange를 새 값으로 호출한다", () => {
    const onChange = vi.fn();
    render(<IconSelect value="home" onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "kakao" } });
    expect(onChange).toHaveBeenCalledWith("kakao");
  });
});
