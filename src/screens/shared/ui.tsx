import { useId, type ReactNode } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  MessageSquare,
  Radio,
  Send,
  UserRound,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type {
  BottomNavigationProps,
  BottomNavigationTab,
  CategoryChipProps,
  CtaProps,
  MobileAppShellProps,
  PolicyTextContainerProps,
  ProfileMotifProps,
  QlingDialogProps,
  QlingTextAreaProps,
  SettingsRowProps,
  StatusStateProps,
} from './uiContract';

export function MobileAppShell({
  children,
  header,
  bottomNavigation,
  hasBottomNavigation = Boolean(bottomNavigation),
  mainClassName,
  frameMode = 'default',
}: MobileAppShellProps) {
  if (frameMode === 'pixel-aligned') {
    return (
      <div className="min-h-dvh overflow-x-hidden bg-[var(--qling-color-cream)] text-[var(--qling-color-text)] font-sans selection:bg-[var(--qling-color-cream-soft)]">
        {header}
        <main className={cn('relative mx-auto min-h-[852px] w-[393px] p-0', mainClassName)}>
          {children}
          {bottomNavigation}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[var(--qling-color-cream)] text-[var(--qling-color-text)] font-sans selection:bg-[var(--qling-color-cream-soft)]">
      {header}
      <main
        className={cn(
          'mx-auto w-full max-w-2xl px-[var(--qling-space-shell-x)]',
          hasBottomNavigation ? 'pb-[var(--qling-space-scroll-bottom)]' : 'pb-12',
          mainClassName,
        )}
      >
        {children}
      </main>
      {bottomNavigation}
    </div>
  );
}

export function BottomNavigation({
  tabs,
  activeTab,
  centralAction,
  onSelectTab,
  onCentralAction,
  variant = 'default',
}: BottomNavigationProps) {
  const iconByTab: Record<BottomNavigationTab, ReactNode> = {
    답변하기: <MessageSquare className="h-5 w-5" aria-hidden="true" />,
    '나의 고민': <FileText className="h-5 w-5" aria-hidden="true" />,
    마이페이지: <UserRound className="h-5 w-5" aria-hidden="true" />,
  };

  if (variant === 'pixel-aligned') {
    const sideTabs = tabs.filter(({ tab }) => tab !== centralAction.ownerTab);
    const ownerTab = tabs.find(({ tab }) => tab === centralAction.ownerTab);

    return (
      <nav
        aria-label="주요 화면"
        className="absolute left-0 bottom-0 z-50 h-[112px] w-[393px] overflow-hidden bg-transparent"
      >
        <div className="absolute left-0 top-[47px] h-[65px] w-[393px] bg-[#fff5eb]" aria-hidden="true" />
        {ownerTab && (
          <button
            type="button"
            aria-label={ownerTab.label}
            aria-current={activeTab === ownerTab.tab ? 'page' : undefined}
            onClick={() => onSelectTab(ownerTab.tab)}
            className={cn(
              'absolute left-[135px] top-[15px] h-[80px] w-[125px] rounded-[37px] bg-[#fff5eb] focus:outline-none focus:ring-2 focus:ring-[#ff8b3d] focus:ring-offset-0',
              activeTab === ownerTab.tab && 'ring-0',
            )}
          >
            <span className="sr-only">{ownerTab.label}</span>
          </button>
        )}
        <button
          type="button"
          aria-label={centralAction.accessibleLabel}
          data-target-route={centralAction.targetRoute}
          data-owner-tab={centralAction.ownerTab}
          onClick={onCentralAction}
          className="absolute left-[149px] top-[24px] flex h-[59px] w-[95px] items-center justify-center rounded-[29px] bg-[#ff8b3d] focus:outline-none focus:ring-2 focus:ring-[#2a2a2a] focus:ring-offset-0"
        >
          <span className="relative h-[26px] w-[48px]" aria-hidden="true">
            <span className="absolute left-[5px] top-0 h-[26px] w-[18px] rounded-full bg-[#fff5eb]" />
            <span className="absolute left-[25px] top-0 h-[26px] w-[18px] rounded-full bg-[#fff5eb]" />
            <span className="absolute left-[14px] top-[9px] h-[8px] w-[4px] rounded-full bg-[#1a1a1a]" />
            <span className="absolute left-[30px] top-[9px] h-[8px] w-[4px] rounded-full bg-[#1a1a1a]" />
          </span>
        </button>
        {sideTabs.map(({ tab, label }, index) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectTab(tab)}
              className={cn(
                'absolute top-[52px] flex h-[36px] w-[116px] items-center justify-center rounded-[7px] focus:outline-none focus:ring-2 focus:ring-[#ff8b3d] focus:ring-offset-0',
                index === 0 ? 'left-[16px]' : 'left-[262px]',
                isActive ? 'bg-[#fae5d7] text-[#ff8b3d]' : 'bg-[#dadce0] text-[#b8b8b8]',
              )}
            >
              {index === 0 ? (
                <span className="relative h-[17px] w-[19px]" aria-hidden="true">
                  <span className="absolute left-0 top-[2px] h-[13px] w-[13px] rounded-full border-[2px] border-current" />
                  <span className="absolute left-[12px] top-[7px] h-[2px] w-[7px] rounded-full bg-current" />
                </span>
              ) : (
                <span className="relative h-[17px] w-[17px]" aria-hidden="true">
                  <span className="absolute left-[2px] top-[1px] h-[15px] w-[13px] rounded-[3px] border-[2px] border-current" />
                  <span className="absolute left-[5px] top-[5px] h-[2px] w-[7px] rounded-full bg-current" />
                  <span className="absolute left-[5px] top-[10px] h-[2px] w-[7px] rounded-full bg-current" />
                </span>
              )}
              <span className="sr-only">{label}</span>
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      aria-label="주요 화면"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--qling-color-border)] bg-[rgb(255_255_255/0.96)] shadow-[var(--qling-shadow-nav)] backdrop-blur-md"
      style={{ paddingBottom: 'var(--qling-space-safe-bottom)' }}
    >
      <button
        type="button"
        aria-label={centralAction.accessibleLabel}
        data-target-route={centralAction.targetRoute}
        data-owner-tab={centralAction.ownerTab}
        onClick={onCentralAction}
        className="absolute left-1/2 top-0 flex h-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 rounded-[var(--qling-radius-pill)] bg-[var(--qling-color-primary-orange)] px-4 text-xs font-bold text-[var(--qling-color-text)] shadow-[var(--qling-shadow-card)] transition-transform hover:-translate-y-[55%] focus:outline-none focus:ring-2 focus:ring-[var(--qling-color-primary-orange)] focus:ring-offset-2"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        {centralAction.label}
      </button>
      <div className="mx-auto grid h-[var(--qling-space-nav-height)] max-w-2xl grid-cols-3 gap-1 px-2 pt-3">
        {tabs.map(({ tab, label }) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectTab(tab)}
              className={cn(
                'flex min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--qling-radius-bottom-nav)] text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--qling-color-primary-orange)] focus:ring-offset-2',
                isActive
                  ? 'bg-[var(--qling-color-cream-soft)] text-[var(--qling-color-text)]'
                  : 'text-[var(--qling-color-muted)] hover:bg-[var(--qling-color-cream)]',
              )}
            >
              {iconByTab[tab]}
              <span className="max-w-full truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function ContentSheet({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <section className={cn('rounded-[var(--qling-radius-content-sheet)] bg-[var(--qling-color-surface)] p-[var(--qling-space-card-padding)] shadow-[var(--qling-shadow-sheet)]', className)}>
      {children}
    </section>
  );
}

export function OrangeHeaderBand({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <section className={cn('rounded-b-[var(--qling-radius-content-sheet)] bg-[var(--qling-color-primary-orange)] px-[var(--qling-space-shell-x)] py-6 text-[var(--qling-color-text)]', className)}>
      {children}
    </section>
  );
}

function CTA({ children, onClick, disabled, processing, type = 'button', accessibilityLabel, variant }: CtaProps & { readonly variant: 'primary' | 'secondary' | 'destructive' }) {
  return (
    <button
      type={type}
      aria-label={accessibilityLabel}
      aria-busy={processing || undefined}
      disabled={disabled || processing}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--qling-radius-cta)] px-5 py-3 text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55',
        variant === 'primary' && 'bg-[var(--qling-color-primary-orange)] text-[var(--qling-color-text)] focus:ring-[var(--qling-color-primary-orange)]',
        variant === 'secondary' && 'border border-[var(--qling-color-border)] bg-[var(--qling-color-surface)] text-[var(--qling-color-text)] focus:ring-[var(--qling-color-secondary-orange)]',
        variant === 'destructive' && 'bg-[var(--qling-color-danger)] text-white focus:ring-[var(--qling-color-danger)]',
      )}
    >
      {processing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function PrimaryCTA(props: CtaProps) {
  return <CTA {...props} variant="primary" />;
}

export function SecondaryCTA(props: CtaProps) {
  return <CTA {...props} variant="secondary" />;
}

export function DestructiveCTA(props: CtaProps) {
  return <CTA {...props} variant="destructive" />;
}

export function QlingCard({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <article className={cn('rounded-[var(--qling-radius-card)] border border-[var(--qling-color-border)] bg-[var(--qling-color-surface)] p-[var(--qling-space-card-padding)] shadow-[var(--qling-shadow-card)]', className)}>
      {children}
    </article>
  );
}

export function CategoryChip({ label, selected, disabled, onSelect, className }: CategoryChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'min-w-0 rounded-[var(--qling-radius-pill)] border px-3 py-1.5 text-sm font-semibold leading-5 transition-colors disabled:cursor-not-allowed disabled:opacity-55',
        selected
          ? 'border-[var(--qling-color-primary-orange)] bg-[var(--qling-color-cream-soft)] text-[var(--qling-color-text)]'
          : 'border-[var(--qling-color-border)] bg-[var(--qling-color-surface)] text-[var(--qling-color-muted)]',
        className,
      )}
    >
      {label}
    </button>
  );
}

