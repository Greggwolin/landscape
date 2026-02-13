export type LotProduct = {
  product_id: string;
  code: string;
  name?: string;
  subtype_id?: string;
};

export const normalizeLotProducts = (input: unknown): LotProduct[] => {
  if (!Array.isArray(input)) return [];

  return input
    .map((entry) => {
      if (typeof entry !== 'object' || entry === null) return null;
      const record = entry as Record<string, unknown>;
      const productIdValue = record.product_id ?? record.id ?? record.lot_product_id;
      const codeValue = record.code ?? record.product_code ?? record.type_code;
      const nameValue = record.name ?? record.product ?? record.description;

      if (!productIdValue || !codeValue) return null;

      const product_id = String(productIdValue);
      const code = String(codeValue);
      const name = typeof nameValue === 'string' ? nameValue : undefined;

      if (!product_id || !code) return null;

      return {
        product_id,
        code,
        name,
        subtype_id: record.subtype_id ? String(record.subtype_id) : undefined
      };
    })
    .filter((value): value is LotProduct => Boolean(value));
};

export const isResidentialLandUse = (landUse: string | null | undefined): boolean => {
  return ['LDR', 'MDR', 'HDR', 'MHDR'].includes(String(landUse ?? '').toUpperCase());
};
