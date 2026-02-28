import { EventBudget } from '@/types';

type CateringCalcInput = {
  quantity: number;
  unitPrice: number;
  vatRate: number;
};

export function toNumber(value: unknown): number {
  const numeric = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(numeric) ? numeric : 0;
}

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function calcCateringLine(input: CateringCalcInput) {
  const quantity = toNumber(input.quantity);
  const unitPrice = toNumber(input.unitPrice);
  const vatRate = toNumber(input.vatRate);
  const subtotalExcl = quantity * unitPrice;
  const vatAmount = subtotalExcl * (vatRate / 100);
  const totalIncl = subtotalExcl + vatAmount;
  return { subtotalExcl, vatAmount, totalIncl };
}

export function sumSimpleCostRows(rows: Array<{ amount?: number }>) {
  return (rows || []).reduce((total, row) => total + toNumber(row.amount), 0);
}

export function sumSpeakerRows(rows: Array<{ honorarium?: number; travel_cost?: number }>) {
  return (rows || []).reduce((total, row) => total + toNumber(row.honorarium) + toNumber(row.travel_cost), 0);
}

export function computeBudgetSummary(args: {
  budget: EventBudget;
  participantCount: number;
  cateringTotalIncl: number;
}) {
  const locationCost = toNumber(args.budget.location_cost);
  const speakerCost = sumSpeakerRows(args.budget.speaker_costs || []);
  const materialCost = sumSimpleCostRows(args.budget.material_costs || []);
  const marketingCost = sumSimpleCostRows(args.budget.marketing_costs || []);
  const otherCost = sumSimpleCostRows(args.budget.other_costs || []);
  const totalCosts = locationCost + toNumber(args.cateringTotalIncl) + speakerCost + materialCost + marketingCost + otherCost;

  const ticketPrice = toNumber(args.budget.ticket_price);
  const defaultIncome = ticketPrice * Math.max(args.participantCount, 0);
  const totalIncome = args.budget.income_override !== null && args.budget.income_override !== undefined
    ? toNumber(args.budget.income_override)
    : defaultIncome;
  const net = totalIncome - totalCosts;
  const marginPct = totalIncome > 0 ? (net / totalIncome) * 100 : 0;
  const breakEvenParticipants = ticketPrice > 0 ? totalCosts / ticketPrice : null;
  const costPerParticipant = args.participantCount > 0 ? totalCosts / args.participantCount : 0;

  return {
    locationCost,
    speakerCost,
    materialCost,
    marketingCost,
    otherCost,
    totalCosts,
    totalIncome,
    net,
    marginPct,
    breakEvenParticipants,
    costPerParticipant,
  };
}

export function periodStartDate(period: 'month' | 'quarter' | 'year' | 'all') {
  const now = new Date();
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'quarter') return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  if (period === 'year') return new Date(now.getFullYear(), 0, 1);
  return null;
}

