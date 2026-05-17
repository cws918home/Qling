import { Bell, Loader2, XCircle } from 'lucide-react';
import type { MouseEvent } from 'react';
import {
  EmptyState,
  ErrorState,
  LoadingState,
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
    <div
      className="relative h-[852px] w-[393px] overflow-hidden bg-[#ff8b3d] font-sans text-[#2a2a2a]"
      aria-label="받은 고민 목록"
    >
      <ReferenceStatusBar tone="light" />
      <div aria-hidden="true" className="absolute left-[42px] top-[74px] h-[27px] w-[38px]">
        <div className="absolute left-0 top-0 h-[27px] w-[18px] rounded-full bg-[#fff5eb]" />
        <div className="absolute left-[18px] top-0 h-[27px] w-[18px] rounded-full bg-[#fff5eb]" />
        <div className="absolute left-[12px] top-[8px] h-[10px] w-[5px] rounded-full bg-[#1a1a1a]" />
        <div className="absolute left-[25px] top-[8px] h-[10px] w-[5px] rounded-full bg-[#1a1a1a]" />
      </div>
      <div
        aria-hidden="true"
        className="absolute left-[339px] top-[74px] flex h-[25px] w-[25px] items-center justify-center rounded-full border-2 border-white text-white"
      >
        <Bell className="h-[14px] w-[14px]" strokeWidth={2} />
      </div>

      <div className="absolute left-0 top-[119px] h-[733px] w-[393px] overflow-hidden rounded-t-[32px] bg-[#fff1d1] px-[16px] pt-[20px]">
        {props.items.map((item, index) => {
        const isPassing = passingDeliveryIds.has(item.deliveryId);
        const content = item.bodyText ?? item.previewText;

        return (
          <article
            key={item.deliveryId}
            className="absolute h-[135px] w-[361px] overflow-hidden rounded-[18px] bg-white shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
            style={{ left: 16, top: 139 + index * 149 }}
          >
            <button
              type="button"
              onClick={() => props.onOpen({ deliveryId: item.deliveryId, worryId: item.worryId })}
              aria-label={`${item.category} 고민에 답변 작성하기`}
              className="absolute inset-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#ff8b3d]"
            >
              <span className="absolute left-[18px] top-[11px] rounded-full bg-[#ffe4cc] px-[12px] py-[5px] text-[11px] font-bold leading-none text-[#ff8b3d]">
                {item.category}
              </span>
              <time
                className="absolute left-[79px] top-[15px] text-[12px] font-bold leading-none text-[#b8b8b8]"
                dateTime={item.receivedAt.isoValue}
              >
                {item.receivedAt.label}
              </time>
              <span className="absolute left-[19px] top-[56px] w-[325px] whitespace-pre-wrap break-words text-[16px] font-extrabold leading-[24px] tracking-[-0.48px] text-[#2a2a2a]">
                {content}
              </span>
            </button>
              <button
                type="button"
                onClick={(event: MouseEvent<HTMLButtonElement>) => {
                  event.stopPropagation();
                  props.onPass(item.deliveryId);
                }}
                disabled={isPassing}
                aria-label={`${item.category} 고민 건너뛰기`}
                className="absolute left-[285px] top-[11px] z-10 flex h-[23px] w-[65px] items-center justify-center rounded-full border border-[#ff8b3d] bg-[#ff8b3d] text-[11px] font-bold leading-none text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPassing && <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />}
                {!isPassing && <XCircle className="sr-only" aria-hidden="true" />}
                {isPassing ? '처리 중' : '건너뛰기'}
              </button>
          </article>
        );
      })}
      </div>
      <VisualBottomNavigation top={740} />
    </div>
  );
}

function ReferenceStatusBar({ tone }: { readonly tone: 'light' | 'dark' }) {
  const color = tone === 'light' ? 'bg-white border-white text-white' : 'bg-[#1a1a1a] border-[#1a1a1a] text-[#25272b]';
  return (
    <>
      <p className={`absolute left-[30px] top-[18px] text-[16px] font-semibold leading-none ${tone === 'light' ? 'text-white' : 'text-[#25272b]'}`}>10:46</p>
      <div className={`absolute left-[295px] top-[28px] h-[4px] w-[3px] rounded-[0.5px] ${color}`} />
      <div className={`absolute left-[300px] top-[26px] h-[6px] w-[3px] rounded-[0.5px] ${color}`} />
      <div className={`absolute left-[305px] top-[24px] h-[8px] w-[3px] rounded-[0.5px] ${color}`} />
      <div className={`absolute left-[310px] top-[22px] h-[10px] w-[3px] rounded-[0.5px] ${color}`} />
      <div className={`absolute left-[350px] top-[22px] h-[12px] w-[26px] rounded-[3px] border-[1.5px] ${color}`} />
      <div className={`absolute left-[377px] top-[25px] h-[6px] w-[2px] rounded-[1px] ${color}`} />
      <div className={`absolute left-[352px] top-[24.5px] h-[7px] w-[16px] rounded-[1px] ${color}`} />
    </>
  );
}

function VisualBottomNavigation({ top }: { readonly top: number }) {
  return (
    <div aria-hidden="true" className="absolute left-0 h-[112px] w-[393px] bg-[#fff5eb]" style={{ top }}>
      <div className="absolute left-[135px] top-[15px] h-[80px] w-[125px] rounded-[37px] bg-[#fff5eb]" />
      <div className="absolute left-[149px] top-[15px] h-[59px] w-[95px] rounded-full bg-[#ff8b3d]" />
      <div className="absolute left-[16px] top-[52px] h-[36px] w-[116px] rounded-[7px] bg-[#fae5d7]" />
      <div className="absolute left-[262px] top-[52px] h-[36px] w-[116px] rounded-[7px] bg-[#dadce0]" />
    </div>
  );
}