export function QlingTextArea({
  value,
  onChange,
  maxLength,
  label,
  placeholder,
  errorMessage,
  disabled,
  processing,
}: QlingTextAreaProps) {
  const count = value.length;
  const invalid = Boolean(errorMessage) || count > maxLength;

  return (
    <label className="block space-y-2">
      {label && <span className="text-sm font-bold text-[var(--qling-color-text)]">{label}</span>}
      <textarea
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled || processing}
        aria-invalid={invalid || undefined}
        onChange={event => onChange(event.currentTarget.value)}
        className={cn(
          'box-border min-h-36 w-full resize-y rounded-[var(--qling-radius-input)] border bg-[var(--qling-color-surface)] p-4 text-base leading-7 text-[var(--qling-color-text)] outline-none transition-colors placeholder:text-[var(--qling-color-muted)] disabled:cursor-not-allowed disabled:opacity-60',
          invalid ? 'border-[var(--qling-color-danger)]' : 'border-[var(--qling-color-border)] focus:border-[var(--qling-color-primary-orange)]',
        )}
      />
      <div className="flex items-start justify-between gap-3 text-xs">
        <span className={invalid ? 'text-[var(--qling-color-danger)]' : 'text-[var(--qling-color-muted)]'}>{errorMessage}</span>
        <span className={count > maxLength ? 'text-[var(--qling-color-danger)]' : 'text-[var(--qling-color-muted)]'}>
          {count}/{maxLength}
        </span>
      </div>
    </label>
  );
}

