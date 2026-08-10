import { AppLanguage } from '@/constants/i18n';

export type PdfDocument = {
  id: string;
  name: string;
  uri: string;
  source: 'device' | 'url';
  size?: number;
  pageCount?: number;
  lastPage: number;
  lastOpenedAt: number;
  createdAt: number;
  isFavorite: boolean;
};

export type ReaderSettings = {
  horizontal: boolean;
  pagingEnabled: boolean;
  invertPdfPages: boolean;
  language: AppLanguage;
};
