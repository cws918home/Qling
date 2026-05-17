import { AlertCircle } from 'lucide-react';
import { ContentSheet, MobileAppShell, ProfileMotif, SecondaryCTA } from '../shared/ui';
import type { LoginScreenProps } from './contract';

function GoogleMark() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function LoginScreen({
  sessionState,
  errorMessage,
  isProcessing,
  disabled,
  onSignIn,
}: LoginScreenProps) {
  const isDisabled = disabled || isProcessing || sessionState === 'checking';
  const buttonLabel = isProcessing || sessionState === 'signing-in' ? '로그인 중입니다' : 'Google로 로그인';

  return (
    <MobileAppShell mainClassName="flex min-h-dvh flex-col justify-between gap-8 px-[var(--qling-space-shell-x)] pb-[calc(1.5rem+var(--qling-space-safe-bottom))] pt-[max(5rem,calc(4rem+env(safe-area-inset-top,0px)))]">
      <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="space-y-8">
          <div className="space-y-5">
            <ProfileMotif label="Qling" />
            <div className="space-y-2">
              <h1 className="text-6xl font-black leading-tight tracking-normal text-[var(--qling-color-text)]">
                고민끝에<br />
                큐링
              </h1>
              <div className="h-0.5 w-56 max-w-full rounded-full bg-[var(--qling-color-border)]" aria-hidden="true" />
            </div>
          </div>

          {errorMessage && (
            <ContentSheet className="flex items-start gap-3 border border-[rgb(216_75_75/0.22)] bg-[rgb(216_75_75/0.06)] shadow-none" >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--qling-color-danger)]" aria-hidden="true" />
              <p className="text-sm font-semibold leading-6 text-[var(--qling-color-danger)]" role="alert">
                {errorMessage}
              </p>
            </ContentSheet>
          )}
        </div>
      </section>

      <form className="mx-auto w-full max-w-md" onSubmit={(event) => {
        event.preventDefault();
        if (!isDisabled) onSignIn();
      }}>
        <SecondaryCTA
          type="submit"
          disabled={isDisabled}
          processing={isProcessing || sessionState === 'signing-in'}
          accessibilityLabel={buttonLabel}
        >
          {!isProcessing && sessionState !== 'signing-in' && <GoogleMark />}
          <span>{buttonLabel}</span>
        </SecondaryCTA>
      </form>
    </MobileAppShell>
  );
}
