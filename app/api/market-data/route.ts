import { NextResponse } from "next/server";

import {
  COINPAPRIKA_URL,
  normalizeCoinPaprikaTickers,
} from "@/lib/market-data/coincap";

export const runtime = "nodejs";
export const revalidate = 60;

export const GET = async () => {
  try {
    const response = await fetch(COINPAPRIKA_URL, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return NextResponse.json({ assets: [] });
    }

    const payload = (await response.json()) as unknown;
    const assets = normalizeCoinPaprikaTickers(payload);

    return NextResponse.json({ assets: assets ?? [] });
  } catch {
    return NextResponse.json({ assets: [] });
  }
};
