import { Loader2, XCircle } from 'lucide-react';
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
      <ReferenceProfileIcon />
      <ReferenceTopRightProfileButtonIcon />

      <div className="absolute left-0 top-[119px] h-[733px] w-[393px] overflow-hidden rounded-t-[32px] bg-[#fff1d1] px-[16px] pt-[20px]">
        {props.items.map((item, index) => {
        const isPassing = passingDeliveryIds.has(item.deliveryId);
        const content = item.bodyText ?? item.previewText;

        return (
          <article
            key={item.deliveryId}
            className="absolute h-[135px] w-[361px] overflow-hidden rounded-[18px] bg-white shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
            style={{ left: 16, top: 20 + index * 149 }}
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
    </div>
  );
}

const receivedWorriesProfilePaths = {
  p10968100: 'M51.5494 19.8501C51.5494 27.528 47.829 33.7521 43.2396 33.7521C38.6503 33.7521 34.9299 30.2247 34.9299 19.8501C34.9299 12.1722 38.6503 5.94812 43.2396 5.94812C47.829 5.94812 51.5494 12.1722 51.5494 19.8501Z',
  p2f1c2d00: 'M21.7228 19.3387C21.8778 35.5589 16.8647 38.1786 10.8719 38.1786C4.87903 38.1786 -0.373688 34.667 0.0208912 19.3387C0.415471 4.0104 4.87903 0.498821 10.8719 0.498821C16.8647 0.498821 21.5678 3.11857 21.7228 19.3387Z',
  p2f962800: 'M25.8164 19.8501C25.8164 27.528 22.096 33.7521 17.5066 33.7521C12.9173 33.7521 9.19687 30.2247 9.19687 19.8501C9.19687 12.1722 12.9173 5.94812 17.5066 5.94812C22.096 5.94812 25.8164 12.1722 25.8164 19.8501Z',
  p360ee270: 'M47.9965 19.3387C48.1587 35.5589 42.9124 38.1786 36.6408 38.1786C30.3692 38.1786 24.8722 34.667 25.2851 19.3387C25.6981 4.0104 30.3692 0.498821 36.6408 0.498821C42.9124 0.498821 47.8342 3.11857 47.9965 19.3387Z',
  p37b21770: 'M47.9964 19.0893C48.1552 35.5242 43.0173 38.1786 36.8754 38.1786C30.7334 38.1786 25.35 34.6205 25.7544 19.0893C26.1588 3.55806 30.7334 0 36.8754 0C43.0173 0 47.8375 2.65443 47.9964 19.0893Z',
  pf977a80: 'M22.2634 19.0893C22.4222 35.5242 17.2843 38.1786 11.1424 38.1786C5.00044 38.1786 -0.382987 34.6205 0.0214111 19.0893C0.425809 3.55808 5.00044 1.72574e-05 11.1424 1.72574e-05C17.2843 1.72574e-05 22.1045 2.65444 22.2634 19.0893Z',
  p36aa5a00: 'M12.4998 12.4306C14.4942 12.4306 16.1109 10.8139 16.1109 8.81951C16.1109 6.82515 14.4942 5.2084 12.4998 5.2084C10.5055 5.2084 8.88871 6.82515 8.88871 8.81951C8.88871 10.8139 10.5055 12.4306 12.4998 12.4306Z',
  p37b1ab00: 'M19.722 21.4584V19.6528C19.722 18.6951 19.3416 17.7766 18.6644 17.0994C17.9872 16.4222 17.0687 16.0417 16.1109 16.0417H8.88871C7.93098 16.0417 7.01248 16.4222 6.33527 17.0994C5.65805 17.7766 5.2776 18.6951 5.2776 19.6528V21.4584',
} as const;

function ReferenceProfileIcon() {
  return (
    <div aria-hidden="true" className="absolute left-[32px] top-[68px] h-[38.179px] w-[48.001px]">
      <svg className="absolute inset-0 block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48.0001 38.1786">
        <path d={receivedWorriesProfilePaths.p2f1c2d00} fill="#FFF5EB" />
        <mask height="39" id="received-profile-left-mask" maskUnits="userSpaceOnUse" style={{ maskType: 'alpha' }} width="23" x="0" y="0">
          <path d={receivedWorriesProfilePaths.pf977a80} fill="#FFF5EB" />
        </mask>
        <g mask="url(#received-profile-left-mask)">
          <path d={receivedWorriesProfilePaths.p2f962800} fill="#1A1A1A" />
        </g>
        <path d={receivedWorriesProfilePaths.p360ee270} fill="#FFF5EB" />
        <mask height="39" id="received-profile-right-mask" maskUnits="userSpaceOnUse" style={{ maskType: 'alpha' }} width="23" x="25" y="0">
          <path d={receivedWorriesProfilePaths.p37b21770} fill="#FFF5EB" />
        </mask>
        <g mask="url(#received-profile-right-mask)">
          <path d={receivedWorriesProfilePaths.p10968100} fill="#1A1A1A" />
        </g>
      </svg>
    </div>
  );
}

function ReferenceTopRightProfileButtonIcon() {
  return (
    <div aria-hidden="true" className="absolute left-[339px] top-[74px] size-[25px]">
      <svg className="absolute inset-0 block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 25 25">
        <path d={receivedWorriesProfilePaths.p37b1ab00} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.83333" />
        <path d={receivedWorriesProfilePaths.p36aa5a00} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.83333" />
        <circle cx="12.5" cy="12.5" r="11.5" stroke="white" strokeWidth="2" />
      </svg>
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
