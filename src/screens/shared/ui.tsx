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
    const leftTab = sideTabs[0];
    const rightTab = sideTabs[1];
    const isLeftActive = leftTab ? activeTab === leftTab.tab : false;
    const isRightActive = rightTab ? activeTab === rightTab.tab : false;

    return (
      <nav
        aria-label="주요 화면"
        className="absolute left-0 bottom-[-7px] z-50 h-[104px] w-[393px] overflow-visible bg-transparent"
      >
        <svg
          aria-hidden="true"
          className="absolute left-0 top-0 h-[104px] w-[417px]"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 417 104"
        >
          <rect fill="#FFF5EB" height="88" rx="37" width="114" x="140" />
          <path d="M0 32H417V104H0V32Z" fill="#FFF5EB" />
          <rect fill="#FF8B3D" height="59" rx="29" width="95" x="149" y="9" />
          <ReferenceMenuEyeIcon />
          <rect fill={isLeftActive ? '#FAE5D7' : '#DADCE0'} height="36" rx="7" width="116" x="16" y="37" />
          <rect fill={isRightActive ? '#FAE5D7' : '#DADCE0'} height="36" rx="7" width="116" x="262" y="37" />
          <ReferenceMenuHomeIcon fill={isLeftActive ? '#FF8B3D' : '#B8B8B8'} />
          <ReferenceMenuSendIcon fill={isRightActive ? '#FF8B3D' : '#B8B8B8'} />
        </svg>
        {ownerTab && (
          <button
            type="button"
            aria-label={ownerTab.label}
            aria-current={activeTab === ownerTab.tab ? 'page' : undefined}
            onClick={() => onSelectTab(ownerTab.tab)}
            className={cn(
              'absolute left-[140px] top-0 z-10 h-[88px] w-[114px] rounded-[37px] bg-transparent focus:outline-none focus:ring-2 focus:ring-[#ff8b3d] focus:ring-offset-0',
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
          className="absolute left-[149px] top-[9px] z-20 h-[59px] w-[95px] rounded-[29px] bg-transparent focus:outline-none focus:ring-2 focus:ring-[#2a2a2a] focus:ring-offset-0"
        >
          <span className="sr-only">{centralAction.label}</span>
        </button>
        {leftTab && (
          <button
            type="button"
            aria-label={leftTab.label}
            aria-current={isLeftActive ? 'page' : undefined}
            onClick={() => onSelectTab(leftTab.tab)}
            className="absolute left-[16px] top-[37px] z-20 h-[36px] w-[116px] rounded-[7px] bg-transparent focus:outline-none focus:ring-2 focus:ring-[#ff8b3d] focus:ring-offset-0"
          >
            <span className="sr-only">{leftTab.label}</span>
          </button>
        )}
        {rightTab && (
          <button
            type="button"
            aria-label={rightTab.label}
            aria-current={isRightActive ? 'page' : undefined}
            onClick={() => onSelectTab(rightTab.tab)}
            className="absolute left-[262px] top-[37px] z-20 h-[36px] w-[116px] rounded-[7px] bg-transparent focus:outline-none focus:ring-2 focus:ring-[#ff8b3d] focus:ring-offset-0"
          >
            <span className="sr-only">{rightTab.label}</span>
          </button>
        )}
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

const referenceMenuPaths = {
  p110abb00: 'M191.567 37.254C191.567 42.3804 188.747 46.5363 185.269 46.5363C181.79 46.5363 178.971 44.1811 178.971 37.254C178.971 32.1275 181.79 27.9717 185.269 27.9717C188.747 27.9717 191.567 32.1275 191.567 37.254Z',
  p15619480: 'M171.445 25C173.661 25.0001 175.364 25.423 176.591 26.8975C177.873 28.4385 178.814 31.33 178.874 36.7569C178.933 42.1729 177.989 45.0535 176.688 46.5869C175.432 48.0665 173.665 48.4912 171.445 48.4912C169.283 48.4912 167.443 47.9447 166.141 46.3701C164.804 44.7543 163.865 41.8616 164.016 36.7754C164.167 31.6584 165.1 28.7376 166.386 27.1026C167.616 25.5384 169.297 25 171.445 25Z',
  p23c07380: 'M198.85 36.7299C198.97 47.6896 195.081 49.4598 190.433 49.4598C185.785 49.4598 181.71 47.087 182.016 36.7299C182.322 26.3727 185.785 24 190.433 24C195.081 24 198.729 25.7701 198.85 36.7299Z',
  p29c4a2f0: 'M74.3486 43.1456C74.2556 43.0522 74.1318 43 74.0031 43C73.8744 43 73.7507 43.0522 73.6576 43.1456L62.1562 54.6875C62.1073 54.7366 62.0685 54.7956 62.042 54.8609C62.0154 54.9262 61.9999 55.0696 62 55.1406V65.8999C62 66.4569 62.2106 66.9911 62.5855 67.3849C62.9605 67.7787 63.469 68 63.9992 68H70.0029C70.268 68 70.5223 67.8894 70.7097 67.6925C70.8972 67.4955 71.0025 67.2285 71.0025 66.95V58.0247C71.0025 57.8854 71.0552 57.7519 71.1489 57.6534C71.2426 57.5549 71.3697 57.4996 71.5023 57.4996H76.5002C76.6328 57.4996 76.7599 57.5549 76.8536 57.6534C76.9473 57.7519 77 57.8854 77 58.0247V66.95C77 67.2285 77.1053 67.4955 77.2928 67.6925C77.4802 67.8894 77.7345 68 77.9996 68H84.0008C84.531 68 85.0395 67.7787 85.4145 67.3849C85.7894 66.9911 86 66.4569 86 65.8999V55.0675C86.0001 54.9965 85.9864 54.9262 85.9599 54.8609C85.9334 54.7956 85.8945 54.7366 85.8457 54.6875L74.3486 43.1456Z',
  p31e3c200: 'M190.445 25C192.661 25.0001 194.364 25.423 195.591 26.8975C196.873 28.4385 197.814 31.33 197.874 36.7569C197.933 42.1729 196.989 45.0535 195.688 46.5869C194.432 48.0665 192.665 48.4912 190.445 48.4912C188.283 48.4912 186.443 47.9447 185.141 46.3701C183.804 44.7543 182.865 41.8616 183.016 36.7754C183.167 31.6584 184.1 28.7376 185.386 27.1026C186.616 25.5384 188.297 25 190.445 25Z',
  p37614900: 'M331.357 43.178L331.348 43.1804L307.464 50.0019C307.263 50.0587 307.078 50.1645 306.928 50.3099C306.778 50.4553 306.665 50.6357 306.602 50.835C306.533 51.0434 306.517 51.2657 306.555 51.4819C306.594 51.698 306.685 51.9013 306.821 52.0733L310.607 56.8386C310.794 57.0735 311.057 57.2359 311.351 57.2978C311.644 57.3597 311.95 57.3173 312.216 57.1777L323.453 51.2051C323.497 51.1818 323.548 51.1747 323.597 51.185C323.646 51.1954 323.69 51.2225 323.721 51.2616C323.753 51.3008 323.769 51.3497 323.768 51.3997C323.767 51.4497 323.748 51.4978 323.716 51.5357L315.358 61.1313C315.162 61.3584 315.051 61.6467 315.045 61.9467C315.039 62.2466 315.137 62.5394 315.323 62.7745L319.11 67.5407C319.24 67.7049 319.409 67.8342 319.602 67.917C319.795 67.9998 320.005 68.0334 320.214 68.015C320.465 67.9935 320.705 67.8984 320.903 67.7414C321.041 67.632 321.155 67.4963 321.239 67.3421L333.317 45.6614L333.322 45.6513C333.481 45.3553 333.55 45.019 333.52 44.6842C333.49 44.3494 333.363 44.0307 333.154 43.7675C332.945 43.5043 332.663 43.3082 332.344 43.2034C332.024 43.0986 331.681 43.0898 331.357 43.178Z',
  p3dc36300: 'M179.85 36.7299C179.97 47.6896 176.081 49.4598 171.433 49.4598C166.785 49.4598 162.71 47.087 163.016 36.7299C163.322 26.3727 166.785 24 171.433 24C176.081 24 179.729 25.7701 179.85 36.7299Z',
  pad1b700: 'M172.567 37.254C172.567 42.3804 169.747 46.5363 166.269 46.5363C162.79 46.5363 159.971 44.1811 159.971 37.254C159.971 32.1275 162.79 27.9717 166.269 27.9717C169.747 27.9717 172.567 32.1275 172.567 37.254Z',
} as const;

function ReferenceMenuEyeIcon() {
  return (
    <>
      <path d={referenceMenuPaths.p3dc36300} fill="#FFF5EB" />
      <mask height="26" id="pixel-nav-eye-left-mask" maskUnits="userSpaceOnUse" style={{ maskType: 'alpha' }} width="17" x="163" y="24">
        <path d={referenceMenuPaths.p15619480} fill="#FFF5EB" stroke="black" strokeWidth="2" />
      </mask>
      <g mask="url(#pixel-nav-eye-left-mask)">
        <path d={referenceMenuPaths.pad1b700} fill="#1A1A1A" />
      </g>
      <path d={referenceMenuPaths.p23c07380} fill="#FFF5EB" />
      <mask height="26" id="pixel-nav-eye-right-mask" maskUnits="userSpaceOnUse" style={{ maskType: 'alpha' }} width="17" x="182" y="24">
        <path d={referenceMenuPaths.p31e3c200} fill="#FFF5EB" stroke="black" strokeWidth="2" />
      </mask>
      <g mask="url(#pixel-nav-eye-right-mask)">
        <path d={referenceMenuPaths.p110abb00} fill="#1A1A1A" />
      </g>
    </>
  );
}

function ReferenceMenuHomeIcon({ fill }: { readonly fill: string }) {
  return <path d={referenceMenuPaths.p29c4a2f0} fill={fill} />;
}

function ReferenceMenuSendIcon({ fill }: { readonly fill: string }) {
  return <path d={referenceMenuPaths.p37614900} fill={fill} />;
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
