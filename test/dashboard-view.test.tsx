import { beforeAll, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import type { DashboardData } from "@/actions/dashboard";
import type { DashboardQuery } from "@/lib/dashboard/query";
import { renderWithIntl } from "@/test/utils/render-with-intl";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeAll(() => {
  if (!globalThis.ResizeObserver) {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
  }

  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }

  Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => "",
    }),
  });

  const svgPrototype = SVGGraphicsElement.prototype as SVGGraphicsElement & {
    getBBox?: () => DOMRect;
  };

  if (!svgPrototype.getBBox) {
    Object.defineProperty(svgPrototype, "getBBox", {
      value: () => ({ x: 0, y: 0, width: 0, height: 0 }),
    });
  }
});

const baseQuery: DashboardQuery = { range: "all" };

const sampleData: DashboardData = {
  displayCurrency: "PLN",
  totals: { buyValue: 300, sellValue: 560, pnlValue: 260 },
  series: [
    { date: "2025-01-01", buyValue: 100, sellValue: 60, pnlValue: -40 },
    { date: "2025-01-02", buyValue: 200, sellValue: 500, pnlValue: 260 },
  ],
  holdings: [
    {
      asset: "BTC",
      netQuantity: 0,
      buyValue: 200,
      sellValue: 500,
      pnlValue: 300,
      netValue: -300,
    },
    {
      asset: "SOL",
      netQuantity: 1,
      buyValue: 100,
      sellValue: 60,
      pnlValue: -40,
      netValue: 40,
    },
  ],
  holdingsMix: [{ asset: "SOL", value: 40 }],
  assets: ["BTC", "SOL"],
  rateAttribution: {
    providers: ["nbp"],
    warningCount: 0,
    latestEffectiveDate: "2025-01-02",
  },
};

describe("DashboardView", () => {
  it("renders KPI values and holdings", () => {
    renderWithIntl(<DashboardView data={sampleData} query={baseQuery} />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Total buys")).toBeInTheDocument();
    expect(screen.getByText("Total sells")).toBeInTheDocument();
    expect(screen.getByText("Realized PnL")).toBeInTheDocument();
    expect(screen.getByText("Holdings by asset")).toBeInTheDocument();
    expect(screen.getAllByText("SOL")).not.toHaveLength(0);
  });

  it("shows empty state messaging", () => {
    const emptyData: DashboardData = {
      displayCurrency: "PLN",
      totals: { buyValue: 0, sellValue: 0, pnlValue: 0 },
      series: [],
      holdings: [],
      holdingsMix: [],
      assets: [],
      rateAttribution: {
        providers: [],
        warningCount: 0,
        latestEffectiveDate: null,
      },
    };

    renderWithIntl(<DashboardView data={emptyData} query={baseQuery} />);

    expect(screen.getByText("No PnL data for this range.")).toBeInTheDocument();
    expect(screen.getByText("No holdings yet.")).toBeInTheDocument();
  });
});
