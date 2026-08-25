import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ImportExportPanel } from "@/components/entries/import-export-panel";
import { renderWithIntl } from "@/test/utils/render-with-intl";

describe("ImportExportPanel", () => {
  it("previews uploaded CSV and confirms import", async () => {
    const previewAction = vi.fn(async (_prevState, formData: FormData) => {
      const provider = formData.get("provider");
      const file = formData.get("file");

      expect(provider).toBe("kraken");
      expect(file).toBeInstanceOf(File);

      return {
        status: "success",
        provider: "kraken" as const,
        filename: "sample.csv",
        delimiter: "," as const,
        encoding: "utf-8" as const,
        totalRows: 1,
        validRows: 1,
        invalidRows: 0,
        unsupportedRows: 0,
        rows: [
          {
            rowNumber: 2,
            status: "valid" as const,
            issues: [],
            rawRow: {},
            transaction: {
              provider: "kraken" as const,
              externalId: "tx-1",
              executedAt: "2026-01-01T00:00:00.000Z",
              operation: "BUY" as const,
              baseAsset: "BTC",
              quoteCurrency: "USD",
              quantity: "0.1",
              pricePerUnit: "40000",
              fullPrice: "4000",
              commission: "1",
              commissionCurrency: "USD",
              sourceName: "Kraken",
              rowNumber: 2,
              rawRow: {},
            },
          },
        ],
      };
    });

    const confirmAction = vi.fn(async () => ({
      status: "success" as const,
      importedCount: 1,
      failedCount: 0,
      duplicateCount: 0,
    }));

    renderWithIntl(
      <ImportExportPanel
        history={[]}
        query={{ page: 1, filters: {}, sortBy: "updatedAt", sortDir: "desc" }}
        previewAction={previewAction as never}
        confirmAction={confirmAction as never}
      />,
    );

    expect(screen.queryByLabelText(/csv file/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /export entries csv/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /expand import/i }));

    const fileInput = screen.getByLabelText(/csv file/i);
    const file = new File([
      "txid,ordertxid,pair,time,type,ordertype,price,cost,fee,vol\ntx-k-1,ord-k-1,XXBTZUSD,2026-01-02 10:00:00,buy,limit,42000,42,0.12,0.001",
    ], "sample.csv", { type: "text/csv" });

    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.submit(screen.getByRole("button", { name: /preview import/i }).closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(previewAction).toHaveBeenCalledOnce();
      expect(screen.getByText(/total: 1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /confirm import/i }));

    await waitFor(() => {
      expect(confirmAction).toHaveBeenCalledOnce();
    });
  });

  it("enables failed rows CSV download after confirm result includes report", async () => {
    const previewAction = vi.fn(async () => ({
      status: "success" as const,
      provider: "kraken" as const,
      filename: "sample.csv",
      delimiter: "," as const,
      encoding: "utf-8" as const,
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
      unsupportedRows: 0,
      rows: [
        {
          rowNumber: 2,
          status: "valid" as const,
          issues: [],
          rawRow: {},
          transaction: {
            provider: "kraken" as const,
            externalId: "tx-1",
            executedAt: "2026-01-01T00:00:00.000Z",
            operation: "BUY" as const,
            baseAsset: "BTC",
            quoteCurrency: "USD",
            quantity: "0.1",
            pricePerUnit: "40000",
            fullPrice: "4000",
            commission: "1",
            commissionCurrency: "USD",
            sourceName: "Kraken",
            rowNumber: 2,
            rawRow: {},
          },
        },
      ],
    }));

    const confirmAction = vi.fn(async () => ({
      status: "success" as const,
      importedCount: 0,
      failedCount: 1,
      duplicateCount: 0,
      failedReportCsv: "RowNumber,Status\n2,failed",
    }));

    const createUrlSpy = vi.fn(() => "blob:test-url");
    const revokeSpy = vi.fn(() => undefined);

    Object.defineProperty(URL, "createObjectURL", {
      value: createUrlSpy,
      configurable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      value: revokeSpy,
      configurable: true,
    });
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    renderWithIntl(
      <ImportExportPanel
        history={[]}
        query={{ page: 1, filters: {}, sortBy: "updatedAt", sortDir: "desc" }}
        previewAction={previewAction as never}
        confirmAction={confirmAction as never}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /expand import/i }));

    const fileInput = screen.getByLabelText(/csv file/i);
    const file = new File(["txid,pair,time,type,price,cost,fee,vol\n1,XXBTZUSD,2026,buy,1,1,0,1"], "sample.csv", {
      type: "text/csv",
    });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.submit(screen.getByRole("button", { name: /preview import/i }).closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(previewAction).toHaveBeenCalledOnce();
      expect(screen.getByRole("button", { name: /confirm import/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /confirm import/i }));

    await waitFor(() => expect(confirmAction).toHaveBeenCalledOnce());

    const downloadButton = screen.getByRole("button", { name: /download failed rows csv/i });
    expect(downloadButton).toBeEnabled();

    fireEvent.click(downloadButton);
    expect(createUrlSpy).toHaveBeenCalledOnce();
    expect(revokeSpy).toHaveBeenCalledOnce();

    anchorClickSpy.mockRestore();

  });
});
