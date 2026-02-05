"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import {
  COINPAPRIKA_URL,
  normalizeCoinPaprikaTickers,
  type TickerItem,
} from "@/lib/market-data/coincap";

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const formatChange = (value: number) => {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
};

const trendStyles = {
  up: "text-emerald-400",
  down: "text-rose-400",
  flat: "text-muted-foreground",
} as const;

const TrendIcon = ({ trend }: { trend: TickerItem["trend"] }) => {
  if (trend === "up") {
    return <ArrowUpRight className="h-3 w-3" aria-hidden="true" />;
  }

  if (trend === "down") {
    return <ArrowDownRight className="h-3 w-3" aria-hidden="true" />;
  }

  return <Minus className="h-3 w-3" aria-hidden="true" />;
};

const TickerItemRow = ({ asset }: { asset: TickerItem }) => {
  const trendClass = trendStyles[asset.trend];

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="text-[11px] font-semibold tracking-[0.2em] text-foreground/80">
        {asset.symbol.toUpperCase()}
      </span>
      <span className="text-foreground/70">{usdFormatter.format(asset.priceUsd)}</span>
      <span className={`flex items-center gap-1 ${trendClass}`}>
        <TrendIcon trend={asset.trend} />
        <span className="tabular-nums">{formatChange(asset.changePercent24Hr)}</span>
      </span>
    </div>
  );
};

const fetchAssets = async (): Promise<TickerItem[] | null> => {
  try {
    const response = await fetch("/api/market-data", { cache: "no-store" });

    if (response.ok) {
      const payload = (await response.json()) as { assets?: TickerItem[] };
      const assets = payload.assets ?? [];

      if (assets.length > 0) {
        return assets;
      }
    }
  } catch {
    // Ignore and fall back to direct CoinPaprika fetch.
  }

  try {
    const response = await fetch(COINPAPRIKA_URL, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as unknown;

    return normalizeCoinPaprikaTickers(payload);
  } catch {
    return null;
  }
};

export const FooterTicker = () => {
  const [assets, setAssets] = useState<TickerItem[] | null>(null);
  const items = useMemo(() => (assets ? [...assets, ...assets] : []), [assets]);

  useEffect(() => {
    let isActive = true;

    const loadAssets = async () => {
      const nextAssets = await fetchAssets();

      if (isActive) {
        setAssets(nextAssets);
      }
    };

    loadAssets();
    const interval = window.setInterval(loadAssets, 60_000);

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, []);

  if (!assets || assets.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/80 text-xs backdrop-blur">
      <div className="w-full overflow-hidden px-3 py-2 md:px-4">
        <div className="group flex min-w-full items-center">
          <div className="flex w-max items-center gap-8 pr-8 tabular-nums animate-[ticker-scroll_40s_linear_infinite] motion-reduce:animate-none group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
            {items.map((asset, index) => (
              <TickerItemRow key={`${asset.id}-${index}`} asset={asset} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
