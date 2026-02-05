import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import messages from "@/messages/en.json";

export function renderWithIntl(ui: Parameters<typeof render>[0], options?: RenderOptions) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      {ui}
    </NextIntlClientProvider>,
    options,
  );
}
