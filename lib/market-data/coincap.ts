export type TickerTrend = "up" | "down" | "flat";

export type TickerItem = {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  changePercent24Hr: number;
  trend: TickerTrend;
};

type CoinCapAsset = {
  id: string;
  symbol: string;
  name: string;
  priceUsd: string;
  changePercent24Hr: string;
};

const COINCAP_URL = "https://api.coincap.io/v2/assets?limit=10";

const trendForChange = (changePercent24Hr: number): TickerTrend => {
  if (changePercent24Hr > 0) {
    return "up";
  }

  if (changePercent24Hr < 0) {
    return "down";
  }

  return "flat";
};

const parseNumber = (value: string): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getTopAssets = async (): Promise<TickerItem[] | null> => {
  try {
    const response = await fetch(COINCAP_URL, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { data?: CoinCapAsset[] };
    const assets = payload?.data ?? [];

    if (!Array.isArray(assets) || assets.length === 0) {
      return null;
    }

    const normalized = assets
      .map((asset) => {
        const priceUsd = parseNumber(asset.priceUsd);
        const changePercent24Hr = parseNumber(asset.changePercent24Hr);

        if (!asset.id || !asset.symbol || !asset.name) {
          return null;
        }

        if (priceUsd === null || changePercent24Hr === null) {
          return null;
        }

        return {
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          priceUsd,
          changePercent24Hr,
          trend: trendForChange(changePercent24Hr),
        } satisfies TickerItem;
      })
      .filter((item): item is TickerItem => item !== null);

    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
};
