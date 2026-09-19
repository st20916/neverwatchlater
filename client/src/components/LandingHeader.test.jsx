import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchCurrentUser, logout } from "../api/authApi";
import LandingHeader from "./LandingHeader";

vi.mock("../api/authApi", () => ({
  fetchCurrentUser: vi.fn(),
  logout: vi.fn(),
}));

const renderHeader = () =>
  render(
    <MemoryRouter>
      <LandingHeader />
    </MemoryRouter>,
  );

describe("LandingHeader", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("서비스 메뉴와 로그인 링크를 보여준다", () => {
    fetchCurrentUser.mockRejectedValue(new Error("로그인이 필요합니다."));

    renderHeader();

    expect(
      screen.getByRole("link", { name: "Neverwatchlater" }),
    ).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "서비스 소개" })).toHaveAttribute(
      "href",
      "/#intro",
    );
    expect(screen.getByRole("link", { name: "정리 목록" })).toHaveAttribute(
      "href",
      "/videos",
    );
    expect(screen.getByRole("link", { name: "재생목록 설정" })).toHaveAttribute(
      "href",
      "/playlist-setup",
    );
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/auth/loading",
    );
  });

  it("로그인되면 이름과 프로필 사진을 보여준다", async () => {
    fetchCurrentUser.mockResolvedValue({
      user: {
        name: "효주",
        picture: "https://example.com/photo.png",
      },
    });

    const { container } = renderHeader();

    await waitFor(() => {
      expect(screen.getByText("효주님")).toBeInTheDocument();
    });

    expect(container.querySelector(".nwl-account-photo")).toHaveAttribute(
      "src",
      "https://example.com/photo.png",
    );
    expect(
      screen.queryByRole("link", { name: "로그인" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "효주님, 로그아웃" }),
    ).toBeInTheDocument();
  });

  it("계정 버튼을 누르면 로그아웃 확인 창을 보여준다", async () => {
    fetchCurrentUser.mockResolvedValue({
      user: {
        name: "효주",
        picture: "https://example.com/photo.png",
      },
    });

    renderHeader();

    fireEvent.click(await screen.findByRole("button", { name: "효주님, 로그아웃" }));

    expect(screen.getByRole("dialog", { name: "로그아웃할까요?" })).toBeInTheDocument();
    expect(screen.getByText("로그인 상태가 해제됩니다.")).toBeInTheDocument();
  });

  it("로그아웃 확인을 취소하면 로그인 상태를 유지한다", async () => {
    fetchCurrentUser.mockResolvedValue({
      user: {
        name: "효주",
        picture: "https://example.com/photo.png",
      },
    });

    renderHeader();
    fireEvent.click(await screen.findByRole("button", { name: "효주님, 로그아웃" }));
    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "효주님, 로그아웃" }),
    ).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
  });

  it("로그아웃을 확인하면 세션을 종료하고 로그인 링크로 되돌린다", async () => {
    fetchCurrentUser.mockResolvedValue({
      user: {
        name: "효주",
        picture: "https://example.com/photo.png",
      },
    });
    logout.mockResolvedValue({ message: "로그아웃되었습니다." });

    renderHeader();
    fireEvent.click(await screen.findByRole("button", { name: "효주님, 로그아웃" }));
    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    await waitFor(() => {
      expect(logout).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByRole("link", { name: "로그인" })).toBeInTheDocument();
    expect(screen.queryByText("효주님")).not.toBeInTheDocument();
  });

  it("햄버거 메뉴를 열면 모바일 메뉴 링크를 보여준다", () => {
    fetchCurrentUser.mockRejectedValue(new Error("로그인이 필요합니다."));

    const { container } = renderHeader();

    fireEvent.click(container.querySelector(".nwl-header-menu"));

    expect(container.querySelector(".nwl-header-tray--open")).toBeTruthy();
    expect(container.querySelectorAll(".nwl-header-tray-link")).toHaveLength(3);
  });

  it("열린 메뉴는 영역 밖을 누르면 닫힌다", () => {
    fetchCurrentUser.mockRejectedValue(new Error("로그인이 필요합니다."));

    const { container } = renderHeader();

    fireEvent.click(container.querySelector(".nwl-header-menu"));
    expect(container.querySelector(".nwl-header-tray--open")).toBeTruthy();

    fireEvent.pointerDown(container.querySelector(".nwl-header-backdrop"));
    expect(container.querySelector(".nwl-header-tray--open")).toBeFalsy();
  });

  it("열린 메뉴는 트레이 안을 눌러도 닫히지 않는다", () => {
    fetchCurrentUser.mockRejectedValue(new Error("로그인이 필요합니다."));

    const { container } = renderHeader();

    fireEvent.click(container.querySelector(".nwl-header-menu"));
    fireEvent.pointerDown(container.querySelector(".nwl-header-tray"));

    expect(container.querySelector(".nwl-header-tray--open")).toBeTruthy();
  });
});
