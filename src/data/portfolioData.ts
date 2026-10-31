import content from './portfolioContent.json';

export interface PersonalInfo {
  name: string;
  nickname: string;
  badge: string;
  headline: string;
  subheadline: string;
  location: string;
  campus: string;
  email: string;
  whatsapp: string;
  whatsappLink: string;
  linkedin: string;
  heroImage: string;
  heroImageWebp: string;
  aboutImage: string;
  aboutImageWebp: string;
  closingImage: string;
  closingImageWebp: string;
  floatingBadgeValue: string;
  floatingBadgeLabel: string;
}

export interface PartnerItem {
  name: string;
  icon: string;
}

export interface PartnersData {
  title: string;
  items: PartnerItem[];
}

export interface AboutCard {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

export interface AboutData {
  tag: string;
  headline: string;
  text: string;
  formalPhotoTag: string;
  cards: AboutCard[];
}

export interface StatItem {
  value: string;
  label: string;
  desc: string;
  icon: string;
}

export interface QuoteData {
  mark: string;
  headline: string;
  subtext: string;
  author: string;
  role: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  badge: string;
  desc: string;
  icon: string;
  checklist: string[];
}

export interface GalleryItem {
  id: string;
  category: string;
  categoryLabel: string;
  categoryIcon: string;
  title: string;
  desc: string;
  image: string;
  imageWebp: string;
}

export interface ProjectItem {
  title: string;
  tag: string;
  tagIcon: string;
  role: string;
  roleIcon: string;
  desc: string;
  status: string;
  statusIcon: string;
  image: string;
  imageWebp: string;
}

export interface AchievementItem {
  year: string;
  title: string;
  subtitle: string;
  icon: string;
  featured?: boolean;
}

export interface ValueItem {
  title: string;
  desc: string;
  icon: string;
}

export interface ContactData {
  tag: string;
  title: string;
  subtitle: string;
}

export interface FooterData {
  brandName: string;
  tagline: string;
  copyright: string;
}

export const personal: PersonalInfo = content.personal;
export const partners: PartnersData = content.partners;
export const about: AboutData = content.about;
export const stats: StatItem[] = content.stats;
export const quote: QuoteData = content.quote;
export const services: ServiceItem[] = content.services;
export const gallery: GalleryItem[] = content.gallery;
export const projects: ProjectItem[] = content.projects;
export const achievements: AchievementItem[] = content.achievements;
export const values: ValueItem[] = content.values;
export const contact: ContactData = content.contact;
export const footer: FooterData = content.footer;

export const rawPortfolioContent = content;

