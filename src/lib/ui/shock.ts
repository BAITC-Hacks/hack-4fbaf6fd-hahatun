import type { DistrictId, Indicator, Run } from "@/lib/types";
import { INDICATOR_LABELS } from "@/lib/types";

// Temporary UI-side shape until the backend type lands in src/lib/types.ts.
export interface ShockEvent {
  title: string;
  districtId: DistrictId;
  indicator: Indicator;
  delta: number;
  text: string;
}

const MOCK_DELTA = -8;

const EVENTS: Record<Indicator, { title: string; text: string }> = {
  T1: { title: "Ремонт моста", text: "Мост закрыт на ремонт, потоки ушли на объезды и встали в пробках." },
  T2: { title: "Сбой на автобусных маршрутах", text: "Часть автобусов сошла с линии, интервалы на маршрутах выросли." },
  E1: { title: "Ураганный ветер", text: "Шквал повалил деревья в скверах и вдоль улиц." },
  E2: { title: "Смоговый эпизод", text: "Безветрие удержало над районом выбросы ТЭЦ и транспорта." },
  S1: { title: "Вспышка ОРВИ, карантин в школах", text: "Классы и группы детсадов закрыты на карантин." },
  S2: { title: "Вспышка ОРВИ, очереди в поликлиниках", text: "Поликлиники не справляются с потоком, запись к терапевту растянулась." },
  B1: { title: "Отключение уличного освещения", text: "После аварии на подстанции улицы остались без фонарей." },
  B2: { title: "Гололёд", text: "Ледяной дождь покрыл дороги, аварий на перекрёстках стало больше." },
  C1: { title: "Авария на теплосетях", text: "Прорыв магистрали оставил дома без тепла до окончания ремонта." },
  C2: { title: "Сбой службы обращений", text: "Портал обращений лёг, заявки жителей копятся без ответа." },
};

const INDICATORS = Object.keys(INDICATOR_LABELS) as Indicator[];

/** Deterministic demo shock: hits the weakest district after the run on its lowest indicator. */
export function mockShockFor(run: Run): ShockEvent {
  const district = run.engine.districts.reduce((a, b) => (b.dAfter < a.dAfter ? b : a));
  const indicator = INDICATORS.reduce((a, b) => (district.after[b] < district.after[a] ? b : a));
  return { ...EVENTS[indicator], districtId: district.id, indicator, delta: MOCK_DELTA };
}
