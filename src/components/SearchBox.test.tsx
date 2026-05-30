/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SearchBox } from "./SearchBox";
import { getTranslations } from "../i18n";

const t = getTranslations();

// Mock motion/react to prevent requestAnimationFrame/animation-loop test hangs
vi.mock("motion/react", () => {
  return {
    motion: {
      div: ({ children, ...props }: any) => {
        // Strip out motion-specific transition/animate/initial props to prevent react warnings on raw div html elements
        const { transition, animate, initial, exit, ...rest } = props;
        return <div {...rest}>{children}</div>;
      },
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Mock useOramaSearch
const performSearchMock = vi.fn();
let isInitializingMock = false;

vi.mock("../hooks/useOramaSearch", () => ({
  useOramaSearch: () => ({
    performSearch: performSearchMock,
    isInitializing: isInitializingMock,
    error: null,
  }),
}));

describe("SearchBox component", () => {
  const onNavigateMock = vi.fn();
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    isInitializingMock = false;
    performSearchMock.mockResolvedValue([]);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders input field with correct placeholder and autoFocus", () => {
    render(
      <SearchBox
        onNavigate={onNavigateMock}
        placeholder="Etsi jotain..."
        autoFocus={true}
      />,
    );

    const input = screen.getByTestId("search-input") as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.placeholder).toBe("Etsi jotain...");
    expect(document.activeElement).toBe(input);
  });

  it("does not trigger search when query has fewer than 2 characters", () => {
    render(<SearchBox onNavigate={onNavigateMock} />);

    const input = screen.getByTestId("search-input");
    fireEvent.change(input, { target: { value: "a" } });

    // Fast-forward debounce timer (300ms)
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(performSearchMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId("search-results-container")).toBeNull();
  });

  it("triggers search after 300ms debounce when user types 2+ characters", async () => {
    const mockHits = [
      {
        id: "1",
        score: 1,
        document: {
          type: "post",
          title: "Kaavatietomalli opas",
          slug: "opas-slug",
          excerpt: "Tietoa kaavoituksesta",
        },
      },
    ];
    performSearchMock.mockResolvedValue(mockHits);

    render(<SearchBox onNavigate={onNavigateMock} />);

    const input = screen.getByTestId("search-input");
    fireEvent.change(input, { target: { value: "kaava" } });

    // Before 300ms, search is not triggered
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(performSearchMock).not.toHaveBeenCalled();

    // After 300ms, search should be called
    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(performSearchMock).toHaveBeenCalledWith("kaava");

    // Confirm that the results container and items appear
    const container = screen.getByTestId("search-results-container");
    expect(container).toBeDefined();
    expect(screen.getByText("Kaavatietomalli opas")).toBeDefined();
    expect(screen.getByText("Tietoa kaavoituksesta")).toBeDefined();
  });

  it('renders a "no results" state when no matches are found', async () => {
    performSearchMock.mockResolvedValue([]);

    render(<SearchBox onNavigate={onNavigateMock} />);

    const input = screen.getByTestId("search-input");
    fireEvent.change(input, { target: { value: "tyhjä" } });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByTestId("search-results-container")).toBeDefined();
    expect(screen.getByText(new RegExp(t.search.noResults, "i"))).toBeDefined();
  });

  it("triggers navigate callback and resets query when a result is clicked", async () => {
    const mockHits = [
      {
        id: "author-1",
        score: 1,
        document: {
          type: "author",
          name: "Matti Meikäläinen",
          slug: "matti-meikalainen",
          title: "Asiantuntija",
          company: "Spatineo",
        },
      },
    ];
    performSearchMock.mockResolvedValue(mockHits);

    render(
      <SearchBox
        onNavigate={onNavigateMock}
        onClose={onCloseMock}
        showClose={true}
      />,
    );

    const input = screen.getByTestId("search-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "matti" } });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByText("Matti Meikäläinen")).toBeDefined();

    // Click the result button
    const resultButton = screen.getByRole("button", {
      name: /Matti Meikäläinen/i,
    });
    fireEvent.click(resultButton);

    expect(onNavigateMock).toHaveBeenCalledWith("author", "matti-meikalainen");
    expect(onCloseMock).toHaveBeenCalled();
    expect(input.value).toBe("");
  });

  it("triggers onClose when the close button is clicked and clears query", () => {
    render(
      <SearchBox
        onNavigate={onNavigateMock}
        initialQuery="testi"
        showClose={true}
        onClose={onCloseMock}
      />,
    );

    const closeButton = screen.getByRole("button", {
      name: new RegExp(t.search.close, "i"),
    });
    expect(closeButton).toBeDefined();

    fireEvent.click(closeButton);

    expect(onCloseMock).toHaveBeenCalled();
    const input = screen.getByTestId("search-input") as HTMLInputElement;
    expect(input.value).toBe("");
  });
});
