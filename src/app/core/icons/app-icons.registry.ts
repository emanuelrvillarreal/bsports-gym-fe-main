import {
  heroAcademicCap,
  heroArrowLeftStartOnRectangle,
  heroArrowPath,
  heroArrowsRightLeft,
  heroArrowRightOnRectangle,
  heroArrowUp,
  heroBanknotes,
  heroBolt,
  heroBuildingLibrary,
  heroBuildingOffice2,
  heroCalendar,
  heroCalendarDays,
  heroCalendarDateRange,
  heroCamera,
  heroCheck,
  heroCheckCircle,
  heroChevronDoubleLeft,
  heroChevronDoubleRight,
  heroChevronDown,
  heroChevronLeft,
  heroChevronRight,
  heroChevronUp,
  heroClipboardDocumentList,
  heroClock,
  heroDocumentText,
  heroCog6Tooth,
  heroWrenchScrewdriver,
  heroCurrencyDollar,
  heroExclamationCircle,
  heroExclamationTriangle,
  heroEye,
  heroEyeSlash,
  heroHome,
  heroHeart,
  heroIdentification,
  heroHomeModern,
  heroInformationCircle,
  heroKey,
  heroMapPin,
  heroMegaphone,
  heroMoon,
  heroPencilSquare,
  heroPlus,
  heroPlusCircle,
  heroQuestionMarkCircle,
  heroQrCode,
  heroRectangleGroup,
  heroReceiptPercent,
  heroSparkles,
  heroSun,
  heroSwatch,
  heroTicket,
  heroTrash,
  heroTrophy,
  heroUser,
  heroUserCircle,
  heroUserGroup,
  heroUserMinus,
  heroUserPlus,
  heroUsers,
  heroXMark,
  heroEllipsisVertical,
} from '@ng-icons/heroicons/outline';
import { provideIcons } from '@ng-icons/core';

/** Sidebar layout-left / layout-right, mismo trazo que Heroicons outline. */
const layoutLeft =
  '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" data-slot="icon" style="stroke-width:var(--ng-icon__stroke-width, 1.5)"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 5.25A1.5 1.5 0 0 1 5.25 3.75h13.5a1.5 1.5 0 0 1 1.5 1.5v13.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V5.25Z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M9 3.75v16.5"></path></svg>';
const layoutRight =
  '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" data-slot="icon" style="stroke-width:var(--ng-icon__stroke-width, 1.5)"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 5.25A1.5 1.5 0 0 1 5.25 3.75h13.5a1.5 1.5 0 0 1 1.5 1.5v13.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V5.25Z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 3.75v16.5"></path></svg>';

/** Rutas públicas: login, registro, recupero de contraseña. */
export const GUEST_ROUTE_ICONS = {
  heroArrowPath,
  heroBuildingLibrary,
  heroCalendarDays,
  heroCamera,
  heroExclamationTriangle,
  heroEye,
  heroEyeSlash,
  heroMoon,
  heroSun,
  heroXMark,
} as const;

/** Shell autenticado: nav-bar + header. */
export const LAYOUT_ICONS = {
  heroAcademicCap,
  heroArrowLeftStartOnRectangle,
  heroArrowPath,
  heroBanknotes,
  heroCalendarDateRange,
  heroBuildingOffice2,
  heroCalendar,
  heroCalendarDays,
  heroCamera,
  heroClipboardDocumentList,
  heroChevronDoubleLeft,
  heroChevronDoubleRight,
  heroCog6Tooth,
  heroWrenchScrewdriver,
  heroCurrencyDollar,
  heroHome,
  heroHomeModern,
  heroHeart,
  heroIdentification,
  heroMoon,
  heroPlusCircle,
  heroQuestionMarkCircle,
  heroQrCode,
  heroRectangleGroup,
  heroReceiptPercent,
  heroSun,
  heroTicket,
  heroTrophy,
  heroUserCircle,
  heroUserGroup,
  heroUsers,
  heroXMark,
  layoutLeft,
  layoutRight,
} as const;

