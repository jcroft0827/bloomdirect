export type BloomWebsiteRecipeIngredientKind =
  | "flower"
  | "greenery"
  | "hardgood"
  | "supply"
  | "other";

export type BloomWebsiteRecipeIngredient = {
  kind: BloomWebsiteRecipeIngredientKind;
  name: string;
  quantity: number;
  unit: string;
  notes: string;
};

export type BloomWebsiteProductRecipe = {
  ingredients: BloomWebsiteRecipeIngredient[];
  designerInstructions: string;
};

export function emptyBloomWebsiteProductRecipe(): BloomWebsiteProductRecipe {
  return {
    ingredients: [],
    designerInstructions: "",
  };
}

export function cloneBloomWebsiteProductRecipe(
  recipe?: BloomWebsiteProductRecipe | null,
): BloomWebsiteProductRecipe {
  if (!recipe) return emptyBloomWebsiteProductRecipe();

  return {
    ingredients: Array.isArray(recipe.ingredients)
      ? recipe.ingredients.map((ingredient) => ({ ...ingredient }))
      : [],
    designerInstructions: recipe.designerInstructions || "",
  };
}

export function parseBloomWebsiteProductRecipe(
  value: unknown,
): BloomWebsiteProductRecipe {
  const raw =
    value && typeof value === "object"
      ? (value as {
          ingredients?: unknown;
          designerInstructions?: unknown;
        })
      : {};

  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients
        .slice(0, 100)
        .map((ingredient) => {
          const item =
            ingredient && typeof ingredient === "object"
              ? (ingredient as Record<string, unknown>)
              : {};

          const kind: BloomWebsiteRecipeIngredientKind =
            item.kind === "greenery" ||
            item.kind === "hardgood" ||
            item.kind === "supply" ||
            item.kind === "other"
              ? item.kind
              : "flower";

          const name =
            typeof item.name === "string"
              ? item.name.trim().slice(0, 160)
              : "";

          const parsedQuantity = Number(item.quantity);
          const quantity =
            Number.isFinite(parsedQuantity) && parsedQuantity >= 0
              ? Math.round(parsedQuantity * 100) / 100
              : 0;

          const unit =
            typeof item.unit === "string"
              ? item.unit.trim().slice(0, 60)
              : "";

          const notes =
            typeof item.notes === "string"
              ? item.notes.trim().slice(0, 500)
              : "";

          return {
            kind,
            name,
            quantity,
            unit: unit || "stem",
            notes,
          };
        })
        .filter((ingredient) => ingredient.name)
    : [];

  const designerInstructions =
    typeof raw.designerInstructions === "string"
      ? raw.designerInstructions.trim().slice(0, 3000)
      : "";

  return {
    ingredients,
    designerInstructions,
  };
}
