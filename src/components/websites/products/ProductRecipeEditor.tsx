"use client";

import { Plus, Trash2 } from "lucide-react";

import type {
  BloomWebsiteProductRecipe,
  BloomWebsiteRecipeIngredient,
  BloomWebsiteRecipeIngredientKind,
} from "@/lib/bloom-websites/productRecipes";

export default function ProductRecipeEditor({
  title,
  recipe,
  onChange,
}: {
  title: string;
  recipe: BloomWebsiteProductRecipe;
  onChange: (value: BloomWebsiteProductRecipe) => void;
}) {
  function updateIngredient(
    index: number,
    patch: Partial<BloomWebsiteRecipeIngredient>,
  ) {
    onChange({
      ...recipe,
      ingredients: recipe.ingredients.map((ingredient, ingredientIndex) =>
        ingredientIndex === index
          ? { ...ingredient, ...patch }
          : ingredient,
      ),
    });
  }

  function addIngredient() {
    onChange({
      ...recipe,
      ingredients: [
        ...recipe.ingredients,
        {
          kind: "flower",
          name: "",
          quantity: 1,
          unit: "stem",
          notes: "",
        },
      ],
    });
  }

  function removeIngredient(index: number) {
    onChange({
      ...recipe,
      ingredients: recipe.ingredients.filter(
        (_ingredient, ingredientIndex) => ingredientIndex !== index,
      ),
    });
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-gray-950">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Add flowers, greenery, hardgoods, supplies, and production notes.
          </p>
        </div>

        <button
          type="button"
          onClick={addIngredient}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-black text-gray-800 transition hover:border-purple-300 hover:text-purple-700"
        >
          <Plus size={15} />
          Add ingredient
        </button>
      </div>

      {recipe.ingredients.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
          No recipe ingredients yet.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {recipe.ingredients.map((ingredient, index) => (
            <div
              key={`${title}-${index}`}
              className="grid gap-3 rounded-xl border border-gray-200 bg-white p-3 lg:grid-cols-[130px_minmax(180px,1fr)_100px_120px_minmax(180px,1fr)_44px]"
            >
              <select
                value={ingredient.kind}
                onChange={(event) =>
                  updateIngredient(index, {
                    kind: event.target.value as BloomWebsiteRecipeIngredientKind,
                  })
                }
                className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              >
                <option value="flower">Flower</option>
                <option value="greenery">Greenery</option>
                <option value="hardgood">Hardgood</option>
                <option value="supply">Supply</option>
                <option value="other">Other</option>
              </select>

              <input
                value={ingredient.name}
                onChange={(event) =>
                  updateIngredient(index, { name: event.target.value })
                }
                maxLength={160}
                placeholder="e.g. Freedom Rose"
                className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-950 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />

              <input
                type="number"
                min="0"
                step="0.25"
                value={ingredient.quantity}
                onChange={(event) =>
                  updateIngredient(index, {
                    quantity:
                      event.target.value === ""
                        ? 0
                        : Number(event.target.value),
                  })
                }
                className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-950 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />

              <input
                value={ingredient.unit}
                onChange={(event) =>
                  updateIngredient(index, { unit: event.target.value })
                }
                maxLength={60}
                placeholder="stem"
                className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-950 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />

              <input
                value={ingredient.notes}
                onChange={(event) =>
                  updateIngredient(index, { notes: event.target.value })
                }
                maxLength={500}
                placeholder="Color, size, prep or substitution notes..."
                className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-950 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />

              <button
                type="button"
                onClick={() => removeIngredient(index)}
                aria-label="Remove recipe ingredient"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <label className="text-sm font-black text-gray-900">
          Designer instructions
        </label>
        <textarea
          value={recipe.designerInstructions}
          onChange={(event) =>
            onChange({
              ...recipe,
              designerInstructions: event.target.value,
            })
          }
          maxLength={3000}
          rows={4}
          placeholder="Mechanics, shape, dimensions, substitutions, finishing instructions..."
          className="mt-2 w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-950 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
        />
      </div>
    </div>
  );
}