/** Toast alert (layout host + uso puntual en auth). */
export const TOAST_ICONS = {
  heroCheckCircle,
  heroExclamationTriangle,
  heroInformationCircle,
  heroXMark,
} as const;

export const CARD_ICONS = {
  heroArrowRightOnRectangle,
  heroBanknotes,
  heroCalendarDays,
  heroChevronDown,
  heroChevronUp,
  heroCog6Tooth,
  heroWrenchScrewdriver,
  heroKey,
  heroSparkles,
  heroUsers,
} as const;

export const CARDS_CATALOG_ICONS = {
  heroBolt,
  heroCalendarDays,
  heroClock,
  heroMapPin,
  heroUser,
} as const;

export const CARDS_HERO_ICONS = {
  heroBanknotes,
  heroCalendarDays,
  heroExclamationCircle,
  heroUsers,
} as const;

export const TITULO_HERO_ICONS = {
  heroAcademicCap,
  heroArrowPath,
  heroBanknotes,
  heroBolt,
  heroCalendar,
  heroCalendarDateRange,
  heroCalendarDays,
  heroClipboardDocumentList,
  heroCog6Tooth,
  heroWrenchScrewdriver,
  heroCurrencyDollar,
  heroExclamationTriangle,
  heroHome,
  heroHomeModern,
  heroHeart,
  heroIdentification,
  heroKey,
  heroMegaphone,
  heroPlusCircle,
  heroBuildingOffice2,
  heroQuestionMarkCircle,
  heroRectangleGroup,
  heroReceiptPercent,
  heroTicket,
  heroTrash,
  heroTrophy,
  heroUserCircle,
  heroUserGroup,
  heroUsers,
} as const;

export const TABLA_RESPONSIVE_ICONS = {
  heroArrowLeftStartOnRectangle,
  heroArrowPath,
  heroArrowRightOnRectangle,
  heroArrowUp,
  heroArrowsRightLeft,
  heroBanknotes,
  heroCalendarDays,
  heroCheck,
  heroCheckCircle,
  heroClipboardDocumentList,
  heroChevronLeft,
  heroChevronRight,
  heroClock,
  heroCog6Tooth,
  heroWrenchScrewdriver,
  heroDocumentText,
  heroEllipsisVertical,
  heroEye,
  heroPencilSquare,
  heroPlus,
  heroQrCode,
  heroTrash,
  heroUserMinus,
  heroUserPlus,
  heroXMark,
} as const;

export const CALENDARIO_ICONS = {
  heroCalendarDays,
  heroChevronLeft,
  heroChevronRight,
  heroClock,
  heroXMark,
} as const;

export const CARRUSEL_ICONS = {
  heroChevronLeft,
  heroChevronRight,
} as const;

export const COLOR_MOD_ICONS = {
  heroArrowPath,
  heroSparkles,
  heroSwatch,
} as const;

export const GRAFICO_BARRAS_ICONS = {
  heroBolt,
} as const;

export function provideGuestRouteIcons() {
  return provideIcons(GUEST_ROUTE_ICONS);
}

export function provideLayoutIcons() {
  return provideIcons(LAYOUT_ICONS);
}

export function provideToastIcons() {
  return provideIcons(TOAST_ICONS);
}

export function provideCardIcons() {
  return provideIcons(CARD_ICONS);
}

export function provideCardsCatalogIcons() {
  return provideIcons(CARDS_CATALOG_ICONS);
}

export function provideCardsHeroIcons() {
  return provideIcons(CARDS_HERO_ICONS);
}

export function provideTituloHeroIcons() {
  return provideIcons(TITULO_HERO_ICONS);
}

export function provideTablaResponsiveIcons() {
  return provideIcons(TABLA_RESPONSIVE_ICONS);
}

export function provideCalendarioIcons() {
  return provideIcons(CALENDARIO_ICONS);
}

export function provideCarruselIcons() {
  return provideIcons(CARRUSEL_ICONS);
}

export function provideColorModIcons() {
  return provideIcons(COLOR_MOD_ICONS);
}

export function provideGraficoBarrasIcons() {
  return provideIcons(GRAFICO_BARRAS_ICONS);
}
