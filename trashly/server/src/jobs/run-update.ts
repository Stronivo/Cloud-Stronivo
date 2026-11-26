import { HttpClient } from "../lib/http.ts";
import { createProviders } from "../providers/index.ts";
import { ScheduleService } from "../services/schedule-service.ts";
import { createStore } from "../store/factory.ts";

// Jednorazowy przebieg aktualizacji – do uruchamiania z crona, np.:
//   */30 * * * *  cd /srv/trashly/server && node src/jobs/run-update.ts >> /var/log/trashly-update.log 2>&1
// Każdy harmonogram ma własny termin sprawdzenia (next_check_at) wg interwału providera,
// więc częste uruchamianie crona nie zwiększa liczby zapytań do źródeł.

const store = createStore();
const service = new ScheduleService(createProviders({ http: new HttpClient(), store }), store);
const started = Date.now();
try {
  const r = await service.runDueUpdates();
  console.log(JSON.stringify({ at: new Date().toISOString(), ...r, ms: Date.now() - started }));
} catch (e) {
  console.error("[trashly] aktualizacja nieudana:", e);
  process.exitCode = 1;
}
