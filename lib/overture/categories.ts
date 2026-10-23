/**
 * Niche -> Overture category matching.
 *
 * Ported from the working `testoverture` prototype (reference only, not
 * imported at runtime). Pure functions: no I/O, no DuckDB, no network.
 */

export interface CategoryCandidate {
  category: string;
  count: number;
}

/**
 * Fixed synonyms for common "niche" search phrases, mapping to real Overture
 * category names. Every candidate is filtered against the categories that
 * actually exist in the target city, so unknown entries are silently dropped.
 *
 * Names verified against Overture release 2026-10-21.0 (`taxonomy.primary`).
 * The September 2026 taxonomy replaced the old `categories` names, e.g.
 * `car_dealer` -> `auto_dealer`, `hvac_services` -> `hvac_service`,
 * `legal_services` -> `legal_service`, and dentists are split across
 * `dental_clinic` / `general_dentistry` / `cosmetic_dentistry`.
 */
const SYNONYMS: Record<string, string[]> = {
  "showroom auto": ["auto_dealer", "used_auto_dealer"],
  "auto showroom": ["auto_dealer", "used_auto_dealer"],
  "car showroom": ["auto_dealer", "used_auto_dealer"],
  "car dealership": ["auto_dealer", "used_auto_dealer", "truck_dealer"],
  "car dealer": ["auto_dealer", "used_auto_dealer", "truck_dealer"],
  "used car dealer": ["used_auto_dealer", "auto_dealer"],
  "auto dealer": ["auto_dealer", "used_auto_dealer"],
  "automobile dealer": ["auto_dealer", "used_auto_dealer"],
  dealership: ["auto_dealer", "used_auto_dealer"],
  auto: ["auto_dealer", "used_auto_dealer", "auto_parts_store", "automotive_repair", "automotive_service"],
  "car rental": ["car_rental_service"],
  "auto parts": ["auto_parts_store"],
  "auto repair": ["automotive_repair", "automotive_service"],
  "car repair": ["automotive_repair", "automotive_service"],
  garage: ["automotive_repair", "automotive_service"],
  "car wash": ["car_wash"],
  tire: ["tire_dealer_and_repair"],
  plumber: ["plumbing"],
  plumbing: ["plumbing"],
  electrician: ["electrician"],
  hvac: ["hvac_service"],
  pharmacy: ["pharmacy"],
  drugstore: ["pharmacy"],
  "drug store": ["pharmacy"],
  dentist: ["dental_clinic", "general_dentistry", "cosmetic_dentistry"],
  "dental clinic": ["dental_clinic", "general_dentistry"],
  orthodontist: ["orthodontics"],
  doctor: ["doctors_office", "health_care", "family_practice"],
  hospital: ["hospital"],
  clinic: [
    "dental_clinic",
    "doctors_office",
    "outpatient_care_facility",
    "medical_clinic",
    "health_care",
  ],
  vet: ["veterinarian"],
  veterinarian: ["veterinarian"],
  "hair salon": ["hair_salon"],
  hairdresser: ["hair_salon"],
  barber: ["barber"],
  gym: ["gym", "sport_or_fitness_facility"],
  "fitness center": ["gym", "sport_or_fitness_facility"],
  "fitness centre": ["gym", "sport_or_fitness_facility"],
  cafe: ["cafe"],
  coffee: ["coffee_shop", "cafe"],
  "coffee shop": ["coffee_shop"],
  hotel: ["hotel", "lodging"],
  "real estate": [
    "real_estate_agent",
    "real_estate_service",
    "commercial_real_estate",
  ],
  lawyer: ["legal_service"],
  "law firm": ["legal_service"],
  accountant: ["accountant"],
  insurance: ["insurance_agency"],
  "gas station": ["gas_station"],
  "petrol station": ["gas_station"],
  fuel: ["gas_station"],
  electronics: ["electronics_store", "computer_store"],
  "mobile phone": ["mobile_phone_store", "cell_phone_store"],
  travel: ["travel_company", "travel_service", "travel_and_transportation"],
  grocery: ["grocery_store", "organic_grocery_store"],
  supermarket: ["grocery_store", "supercenter", "superstore"],
};

/** Lowercase phrase used as a SYNONYMS key. */
function normalizePhrase(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Split a free-text niche into comparison words. */
function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9 _.-]/g, " ")
    .split(/[\s_.-]+/)
    .filter((t) => t.length > 0);
}

/**
 * Contribution of a single niche word to a candidate category, or 0 when the
 * word does not relate to the category at all.
 */
function wordContribution(word: string, category: string): number {
  const c = category.toLowerCase();
  if (word === c) return 3; // exact phrase match, e.g. "dentist"
  const tokens = c.split("_");
  if (tokens.includes(word)) return 2; // token match, e.g. "car" in car_dealer
  for (const t of tokens) {
    if (t.startsWith(word) || word.startsWith(t)) return 1; // prefix match
  }
  if (c.includes(word) && word.length >= 3) return 0.5; // loose substring, e.g. "auto" broadly
  return 0;
}

/**
 * Match a free-text niche to the categories present in a candidate list.
 *
 * A category only counts when EVERY niche word contributes something to it
 * (so "skateboard shop" doesn't match every "*_shop"). Uses fixed synonyms
 * first, then token-overlap scoring, keeping only the top-scoring group.
 * When nothing matches, `suggestions` holds the most common categories.
 */
export function matchCategories(
  niche: string,
  candidates: CategoryCandidate[],
): { matched: string[]; suggestions: string[] } {
  const phrase = normalizePhrase(niche);
  const words = tokenize(niche);
  const available = candidates.filter((c) => c.count > 0);
  const byName = new Set(available.map((c) => c.category));

  // 0) Broad words that should fan out to a family of categories.
  //    "restaurant" -> restaurant + every *_restaurant (pizza, fast food, ...)
  if (phrase === "restaurant") {
    const matched = available
      .filter((c) => c.category === "restaurant" || c.category.endsWith("_restaurant"))
      .map((c) => c.category);
    return { matched, suggestions: available.map((c) => c.category) };
  }

  // 1) Synonym table
  const synonymTargets = SYNONYMS[phrase];
  if (synonymTargets) {
    const matched = synonymTargets.filter((c) => byName.has(c));
    return {
      matched,
      suggestions: available.map((c) => c.category).slice(0, 15),
    };
  }

  // 2) Token-match musts: join multi-word phrases (e.g. "car dealer" -> "car_dealer")
  const joined = words.join("_");
  for (const c of available) {
    if (c.category === joined) {
      return { matched: [c.category], suggestions: available.map((x) => x.category) };
    }
  }

  // 3) Fuzzy token scoring; a candidate must match EVERY word to qualify
  const scored = available
    .map((c) => {
      const contributions = words.map((w) => wordContribution(w, c.category));
      const passes = contributions.every((v) => v > 0);
      const score = contributions.reduce((a, b) => a + b, 0);
      return { category: c.category, count: c.count, score, passes };
    })
    .filter((s) => s.passes)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    const best = scored[0].score;
    const matched = scored.filter((s) => s.score === best).map((s) => s.category);
    return { matched, suggestions: scored.slice(0, 15).map((s) => s.category) };
  }

  return { matched: [], suggestions: available.map((c) => c.category).slice(0, 15) };
}
