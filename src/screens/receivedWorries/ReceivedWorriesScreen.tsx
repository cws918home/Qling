import { ChevronRight, Loader2, XCircle } from 'lucide-react';
import type { MouseEvent } from 'react';
import { cn } from '../../lib/utils';
import {
  CategoryChip,
  EmptyState,
  ErrorState,
  LoadingState,
  QlingCard,
} from '../shared/ui';
import type { ReceivedWorriesScreenProps } from './contract';

export function ReceivedWorriesScreen(props: ReceivedWorriesScreenProps) {
  const passingDeliveryIds = new Set(props.passingDeliveryIds);

  if (props.state.status === 'loading') {
    return (
      <LoadingState title="고민을 불러오고 있어요" message={props.state.label} />
    );
  }

  if (props.state.status === 'error') {
    return (
      <ErrorState title="답변 피드를 불러오지 못했어요" message={props.state.message} />
    );
  }

  if (props.state.status === 'empty') {
    return (
      <EmptyState title="지금은 도착한 고민이 없어요" message={props.state.message} />
    );
  }

  return (
    <div className="grid gap-3 pb-2" aria-label="받은 고민 목록">
      {props.items.map(item => {
        const isPassing = passingDeliveryIds.has(item.deliveryId);
        const content = item.bodyText ?? item.previewText;

        return (
          <QlingCard
            key={item.deliveryId}
            className={cn(
              'relative overflow-hidden p-0 shadow-[0_10px_22px_rgb(37_34_31/0.12)]',
              item.isUnread && 'border-[var(--qling-color-primary-orange)] bg-[var(--qling-color-cream-soft)]',
            )}
          >
            <div className="flex items-start justify-between gap-3 px-4 pt-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <CategoryChip
                  label={item.category}
                  selected
                  disabled
                  className="pointer-events-none px-3 py-1 text-[11px] disabled:opacity-100"
                />
                <time
                  className="text-xs font-bold text-[var(--qling-color-muted)]"
                  dateTime={item.receivedAt.isoValue}
                >
                  {item.receivedAt.label}
                </time>
                {item.isUnread && (
                  <span className="rounded-[var(--qling-radius-pill)] bg-[var(--qling-color-primary-orange)] px-2 py-0.5 text-[10px] font-bold text-white">
                    새 고민
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={(event: MouseEvent<HTMLButtonElement>) => {
                  event.stopPropagation();
                  props.onPass(item.deliveryId);
                }}
                disabled={isPassing}
                aria-label={`${item.category} 고민 건너뛰기`}
                className="inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-[var(--qling-radius-pill)] border border-[var(--qling-color-primary-orange)] bg-[var(--qling-color-primary-orange)] px-3 text-[11px] font-bold text-white transition-colors hover:bg-[var(--qling-color-secondary-orange)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPassing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <XCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                {isPassing ? '처리 중' : '건너뛰기'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => props.onOpen({ deliveryId: item.deliveryId, worryId: item.worryId })}
              aria-label={`${item.category} 고민에 답변 작성하기`}
              className="group flex w-full items-end justify-between gap-3 px-4 pb-4 pt-4 text-left focus:outline-none focus:ring-2 focus:ring-[var(--qling-color-primary-orange)] focus:ring-inset"
            >
              <span className="min-w-0 whitespace-pre-wrap text-base font-extrabold leading-7 text-[var(--qling-color-text)]">
                {content}
              </span>
              <span className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--qling-color-cream-soft)] text-[var(--qling-color-primary-orange)] transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                <ChevronRight className="h-4 w-4" />
              </span>
            </button>
          </QlingCard>
        );
      })}
    </div>
  );
}
