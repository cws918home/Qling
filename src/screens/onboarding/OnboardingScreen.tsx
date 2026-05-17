import { CheckCircle2 } from 'lucide-react';
import type { WorryCategory } from '@midnight-radio/domain';
import { cn } from '../../lib/utils';
import {
  CategoryChip,
  ContentSheet,
  PrimaryCTA,
  SecondaryCTA,
} from '../shared/ui';
import type { OnboardingScreenProps } from './contract';

type Props = OnboardingScreenProps & {
  readonly categoryOptions: readonly WorryCategory[];
};

const genderOptions = [
  { value: 'female', label: '여성' },
  { value: 'male', label: '남성' },
] as const;

export function OnboardingScreen(props: Props) {
  const nicknameError = props.validationMessages.nickname;
  const duplicateMessage = props.duplicateCheck.message;
  const duplicateIsPositive = props.duplicateCheck.state === 'available';
  const duplicateButtonDisabled = props.isProcessing
    || props.duplicateCheck.state === 'checking'
    || Boolean(nicknameError)
    || props.values.nickname.trim().length === 0;
  const basicStepComplete = !props.validationMessages.nickname
    && !props.validationMessages.gender
    && !props.validationMessages.age
    && props.duplicateCheck.state === 'available';

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-xl flex-col">
      <div className="rounded-b-[2rem] bg-[var(--qling-color-primary-orange)] px-5 pb-16 pt-8 text-white shadow-[var(--qling-shadow-card)]">
        <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[var(--qling-color-cream-soft)]">Question 1</p>
        <h1 className="mt-3 text-[1.65rem] font-black leading-tight">기본 정보를 알려주세요</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-white/85">
          외부에는 공개되지 않는 정보예요. 닉네임은 나중에 마이페이지에서만 본인이 확인할 수 있어요.
        </p>
        <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-[#2a2c30]">
          <div className="h-full w-1/2 rounded-full bg-[var(--qling-color-cream-soft)]" />
        </div>
      </div>

      <ContentSheet className="-mt-8 flex-1 space-y-7 rounded-t-[2rem]">
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <label className="block text-sm font-black" htmlFor="onboarding-nickname">닉네임</label>
            <span className="text-xs font-semibold text-[var(--qling-color-muted)]">2-12자, 한글/영문/숫자</span>
          </div>
          <div className="flex gap-2 max-[380px]:flex-col">
            <input
              id="onboarding-nickname"
              value={props.values.nickname}
              onChange={event => props.onNicknameChange(event.target.value)}
              className={cn(
                'min-h-[3.75rem] min-w-0 flex-1 rounded-[var(--qling-radius-input)] border bg-white px-4 text-base font-bold outline-none transition-colors placeholder:text-[var(--qling-color-muted)] focus:border-[var(--qling-color-primary-orange)] focus:ring-2 focus:ring-[rgb(224_122_95/0.18)] disabled:cursor-not-allowed disabled:opacity-60',
                nicknameError || (!duplicateIsPositive && duplicateMessage)
                  ? 'border-[var(--qling-color-danger)]'
                  : duplicateIsPositive
                    ? 'border-[var(--qling-color-success)]'
                    : 'border-[#d4be91]',
              )}
              maxLength={24}
              placeholder="닉네임 입력"
              aria-invalid={Boolean(nicknameError) || props.duplicateCheck.state === 'duplicate' || undefined}
              aria-describedby="onboarding-nickname-message"
              disabled={props.isProcessing}
            />
            <div className="w-32 shrink-0 max-[380px]:w-full">
              <SecondaryCTA
                onClick={props.onDuplicateCheck}
                disabled={duplicateButtonDisabled}
                processing={props.duplicateCheck.state === 'checking'}
                accessibilityLabel="닉네임 중복 확인"
              >
                {props.duplicateCheck.state === 'checking' ? '확인 중' : '중복 확인'}
              </SecondaryCTA>
            </div>
          </div>
          {(nicknameError || duplicateMessage) && (
            <p
              id="onboarding-nickname-message"
              className={cn(
                'text-sm font-semibold leading-6',
                duplicateIsPositive ? 'text-[var(--qling-color-success)]' : 'text-[var(--qling-color-danger)]',
              )}
              role={duplicateIsPositive ? 'status' : 'alert'}
            >
              {duplicateIsPositive && <CheckCircle2 className="mr-1 inline h-4 w-4 align-[-0.15em]" aria-hidden="true" />}
              {nicknameError ?? duplicateMessage}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-black">성별</h2>
          <div className="grid grid-cols-2 gap-2">
            {genderOptions.map(option => {
              const selected = props.values.gender === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => props.onGenderChange(option.value)}
                  disabled={props.isProcessing}
                  aria-pressed={selected}
                  className={cn(
                    'min-h-[3.75rem] rounded-[var(--qling-radius-input)] border px-4 text-sm font-black transition-colors focus:outline-none focus:ring-2 focus:ring-[rgb(224_122_95/0.18)] disabled:cursor-not-allowed disabled:opacity-55',
                    selected
                      ? 'border-[var(--qling-color-primary-orange)] bg-[var(--qling-color-cream-soft)] text-[var(--qling-color-primary-orange)]'
                      : 'border-[#d4be91] bg-white text-[var(--qling-color-text)]',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {props.validationMessages.gender && (
            <p className="text-sm font-semibold text-[var(--qling-color-danger)]" role="alert">
              {props.validationMessages.gender}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-black" htmlFor="onboarding-age">나이</label>
          <div className="relative">
            <input
              id="onboarding-age"
              inputMode="numeric"
              value={props.values.age}
              onChange={event => props.onAgeChange(event.target.value)}
              className={cn(
                'min-h-[3.75rem] w-full rounded-[var(--qling-radius-input)] border bg-white px-4 pr-12 text-base font-bold outline-none transition-colors focus:border-[var(--qling-color-primary-orange)] focus:ring-2 focus:ring-[rgb(224_122_95/0.18)] disabled:cursor-not-allowed disabled:opacity-60',
                props.validationMessages.age ? 'border-[var(--qling-color-danger)]' : 'border-[#d4be91]',
              )}
              placeholder="만 나이 입력"
              aria-invalid={Boolean(props.validationMessages.age) || undefined}
              aria-describedby="onboarding-age-message"
              disabled={props.isProcessing}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#d4be91]">세</span>
          </div>
          {props.validationMessages.age && (
            <p id="onboarding-age-message" className="text-sm font-semibold text-[var(--qling-color-danger)]" role="alert">
              {props.validationMessages.age}
            </p>
          )}
        </div>

        <div className="space-y-3 border-t border-[var(--qling-color-border)] pt-6">
          <div className="space-y-1">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[var(--qling-color-primary-orange)]">Question 2</p>
            <h2 className="text-xl font-black leading-tight">주요 관심사는 무엇인가요?</h2>
            <p className="text-sm font-semibold leading-6 text-[var(--qling-color-muted)]">
              고민 매칭에 필요해요. 최소 1개 선택, 복수 선택 가능해요.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="관심 분야 선택">
            {props.categoryOptions.map(category => (
              <CategoryChip
                key={category}
                label={category}
                selected={props.values.selectedInterests.includes(category)}
                disabled={props.isProcessing}
                onSelect={() => props.onInterestToggle(category)}
              />
            ))}
          </div>
          {props.validationMessages.interests && (
            <p className="text-sm font-semibold text-[var(--qling-color-danger)]" role="alert">
              {props.validationMessages.interests}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 -mx-[var(--qling-space-card-padding)] bg-gradient-to-t from-[var(--qling-color-surface)] via-[var(--qling-color-surface)] to-transparent px-[var(--qling-space-card-padding)] pb-[calc(var(--qling-space-safe-bottom)+0.25rem)] pt-4">
          <PrimaryCTA
            onClick={props.onSubmit}
            disabled={props.disabled || props.isProcessing}
            processing={props.isProcessing}
            accessibilityLabel={basicStepComplete ? '온보딩 완료하고 답변하기 시작' : '필수 정보를 완료해야 답변하기 시작 가능'}
          >
            답변하기 시작
          </PrimaryCTA>
        </div>
      </ContentSheet>
    </section>
  );
}
