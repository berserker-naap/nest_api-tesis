import {
  ANALYTICS_OTHER_CATEGORY,
  analyticsCategoryName,
  isAnalyticsExpense,
} from './analytics-transaction.util';

describe('analytics transaction classification', () => {
  const expense = {
    tipo: 'EGRESO',
    origen: 'MANUAL',
    monto: 50,
    concepto: 'Compra',
    descripcion: 'Compra',
    categoria: { id: 5, nombre: 'Alimentacion' },
  };

  it('includes categorized consumption expenses', () => {
    expect(isAnalyticsExpense(expense)).toBe(true);
  });

  it.each(['APERTURA', 'TRANSFERENCIA', 'PAGO_TARJETA'])(
    'excludes internal origin %s',
    (origen) => {
      expect(isAnalyticsExpense({ ...expense, origen })).toBe(false);
    },
  );

  it.each([
    ['Pago de tarjeta CREDITO', 'Pago enviado a CREDITO'],
    ['Transferencia', 'Transferencia a AHORROS'],
  ])('excludes legacy uncategorized internal movements', (concepto, descripcion) => {
    expect(
      isAnalyticsExpense({
        ...expense,
        categoria: null,
        concepto,
        descripcion,
      }),
    ).toBe(false);
  });

  it('keeps a genuine uncategorized expense as other', () => {
    expect(
      isAnalyticsExpense({
        ...expense,
        categoria: null,
        concepto: 'Compra excepcional',
        descripcion: 'Compra excepcional',
      }),
    ).toBe(true);
    expect(analyticsCategoryName(null)).toBe(ANALYTICS_OTHER_CATEGORY);
  });

  it('excludes income and adjustments', () => {
    expect(isAnalyticsExpense({ ...expense, tipo: 'INGRESO' })).toBe(false);
    expect(isAnalyticsExpense({ ...expense, tipo: 'AJUSTE' })).toBe(false);
  });
});
