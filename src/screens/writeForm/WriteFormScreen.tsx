import { Loader2, Send, Sparkles } from 'lucide-react';
import {
  CategoryChip,
  ContentSheet,
  PrimaryCTA,
  QlingTextArea,
} from '../shared/ui';
import type { WriteFormScreenProps } from './contract';

export function WriteFormScreen(props: WriteFormScreenProps) {
  const isDisabled = Boolean(props.draft.submitDisabledReason);
  const characterCount = props.draft.characterCount;
  const isTooLong = characterCount > props.draft.maxLength;

  if (props.kind === 'write-reply') {
    const validationMessage = props.draft.validation.status === 'invalid' && props.draft.value !== ''
      ? props.draft.validation.message
      : undefined;
    const moderationMessage = props.draft.moderation.status === 'rejected'
      ? [props.draft.moderation.reason, props.draft.moderation.helpMessage].filter(Boolean).join('\n\n')
      : props.draft.moderation.status === 'failed'
        ? props.draft.moderation.message
        : undefined;

    return (
      <div className="space-y-5 pb-4">
        <ContentSheet className="space-y-4 bg-[var(--qling-color-surface)]">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip
              label={props.originalWorry.category}
              selected
              disabled
              className="pointer-events-none px-3 py-1 text-[11px] disabled:opacity-100"
            />
            {props.originalWorry.receivedAt && (
              <time
                className="text-xs font-bold text-[var(--qling-color-muted)]"
                dateTime={props.originalWorry.receivedAt.isoValue}
              >
                {props.originalWorry.receivedAt.label}
              </time>
            )}
          </div>
          <p className="whitespace-pre-wrap text-base font-extrabold leading-7 text-[var(--qling-color-text)]">
            {props.originalWorry.bodyText}
          </p>
        </ContentSheet>

        <QlingTextArea
          value={props.draft.value}
          onChange={props.onDraftChange}
          maxLength={props.draft.maxLength}
          label="답변 작성"
          placeholder="고민자에게 따뜻한 말을 전달해주세요!"
          errorMessage={validationMessage}
          disabled={props.draft.isProcessing}
          processing={props.draft.isProcessing}
        />

        {moderationMessage && (
          <div className="rounded-[var(--qling-radius-card)] border border-red-100 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700 whitespace-pre-wrap">
            {moderationMessage}
          </div>
        )}

        {props.draft.moderation.status === 'checking' && (
          <p className="text-sm font-bold text-[var(--qling-color-muted)]">AI 안심 필터가 내용을 확인하고 있습니다.</p>
        )}

        <div className="rounded-[var(--qling-radius-card)] border border-[var(--qling-color-border)] bg-[var(--qling-color-cream-soft)]/70 p-4">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[var(--qling-color-success)]" aria-hidden="true" />
            <p className="text-xs leading-6 text-[var(--qling-color-muted)]">
              <strong className="text-[var(--qling-color-text)]">AI 안심 필터 적용 안내</strong><br />
              전송 시 부적절한 언어가 감지되는지 확인하고, 문제가 없다면 원문 그대로 전달됩니다.
            </p>
          </div>
        </div>

        <PrimaryCTA
          disabled={isDisabled}
          processing={props.draft.isProcessing}
          accessibilityLabel="답변 전송"
          onClick={() => props.onPublish({
            deliveryId: props.originalWorry.deliveryId,
            worryId: props.originalWorry.worryId,
          })}
        >
          <Send className="h-5 w-5" aria-hidden="true" />
          답변 전송
        </PrimaryCTA>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <textarea
          value={props.draft.value}
          onChange={event => props.onDraftChange(event.target.value)}
          placeholder={props.kind === 'write-worry'
            ? '오늘 하루 속상했던 일, 불안했던 생각들을 편하게 털어놓으세요.'
            : '따뜻한 위로의 말을 남겨주세요.'}
          className="w-full h-48 bg-white p-6 rounded-2xl border border-[#FAEDCD] resize-none focus:outline-none focus:ring-2 focus:ring-[#D4A373] placeholder:text-[#E9EDC9] leading-loose shadow-inner"
        />
        <div className="absolute bottom-4 right-6 text-xs font-medium text-[#8B8B6B]">
          {isTooLong ? (
            <span className="text-[#E07A5F]">
              {characterCount}/{props.draft.maxLength}자
            </span>
          ) : characterCount > 0 ? (
            <span className="text-[#A3B18A]">{characterCount}자 작성됨</span>
          ) : (
            <span className="text-[#8B8B6B]">최대 {props.draft.maxLength}자</span>
          )}
        </div>
      </div>

      {props.draft.validation.status === 'invalid' && props.draft.value !== '' && (
        <p className="text-sm font-medium text-[#E07A5F]">{props.draft.validation.message}</p>
      )}

      {(props.draft.moderation.status === 'rejected' || props.draft.moderation.status === 'failed') && (
        <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-sm text-red-700 whitespace-pre-wrap">
          {props.draft.moderation.status === 'rejected'
            ? [props.draft.moderation.reason, props.draft.moderation.helpMessage].filter(Boolean).join('\n\n')
            : props.draft.moderation.message}
        </div>
      )}

      {props.draft.moderation.status === 'checking' && (
        <p className="text-sm font-medium text-[#8B8B6B]">AI 안심 필터가 내용을 확인하고 있습니다.</p>
      )}

      <div className="bg-[#E9EDC9]/30 p-4 rounded-xl flex gap-3 items-start border border-[#E9EDC9]">
        <Sparkles className="w-5 h-5 text-[#A3B18A] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#8B8B6B] leading-relaxed">
          <strong>AI 안심 필터 적용 안내</strong><br />
          입력하신 내용은 전송을 누르는 순간, AI 엔진을 통해 부적절한 언어가 감지되는지 확인합니다.<br />
          문제가 없다면 상대방에게 원문 그대로 전달되니 편하게 적어주세요.
        </p>
      </div>

      <button
        disabled={isDisabled}
        onClick={() => {
          props.onPublish();
        }}
        className="w-full py-4 bg-[#5A5A40] text-white rounded-xl font-bold shadow-xl hover:bg-[#4A4A30] disabled:opacity-50 transition-all flex items-center justify-center gap-3"
      >
        {props.draft.isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> 전송 중...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" /> 전달하기
          </>
        )}
      </button>
    </div>
  );
}
