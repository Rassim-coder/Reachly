export interface CategoryCandidate {
  category: string;
  count: number;
}

/**
 * Fixed synonyms for common "niche" search phrases, mapping to real Overture
 * category names. Every candidate is filtered against the categories that
 * actually exist in the target city, so unknown entries are silently dropped.
 */
const SYNONYMS: Record<string, string[]> = {
  'showroom auto': ['car_dealer', 'used_car_dealer'],
  'auto showroom': ['car_dealer', 'used_car_dealer'],
  'car showroom': ['car_dealer', 'used_car_dealer'],
  'car dealership': ['car_dealer', 'used_car_dealer'],
  'car dealer': ['car_dealer', 'used_car_dealer'],
  'used car dealer': ['used_car_dealer', 'car_dealer'],
  'auto dealer': ['car_dealer', 'used_car_dealer'],
  'automobile dealer': ['car_dealer', 'used_car_dealer'],
  dealership: ['car_dealer', 'used_car_dealer'],
  auto: ['car_dealer', 'used_car_dealer', 'auto_parts_and_supply_store', 'automotive_repair'],
  'car rental': ['car_rental_agency'],
  'auto parts': ['auto_parts_and_supply_store'],
  'auto repair': ['automotive_repair', 'automotive_services_and_repair'],
  'car repair': ['automotive_repair', 'automotive_services_and_repair'],
  garage: ['automotive_repair'],
  'car wash': ['car_wash'],
  tire: ['tire_dealer_and_repair'],
  plumber: ['plumbing'],
  plumbing: ['plumbing'],
  electrician: ['electrician'],
  hvac: ['hvac_services'],
  pharmacy: ['pharmacy'],
  drugstore: ['pharmacy'],
  'drug store': ['pharmacy'],
  dentist: ['dentist'],
  'dental clinic': ['dentist'],
  orthodontist: ['orthodontist'],
  doctor: ['health_and_medical', 'family_practice'],
  hospital: ['hospital'],
  clinic: ['medical_center', 'diagnostic_services'],
  vet: ['veterinarian'],
  veterinarian: ['veterinarian'],
  'hair salon': ['hair_salon'],
  hairdresser: ['hair_salon'],
  barber: ['barber'],
  gym: ['gym'],
  'fitness center': ['gym'],
  'fitness centre': ['gym'],
  cafe: ['cafe'],
  'coffee shop': ['coffee_shop'],
  hotel: ['hotel'],
  'real estate': ['real_estate_agent', 'real_estate_service'],
  lawyer: ['lawyer', 'legal_services'],
  'law firm': ['legal_services', 'lawyer'],
  accountant: ['accountant'],
  insurance: ['insurance_agency'],
  'gas station': ['gas_station'],
  'petrol station': ['gas_station'],
  electronics: ['electronics', 'computer_store'],
  'mobile phone': ['mobile_phone_store'],
  travel: ['travel_company', 'travel_services', 'tours'],
  grocery: ['grocery_store'],
  supermarket: ['grocery_store', 'superstore'],
};

/** Lowercase phrase used as a SYNONYMS key. */
function normalizePhrase(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Split a free-text niche into comparison words. */
function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9 _.-]/g, ' ')
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
  const tokens = c.split('_');
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
export function matchCategories(niche: string, candidates: CategoryCandidate[]): {
  matched: string[];
  suggestions: string[];
} {
  const phrase = normalizePhrase(niche);
  const words = tokenize(niche);
  const available = candidates.filter((c) => c.count > 0);
  const byName = new Set(available.map((c) => c.category));

  // 0) Broad words that should fan out to a family of categories.
  //    "restaurant" -> restaurant + every *_restaurant (pizza, fast food, ...)
  if (phrase === 'restaurant') {
    const matched = available
      .filter((c) => c.category === 'restaurant' || c.category.endsWith('_restaurant'))
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
  const joined = words.join('_');
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