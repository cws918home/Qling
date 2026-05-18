import type { ReactNode } from 'react';

export type SharedPrimitiveId =
  | 'appShellMobileFrame'
  | 'bottomNavigation'
  | 'centralWriteWorryAction'
  | 'contentSheet'
  | 'orangeHeaderBand'
  | 'primaryCta'
  | 'secondaryDestructiveCta'
  | 'card'
  | 'categoryChip'
  | 'textArea'
  | 'modalDialog'
  | 'emptyLoadingErrorState'
  | 'profileMotif'
  | 'policyTextContainer'
  | 'settingsRow';

export type BottomNavigationTab = '답변하기' | '나의 고민' | '마이페이지';

export type BottomNavigationItem = {
  readonly tab: BottomNavigationTab;
  readonly label: BottomNavigationTab;
};

export type BottomNavigationCentralAction = {
  readonly label: '고민 작성';
  readonly accessibleLabel: string;
  readonly targetRoute: 'write_worry';
  readonly ownerTab: '나의 고민';
};

export type BottomNavigationProps = {
  readonly tabs: readonly BottomNavigationItem[];
  readonly activeTab: BottomNavigationTab;
  readonly centralAction: BottomNavigationCentralAction;
  readonly onSelectTab: (tab: BottomNavigationTab) => void;
  readonly onCentralAction: () => void;
  readonly presentationMode?: 'default' | 'pixel-aligned';
};

export type MobileAppShellProps = {
  readonly children: ReactNode;
  readonly header?: ReactNode;
  readonly bottomNavigation?: ReactNode;
  readonly hasBottomNavigation?: boolean;
  readonly mainClassName?: string;
  readonly frameMode?: 'default' | 'pixel-aligned';
};

export type CtaVariant = 'primary' | 'secondary' | 'destructive';

export type CtaProps = {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
  readonly processing?: boolean;
  readonly type?: 'button' | 'submit' | 'reset';
  readonly accessibilityLabel?: string;
};

export type CategoryChipProps = {
  readonly label: string;
  readonly selected?: boolean;
  readonly disabled?: boolean;
  readonly onSelect?: () => void;
  readonly className?: string;
};

export type QlingTextAreaProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly maxLength: number;
  readonly label?: string;
  readonly placeholder?: string;
  readonly errorMessage?: string;
  readonly disabled?: boolean;
  readonly processing?: boolean;
};

export type QlingDialogProps = {
  readonly isOpen: boolean;
  readonly title: string;
  readonly description?: string;
  readonly cancelLabel: string;
  readonly confirmLabel: string;
  readonly destructive?: boolean;
  readonly processing?: boolean;
  readonly errorMessage?: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
};

export type StatusStateProps = {
  readonly title: string;
  readonly message?: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
};

export type ProfileMotifProps = {
  readonly label?: string;
};

export type PolicyTextContainerProps =
  | { readonly state: 'empty'; readonly title: string; readonly message: string }
  | { readonly state: 'error'; readonly title: string; readonly message: string; readonly onRetry?: () => void }
  | { readonly state: 'body'; readonly title: string; readonly body: string };

export type SettingsRowProps = {
  readonly label: string;
  readonly description?: string;
  readonly danger?: boolean;
  readonly disabled?: boolean;
  readonly accessibilityLabel?: string;
  readonly onSelect?: () => void;
};

export const SHARED_UI_PRIMITIVE_OWNERSHIP = [
  { id: 'appShellMobileFrame', primitive: 'MobileAppShell' },
  { id: 'bottomNavigation', primitive: 'BottomNavigation' },
  { id: 'centralWriteWorryAction', primitive: 'BottomNavigation' },
  { id: 'contentSheet', primitive: 'ContentSheet' },
  { id: 'orangeHeaderBand', primitive: 'OrangeHeaderBand' },
  { id: 'primaryCta', primitive: 'PrimaryCTA' },
  { id: 'secondaryDestructiveCta', primitive: 'SecondaryCTA / DestructiveCTA' },
  { id: 'card', primitive: 'QlingCard' },
  { id: 'categoryChip', primitive: 'CategoryChip' },
  { id: 'textArea', primitive: 'QlingTextArea' },
  { id: 'modalDialog', primitive: 'QlingDialog' },
  { id: 'emptyLoadingErrorState', primitive: 'EmptyState / LoadingState / ErrorState' },
  { id: 'profileMotif', primitive: 'ProfileMotif' },
  { id: 'policyTextContainer', primitive: 'PolicyTextContainer' },
  { id: 'settingsRow', primitive: 'SettingsRow' },
] as const satisfies readonly {
  readonly id: SharedPrimitiveId;
  readonly primitive: string;
}[];
