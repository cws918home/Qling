import { Send, Sparkles } from 'lucide-react';
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
          <p className="whitespace-pre-wrap break-words text-base font-extrabold leading-7 text-[var(--qling-color-text)]">
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

  const validationMessage = props.draft.validation.status === 'invalid' && props.draft.value !== ''
    ? props.draft.validation.message
    : undefined;
  const moderationMessage = props.draft.moderation.status === 'rejected'
    ? [props.draft.moderation.reason, props.draft.moderation.helpMessage].filter(Boolean).join('\n\n')
    : props.draft.moderation.status === 'failed'
      ? props.draft.moderation.message
      : undefined;

  return (
    <div className="absolute inset-0">
      <label className="absolute left-[20px] top-[120px] block h-[541px] w-[353px] overflow-hidden rounded-[18px] border-[1.5px] border-[#ff8b3d] bg-[#fff5eb]">
        <span className="sr-only">질문 작성</span>
        <textarea
          value={props.draft.value}
          onChange={event => props.onDraftChange(event.currentTarget.value)}
          maxLength={props.draft.maxLength}
          disabled={props.draft.isProcessing}
          aria-invalid={Boolean(validationMessage) || undefined}
          placeholder="당신의 솔직한 이야기를 들려주세요"
          className="absolute inset-0 h-full w-full resize-none bg-transparent px-[25px] pb-[48px] pt-[20.5px] text-[16px] font-bold leading-[24px] tracking-[-0.64px] text-[#2a2a2a] outline-none placeholder:text-[#b8b8b8] disabled:cursor-not-allowed disabled:opacity-60"
        />
        <Sparkles className="pointer-events-none absolute left-[22.5px] top-[22.5px] h-[20px] w-[20px] text-[#b8b8b8]" aria-hidden="true" />
        <span className="pointer-events-none absolute left-[281.5px] top-[501.5px] text-[13px] font-bold leading-none text-[#b8b8b8]">
          {characterCount} / {props.draft.maxLength}
        </span>
      </label>

      {moderationMessage && (
        <div className="absolute left-[20px] top-[666px] z-10 w-[353px] whitespace-pre-wrap rounded-[12px] border border-red-100 bg-red-50 p-3 text-[12px] font-semibold leading-5 text-red-700">
          {moderationMessage}
        </div>
      )}

      {props.draft.moderation.status === 'checking' && (
        <p className="absolute left-[20px] top-[666px] text-[12px] font-bold text-[#77716b]">AI 안심 필터가 내용을 확인하고 있습니다.</p>
      )}

      <div className="absolute left-[20px] top-[860px] w-[353px] rounded-[18px] border border-[var(--qling-color-border)] bg-[var(--qling-color-surface)] p-4">
        <div className="flex gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[var(--qling-color-primary-orange)]" aria-hidden="true" />
          <p className="text-xs leading-6 text-[var(--qling-color-muted)]">
            <strong className="text-[var(--qling-color-text)]">AI 안심 필터 적용 안내</strong><br />
            전송 시 부적절한 언어가 감지되는지 확인하고, 문제가 없다면 원문 그대로 전달됩니다.
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={isDisabled || props.draft.isProcessing}
        aria-label="고민 전송"
        aria-busy={props.draft.isProcessing || undefined}
        onClick={() => {
          props.onPublish();
        }}
        className="absolute left-[63px] top-[684px] flex h-[48px] w-[267px] items-center justify-center rounded-full bg-[#ff8b3d] px-[22px] text-[16px] font-extrabold leading-none text-[#fff5eb] disabled:cursor-not-allowed"
      >
        {props.draft.isProcessing && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-[#fff5eb] border-t-transparent" aria-hidden="true" />}
        고민 전송
      </button>
    </div>
  );
}
