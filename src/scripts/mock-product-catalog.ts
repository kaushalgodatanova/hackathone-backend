/**
 * Demo catalog template: same SKUs per distributor (unique per distributor in DB).
 * Used by seed-mock-products.ts — edit here to change structure for all distributors.
 */
export type MockProductRow = {
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  weightKg: string;
  quantityOnHand: number;
};

/** Prefix all demo SKUs with DEMO- so the seed can DELETE ... WHERE sku LIKE 'DEMO-%' safely. */
export const MOCK_PRODUCT_CATALOG: MockProductRow[] = [
  // Dairy
  {
    name: 'Whole Milk 1L',
    sku: 'DEMO-WM-001',
    category: 'Dairy',
    unitPrice: '3.49',
    weightKg: '1.050',
    quantityOnHand: 200,
  },
  {
    name: 'Greek Yogurt 500g',
    sku: 'DEMO-DA-002',
    category: 'Dairy',
    unitPrice: '4.99',
    weightKg: '0.500',
    quantityOnHand: 120,
  },
  {
    name: 'Salted Butter 250g',
    sku: 'DEMO-DA-003',
    category: 'Dairy',
    unitPrice: '5.25',
    weightKg: '0.250',
    quantityOnHand: 80,
  },
  {
    name: 'Cheddar Cheese Block 400g',
    sku: 'DEMO-DA-004',
    category: 'Dairy',
    unitPrice: '6.75',
    weightKg: '0.400',
    quantityOnHand: 90,
  },
  // Beverages
  {
    name: 'Bottled Water 24-pack',
    sku: 'DEMO-BV-001',
    category: 'Beverages',
    unitPrice: '8.99',
    weightKg: '9.600',
    quantityOnHand: 150,
  },
  {
    name: 'Orange Juice 1L',
    sku: 'DEMO-BV-002',
    category: 'Beverages',
    unitPrice: '3.29',
    weightKg: '1.080',
    quantityOnHand: 100,
  },
  {
    name: 'Cola 12-pack',
    sku: 'DEMO-BV-003',
    category: 'Beverages',
    unitPrice: '7.49',
    weightKg: '4.320',
    quantityOnHand: 75,
  },
  // Produce
  {
    name: 'Organic Apples 1kg',
    sku: 'DEMO-PR-001',
    category: 'Produce',
    unitPrice: '4.99',
    weightKg: '1.000',
    quantityOnHand: 60,
  },
  {
    name: 'Bananas Bunch',
    sku: 'DEMO-PR-002',
    category: 'Produce',
    unitPrice: '2.49',
    weightKg: '1.200',
    quantityOnHand: 110,
  },
  {
    name: 'Baby Spinach 200g',
    sku: 'DEMO-PR-003',
    category: 'Produce',
    unitPrice: '3.99',
    weightKg: '0.200',
    quantityOnHand: 45,
  },
  // Pantry
  {
    name: 'Canned Black Beans 400g',
    sku: 'DEMO-PN-001',
    category: 'Pantry',
    unitPrice: '1.89',
    weightKg: '0.450',
    quantityOnHand: 300,
  },
  {
    name: 'Long Grain Rice 2kg',
    sku: 'DEMO-PN-002',
    category: 'Pantry',
    unitPrice: '5.99',
    weightKg: '2.000',
    quantityOnHand: 140,
  },
  {
    name: 'Olive Oil 750ml',
    sku: 'DEMO-PN-003',
    category: 'Pantry',
    unitPrice: '9.99',
    weightKg: '0.780',
    quantityOnHand: 85,
  },
  // Bakery
  {
    name: 'Sourdough Loaf',
    sku: 'DEMO-BK-001',
    category: 'Bakery',
    unitPrice: '4.50',
    weightKg: '0.650',
    quantityOnHand: 40,
  },
  {
    name: 'Whole Wheat Tortillas 8ct',
    sku: 'DEMO-BK-002',
    category: 'Bakery',
    unitPrice: '3.25',
    weightKg: '0.400',
    quantityOnHand: 95,
  },
  // Frozen
  {
    name: 'Frozen Mixed Vegetables 1kg',
    sku: 'DEMO-FZ-001',
    category: 'Frozen',
    unitPrice: '4.25',
    weightKg: '1.000',
    quantityOnHand: 70,
  },
  {
    name: 'Vanilla Ice Cream 1L',
    sku: 'DEMO-FZ-002',
    category: 'Frozen',
    unitPrice: '6.99',
    weightKg: '0.550',
    quantityOnHand: 55,
  },
  // Snacks
  {
    name: 'Mixed Nuts 400g',
    sku: 'DEMO-SN-001',
    category: 'Snacks',
    unitPrice: '8.49',
    weightKg: '0.400',
    quantityOnHand: 65,
  },
  {
    name: 'Granola Bars 6-pack',
    sku: 'DEMO-SN-002',
    category: 'Snacks',
    unitPrice: '4.99',
    weightKg: '0.210',
    quantityOnHand: 130,
  },
];
