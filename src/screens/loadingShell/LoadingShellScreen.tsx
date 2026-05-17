import { Loader2 } from 'lucide-react';
import { MobileAppShell, ProfileMotif } from '../shared/ui';
import type { LoadingShellProps } from './contract';

const loadingCopyByReason: Record<LoadingShellProps['reason'], string> = {
  splash: '큐링을 여는 중입니다.',
  'app-loading': '앱을 준비하는 중입니다.',
  'session-loading': '로그인 상태를 확인하는 중입니다.',
  'profile-loading': '프로필을 불러오는 중입니다.',
  'route-loading': '화면을 불러오는 중입니다.',
};

export function LoadingShellScreen({ reason, accessibleLabel, message }: LoadingShellProps) {
  const visibleMessage = message ?? loadingCopyByReason[reason];

  return (
    <MobileAppShell mainClassName="flex min-h-dvh max-w-none items-stretch px-0 pb-0">
      <section
        className="flex min-h-dvh w-full flex-col items-center justify-center bg-[var(--qling-color-primary-orange)] px-[var(--qling-space-shell-x)] py-[calc(3rem+var(--qling-space-safe-bottom))] text-center text-white"
        aria-label={accessibleLabel}
      >
        <div className="flex min-h-[22rem] w-full max-w-sm flex-col items-center justify-center gap-8">
          <ProfileMotif label="Qling" />
          <div className="space-y-3" role="status" aria-live="polite">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--qling-color-cream-soft)]" aria-hidden="true" />
            <p className="text-sm font-bold text-[var(--qling-color-cream-soft)]">{visibleMessage}</p>
          </div>
        </div>
        <p className="mt-auto pb-[var(--qling-space-safe-bottom)] text-3xl font-black tracking-normal text-[var(--qling-color-cream-soft)]">
          Qling
        </p>
      </section>
    </MobileAppShell>
  );
}