export function QlingDialog({
  isOpen,
  title,
  description,
  cancelLabel,
  confirmLabel,
  destructive,
  processing,
  errorMessage,
  onCancel,
  onConfirm,
}: QlingDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const describedBy = [
    description ? descriptionId : undefined,
    errorMessage ? errorId : undefined,
  ].filter(Boolean).join(' ') || undefined;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        aria-busy={processing || undefined}
        className="w-full max-w-sm rounded-[var(--qling-radius-modal)] bg-[var(--qling-color-surface)] p-6 shadow-[var(--qling-shadow-modal)]"
      >
        <h2 id={titleId} className="text-lg font-bold text-[var(--qling-color-text)]">{title}</h2>
        {description && <p id={descriptionId} className="mt-2 text-sm leading-6 text-[var(--qling-color-muted)]">{description}</p>}
        {errorMessage && <p id={errorId} className="mt-3 text-sm font-semibold text-[var(--qling-color-danger)]">{errorMessage}</p>}
        <div className="mt-6 flex gap-[var(--qling-space-cta-gap)]">
          <SecondaryCTA onClick={onCancel} disabled={processing}>{cancelLabel}</SecondaryCTA>
          {destructive ? (
            <DestructiveCTA onClick={onConfirm} processing={processing}>{confirmLabel}</DestructiveCTA>
          ) : (
            <PrimaryCTA onClick={onConfirm} processing={processing}>{confirmLabel}</PrimaryCTA>
          )}
        </div>
      </section>
    </div>
  );
}

