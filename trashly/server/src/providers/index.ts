import { HttpClient } from "../lib/http.ts";
import { PrgRegistry, type AddressRegistry } from "../address/prg.ts";
import type { Store } from "../store/store.ts";
import type { ScheduleProvider } from "./provider.ts";
import { WarszawaProvider } from "./warszawa.ts";
import { PoznanProvider } from "./poznan.ts";
import { ZoryProvider, type PdfToText } from "./zory.ts";
import { jastrzebieProvider, rybnikProvider } from "./pdf-only.ts";

export interface ProviderDeps { http: HttpClient; registry?: AddressRegistry; store: Store; pdfToText?: PdfToText; now?: () => Date; }

/** Rejestr providerów – jeden na gminę. Dodanie miasta: wpis w cities.ts + provider tutaj. */
export function createProviders(deps: ProviderDeps): Record<string, ScheduleProvider> {
  const registry = deps.registry ?? new PrgRegistry(deps.http);
  return {
    zory: new ZoryProvider(deps.http, registry, deps.store, deps.pdfToText, deps.now),
    jastrzebie: jastrzebieProvider(deps.http, registry),
    rybnik: rybnikProvider(deps.http, registry),
    warszawa: new WarszawaProvider(deps.http),
    poznan: new PoznanProvider(deps.http, registry)
  };
}
