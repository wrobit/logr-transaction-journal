export type TickerTrend = "up" | "down" | "flat";

export type TickerItem = {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  changePercent24Hr: number;
  trend: TickerTrend;
};

type CoinPaprikaQuote = {
  price?: number;
  percent_change_24h?: number;
};

type CoinPaprikaTicker = {
  id: string;
  symbol: string;
  name: string;
  quotes?: {
    USD?: CoinPaprikaQuote;
  };
};

export const COINPAPRIKA_URL = "https://api.coinpaprika.com/v1/tickers?limit=10";

const trendForChange = (changePercent24Hr: number): TickerTrend => {
  if (changePercent24Hr > 0) {
    return "up";
  }

  if (changePercent24Hr < 0) {
    return "down";
  }

  return "flat";
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const normalizeCoinPaprikaTickers = (payload: unknown): TickerItem[] | null => {
  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const normalized = payload
    .map((asset) => {
      if (!asset || typeof asset !== "object") {
        return null;
      }

      const ticker = asset as CoinPaprikaTicker;
      const priceUsd = parseNumber(ticker.quotes?.USD?.price);
      const changePercent24Hr = parseNumber(ticker.quotes?.USD?.percent_change_24h);

      if (!ticker.id || !ticker.symbol || !ticker.name) {
        return null;
      }

      if (priceUsd === null || changePercent24Hr === null) {
        return null;
      }

      return {
        id: ticker.id,
        symbol: ticker.symbol,
        name: ticker.name,
        priceUsd,
        changePercent24Hr,
        trend: trendForChange(changePercent24Hr),
      } satisfies TickerItem;
    })
    .filter((item): item is TickerItem => item !== null);

  return normalized.length > 0 ? normalized : null;
};

export const getTopAssets = async (): Promise<TickerItem[] | null> => {
  try {
    const response = await fetch(COINPAPRIKA_URL, {
      next: { revalidate: 60 },
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