export function EmptyState(props: StatusStateProps) {
  return <StatusState icon={<Radio className="h-6 w-6" aria-hidden="true" />} {...props} />;
}

export function LoadingState({ title, message }: StatusStateProps) {
  return <StatusState icon={<Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />} title={title} message={message} />;
}

export function ErrorState(props: StatusStateProps) {
  return <StatusState icon={<AlertCircle className="h-6 w-6" aria-hidden="true" />} danger {...props} />;
}

function StatusState({ icon, title, message, actionLabel, onAction, danger }: StatusStateProps & { readonly icon: ReactNode; readonly danger?: boolean }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-[var(--qling-radius-card)] border border-[var(--qling-color-border)] bg-[var(--qling-color-surface)] p-6 text-center">
      <div className={cn('mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--qling-color-cream-soft)]', danger ? 'text-[var(--qling-color-danger)]' : 'text-[var(--qling-color-primary-orange)]')}>
        {icon}
      </div>
      <h2 className="text-lg font-bold text-[var(--qling-color-text)]">{title}</h2>
      {message && <p className="mt-2 text-sm leading-6 text-[var(--qling-color-muted)]">{message}</p>}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="mt-5 rounded-[var(--qling-radius-small-button)] bg-[var(--qling-color-text)] px-4 py-2 text-sm font-bold text-white">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ProfileMotif({ label = '프로필 모티프' }: ProfileMotifProps) {
  return (
    <div aria-label={label} role="img" className="relative h-20 w-20 rounded-full bg-[var(--qling-color-cream-soft)] shadow-[var(--qling-shadow-card)]">
      <div className="absolute left-1/2 top-1/2 h-9 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--qling-color-surface)]" />
      <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--qling-color-primary-orange)]" />
      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--qling-color-text)]" />
    </div>
  );
}

export function PolicyTextContainer(props: PolicyTextContainerProps) {
  if (props.state === 'body') {
    return (
      <ContentSheet className="space-y-4">
        <h1 className="text-xl font-bold">{props.title}</h1>
        <div className="whitespace-pre-wrap text-sm leading-7 text-[var(--qling-color-muted)]">{props.body}</div>
      </ContentSheet>
    );
  }

  if (props.state === 'error') {
    return <ErrorState title={props.title} message={props.message} actionLabel={props.onRetry ? '다시 시도' : undefined} onAction={props.onRetry} />;
  }

  return <EmptyState title={props.title} message={props.message} />;
}

export function SettingsRow({ label, description, danger, disabled, accessibilityLabel, onSelect }: SettingsRowProps) {
  return (
    <button
      type="button"
      aria-label={accessibilityLabel}
      disabled={disabled}
      onClick={onSelect}
      className="flex w-full items-center justify-between gap-4 border-b border-[var(--qling-color-border)] py-4 text-left disabled:cursor-not-allowed disabled:opacity-55"
    >
      <span className="min-w-0">
        <span className={cn('block text-sm font-bold', danger ? 'text-[var(--qling-color-danger)]' : 'text-[var(--qling-color-text)]')}>{label}</span>
        {description && <span className="mt-1 block text-xs leading-5 text-[var(--qling-color-muted)]">{description}</span>}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--qling-color-muted)]" aria-hidden="true" />
    </button>
  );
}

export function SuccessBadge({ label }: { readonly label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-[var(--qling-radius-pill)] bg-[rgb(79_159_104/0.12)] px-3 py-1 text-xs font-bold text-[var(--qling-color-success)]">
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
