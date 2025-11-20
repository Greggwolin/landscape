type CategoryMappingEntry = {
  category_id: number;
  category_name: string;
};

const categoryIdToName = new Map<number, string>();

export function updateCategoryMapping(entries: CategoryMappingEntry[]) {
  entries.forEach((entry) => {
    const id = Number(entry.category_id);
    if (Number.isFinite(id) && entry.category_name) {
      categoryIdToName.set(id, entry.category_name);
    }
  });
}

export function getCategoryNameFromMapping(categoryId: number): string | undefined {
  return categoryIdToName.get(Number(categoryId));
}
