import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { getTopAssets, type TickerItem } from "@/lib/market-data/coincap";

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

export const FooterTicker = async () => {
  const assets = await getTopAssets();

  if (!assets || assets.length === 0) {
    return null;
  }

  const items = [...assets, ...assets];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/80 text-xs backdrop-blur">
      <div className="mx-auto max-w-6xl overflow-hidden px-6 py-2">
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
