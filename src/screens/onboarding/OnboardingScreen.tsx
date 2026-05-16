import { Loader2 } from 'lucide-react';
import type { WorryCategory } from '@midnight-radio/domain';
import { cn } from '../../lib/utils';
import type { OnboardingScreenProps } from './contract';

type Props = OnboardingScreenProps & {
  readonly categoryOptions: readonly WorryCategory[];
};

const genderOptions = [
  { value: 'female', label: '여성' },
  { value: 'male', label: '남성' },
] as const;

export function OnboardingScreen(props: Props) {
  const duplicateButtonDisabled = props.isProcessing || props.duplicateCheck.state === 'checking';

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <label className="block text-sm font-bold" htmlFor="onboarding-nickname">닉네임</label>
        <div className="flex gap-2">
          <input
            id="onboarding-nickname"
            value={props.values.nickname}
            onChange={event => props.onNicknameChange(event.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-[#E9EDC9] bg-white px-4 py-3"
            maxLength={24}
          />
          <button
            type="button"
            onClick={props.onDuplicateCheck}
            disabled={duplicateButtonDisabled}
            className="shrink-0 rounded-xl bg-[#5A5A40] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {props.duplicateCheck.state === 'checking' ? '확인 중' : '중복 확인'}
          </button>
        </div>
        {(props.validationMessages.nickname || props.duplicateCheck.message) && (
          <p className="text-sm text-red-600">{props.validationMessages.nickname ?? props.duplicateCheck.message}</p>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold">성별</h3>
        <div className="grid grid-cols-2 gap-2">
          {genderOptions.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => props.onGenderChange(option.value)}
              className={cn(
                'rounded-xl border px-4 py-3 text-sm font-bold',
                props.values.gender === option.value
                  ? 'border-[#D4A373] bg-[#D4A373] text-white'
                  : 'border-[#E9EDC9] bg-white text-[#5A5A40]'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {props.validationMessages.gender && <p className="text-sm text-red-600">{props.validationMessages.gender}</p>}
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-bold" htmlFor="onboarding-age">나이</label>
        <input
          id="onboarding-age"
          inputMode="numeric"
          value={props.values.age}
          onChange={event => props.onAgeChange(event.target.value)}
          className="w-full rounded-xl border border-[#E9EDC9] bg-white px-4 py-3"
        />
        {props.validationMessages.age && <p className="text-sm text-red-600">{props.validationMessages.age}</p>}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold">관심 분야</h3>
        <div className="flex flex-wrap gap-2">
          {props.categoryOptions.map(category => {
            const selected = props.values.selectedInterests.includes(category);
            return (
              <button
                key={category}
                type="button"
                onClick={() => props.onInterestToggle(category)}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm font-bold',
                  selected
                    ? 'border-[#A3B18A] bg-[#A3B18A] text-white'
                    : 'border-[#E9EDC9] bg-white text-[#5A5A40]'
                )}
              >
                {category}
              </button>
            );
          })}
        </div>
        {props.validationMessages.interests && <p className="text-sm text-red-600">{props.validationMessages.interests}</p>}
      </div>

      <button
        type="button"
        onClick={props.onSubmit}
        disabled={props.disabled || props.isProcessing}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#5A5A40] py-4 font-bold text-white disabled:opacity-50"
      >
        {props.isProcessing && <Loader2 className="h-5 w-5 animate-spin" />}
        답변하기 시작
      </button>
    </div>
  );
}
