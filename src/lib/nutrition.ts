export const NUTRITION_DISCLAIMER =
  "General training-food education only. It is not a diet, a medical plan, or a diagnosis. A clinician or dietitian should guide this if you are injured, ill, pregnant, younger than 18, or treating a condition. Cramps are not proof of a sodium deficiency.";

export const NUTRITION_SOURCES = [
  {
    title: "ACSM, Academy of Nutrition and Dietetics, and Dietitians of Canada joint position: Nutrition and Athletic Performance (2016)",
    url: "https://journals.lww.com/acsm-msse/fulltext/2016/03000/nutrition_and_athletic_performance.25.aspx",
  },
  {
    title: "ISSN position stand: protein and exercise (2017)",
    url: "https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8",
  },
  {
    title: "International Exercise-Associated Hyponatremia consensus (drink to thirst; sodium is not a universal fix)",
    url: "https://journals.sagepub.com/doi/10.1016/j.wem.2015.05.008",
  },
] as const;

export type NutritionGoal = "performance" | "maintain" | "gradual_change";

export const NUTRITION_GOALS: NutritionGoal[] = ["performance", "maintain", "gradual_change"];

export function isNutritionGoal(value: unknown): value is NutritionGoal {
  return value === "performance" || value === "maintain" || value === "gradual_change";
}

export function proteinRangeGrams(bodyMassKg: number | null): { low: number; high: number } | null {
  if (bodyMassKg === null || !Number.isFinite(bodyMassKg) || bodyMassKg < 30 || bodyMassKg > 250) return null;
  return { low: Math.round(bodyMassKg * 1.4), high: Math.round(bodyMassKg * 2) };
}

export function goalNote(goal: NutritionGoal | null): string {
  if (goal === "performance") {
    return "For training, eat enough carbohydrate around harder sessions and spread protein through the day. This app does not set a calorie deficit.";
  }
  if (goal === "maintain") {
    return "Maintenance still needs regular meals, fluid to thirst, and protein across the day. No calorie target is calculated.";
  }
  if (goal === "gradual_change") {
    return "A slow change in body mass is a dietitian conversation. This app will not give an aggressive deficit, a restrictive target, or a calorie prescription.";
  }
  return "Leave goal and body mass blank if you do not want them stored. Nothing is assumed.";
}
