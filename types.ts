
export interface FoodItem {
  id: string;
  name: string;
  color: string;
}

export enum GameState {
  IDLE = 'IDLE',
  SPINNING = 'SPINNING',
  FINISHED = 'FINISHED'
}

export type MealType = '早餐' | '午餐' | '晚餐';

export interface DailyHistory {
  date: string; // YYYY-MM-DD
  breakfast?: string;
  lunch?: string;
  dinner?: string;
}

export type HistoryMap = Record<string, DailyHistory>;
