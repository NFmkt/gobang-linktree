import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToggleSwitch } from "../ToggleSwitch";

describe("ToggleSwitch", () => {
  it("role=switch로 렌더되고 aria-checked가 checked prop을 반영한다", () => {
    render(<ToggleSwitch checked={true} onChange={() => {}} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("checked=false면 aria-checked=false를 반영한다", () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("클릭 시 onChange를 호출한다", () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("Enter 키로 토글할 수 있다", () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("switch"), { key: "Enter" });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("Space 키로 토글할 수 있다", () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("switch"), { key: " " });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("다른 키 입력에는 반응하지 않는다", () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("switch"), { key: "a" });
    expect(onChange).not.toHaveBeenCalled();
  });
});
