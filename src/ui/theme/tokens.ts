export interface IrisTokens {
  colorNeutralBackground: string;
  colorNeutralForeground: string;
  colorBrandBackground: string;
  colorNeutralStroke: string;
  colorStatusSuccess: string;
  colorStatusWarning: string;
  colorStatusError: string;
  spacingS: string;
  spacingM: string;
  spacingL: string;
  borderRadiusMedium: string;
  fontSizeBase: string;
}

export const lightTokens: IrisTokens = {
  colorNeutralBackground: '#faf9f8',
  colorNeutralForeground: '#242424',
  colorBrandBackground: '#0f6cbd',
  colorNeutralStroke: '#d1d1d1',
  colorStatusSuccess: '#0e700e',
  colorStatusWarning: '#bc4b00',
  colorStatusError: '#b10e1c',
  spacingS: '4px',
  spacingM: '8px',
  spacingL: '16px',
  borderRadiusMedium: '6px',
  fontSizeBase: '13px'
};

export const darkTokens: IrisTokens = {
  ...lightTokens,
  colorNeutralBackground: '#1f1f1f',
  colorNeutralForeground: '#f3f3f3',
  colorBrandBackground: '#479ef5',
  colorNeutralStroke: '#3d3d3d',
  colorStatusSuccess: '#54b054',
  colorStatusWarning: '#f8b858',
  colorStatusError: '#ff8c8c'
};

export type ThemeMode = 'light' | 'dark' | 'system';

export function resolveTokens(mode: ThemeMode, systemPrefersDark = false): IrisTokens {
  return mode === 'system' && systemPrefersDark ? darkTokens : mode === 'dark' ? darkTokens : lightTokens;
}
