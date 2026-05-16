import svgPaths from "./svg-khmwktjy44";

function MenuBar() {
  return (
    <div className="absolute h-[104px] left-0 top-[755px] w-[417px]" data-name="Menu Bar">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 417 104">
        <g id="Menu Bar">
          <rect fill="var(--fill-0, #FFF5EB)" height="88" id="Selected Menu Icon Background" rx="37" width="114" x="140" />
          <path d="M0 32H417V104H0V32Z" fill="var(--fill-0, #FFF5EB)" id="Rectangle 2" />
          <rect fill="var(--fill-0, #FF8B3D)" height="59" id="Menu Container" rx="29" width="95" x="149" y="9" />
          <g id="Menu Icon">
            <path d={svgPaths.p3dc36300} fill="var(--fill-0, #FFF5EB)" id="Ellipse" />
            <g id="Mask group">
              <mask height="26" id="mask0_2_221" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="17" x="163" y="24">
                <path d={svgPaths.p15619480} fill="var(--fill-0, #FFF5EB)" id="Ellipse_2" stroke="var(--stroke-0, black)" strokeWidth="2" />
              </mask>
              <g mask="url(#mask0_2_221)">
                <path d={svgPaths.pad1b700} fill="var(--fill-0, #1A1A1A)" id="Ellipse_3" />
              </g>
            </g>
          </g>
          <g id="Menu Icon_2">
            <path d={svgPaths.p23c07380} fill="var(--fill-0, #FFF5EB)" id="Ellipse_4" />
            <g id="Mask group_2">
              <mask height="26" id="mask1_2_221" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="17" x="182" y="24">
                <path d={svgPaths.p31e3c200} fill="var(--fill-0, #FFF5EB)" id="Ellipse_5" stroke="var(--stroke-0, black)" strokeWidth="2" />
              </mask>
              <g mask="url(#mask1_2_221)">
                <path d={svgPaths.p110abb00} fill="var(--fill-0, #1A1A1A)" id="Ellipse_6" />
              </g>
            </g>
          </g>
          <rect fill="var(--fill-0, #FAE5D7)" height="36" id="Menu Button" rx="7" width="116" x="16" y="37" />
          <rect fill="var(--fill-0, #DADCE0)" height="36" id="Menu Button_2" rx="7" width="116" x="262" y="37" />
          <path d={svgPaths.p29c4a2f0} fill="var(--fill-0, #FF8B3D)" id="Vector" />
          <path d={svgPaths.p37614900} fill="var(--fill-0, #B8B8B8)" id="Vector_2" />
        </g>
      </svg>
    </div>
  );
}

function CtaSendMyWorry() {
  return (
    <div className="absolute bg-[#ff8b3d] content-stretch flex h-[48px] items-center justify-center left-[63px] overflow-clip px-[22px] rounded-[999px] top-[684px] w-[267px]" data-name="CTA - Send My Worry">
      <p className="font-['SUIT:ExtraBold',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#fff5eb] text-[16px] whitespace-nowrap">답변 전송</p>
    </div>
  );
}

function InputArea() {
  return (
    <div className="absolute bg-[#fff5eb] border-[#ff8b3d] border-[1.5px] border-solid font-['SUIT:Bold',sans-serif] h-[434px] left-[20px] not-italic overflow-clip rounded-[18px] top-[227px] w-[353px]" data-name="Input Area">
      <p className="absolute leading-[normal] left-[281.5px] text-[#b8b8b8] text-[13px] top-[501.5px] whitespace-nowrap">0 / 1000</p>
      <p className="absolute leading-[normal] left-[281.5px] text-[#b8b8b8] text-[13px] top-[394.5px] whitespace-nowrap">0 / 1000</p>
      <p className="absolute leading-[24px] left-[16.5px] text-[#2a2a2a] text-[12px] top-[17.5px] tracking-[-0.36px] w-[325px]">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
    </div>
  );
}

function Frame() {
  return (
    <div className="absolute bg-[#ffe4cc] content-stretch flex items-start left-[18px] overflow-clip px-[12px] py-[5px] rounded-[999px] top-[11px]" data-name="Frame">
      <div className="flex flex-col font-['Inter:Bold','Noto_Sans_KR:Bold',sans-serif] font-bold justify-center leading-[0] not-italic relative shrink-0 text-[#ff8b3d] text-[11px] text-center whitespace-nowrap">
        <p className="leading-[normal]">외모</p>
      </div>
    </div>
  );
}

function Card() {
  return (
    <div className="bg-white h-[79px] overflow-clip relative rounded-[18px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] shrink-0 w-full" data-name="Card - 학업">
      <p className="absolute font-['SUIT:SemiBold',sans-serif] leading-[normal] left-[80px] not-italic text-[#b8b8b8] text-[12px] top-[17px] tracking-[-0.36px] whitespace-nowrap">2026.05.02</p>
      <p className="absolute font-['SUIT:ExtraBold',sans-serif] leading-[24px] left-[19px] not-italic text-[#2a2a2a] text-[16px] top-[44px] tracking-[-0.48px] w-[325px]">꾸미고 싶긴 한데 안 꾸며봐서 어떻게 꾸며야 할 지...</p>
      <Frame />
      <div className="absolute flex h-[13px] items-center justify-center left-[316px] top-[16px] w-[39px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "22" } as React.CSSProperties}>
        <div className="-rotate-90 flex-none">
          <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative text-[#2a2a2a] text-[32px] whitespace-nowrap">‹</p>
        </div>
      </div>
    </div>
  );
}

function Cards() {
  return (
    <div className="absolute content-stretch drop-shadow-[0px_4px_2px_rgba(0,0,0,0.25)] flex flex-col h-[168px] items-start left-[16px] overflow-clip top-[127px] w-[361px]" data-name="Cards">
      <Card />
    </div>
  );
}

function Clover() {
  return (
    <div className="absolute left-[133px] size-[44px] top-[30px]" data-name="Clover">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 44 44">
        <g clipPath="url(#clip0_2_214)" id="Clover">
          <circle cx="22" cy="14" fill="var(--fill-0, #5CC15A)" id="Ellipse" r="9" />
          <circle cx="30" cy="22" fill="var(--fill-0, #5CC15A)" id="Ellipse_2" r="9" />
          <circle cx="22" cy="30" fill="var(--fill-0, #5CC15A)" id="Ellipse_3" r="9" />
          <circle cx="14" cy="22" fill="var(--fill-0, #5CC15A)" id="Ellipse_4" r="9" />
          <rect fill="var(--fill-0, #5CC15A)" height="8" id="Rectangle" rx="1" width="2" x="21" y="37" />
        </g>
        <defs>
          <clipPath id="clip0_2_214">
            <rect fill="white" height="44" width="44" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Component1() {
  return (
    <div className="absolute bg-[#ff8b3d] h-[52px] left-[24px] overflow-clip rounded-[12px] top-[201px] w-[262px]" data-name="당첨 결과 알림 받기">
      <p className="absolute font-['SUIT:Bold',sans-serif] leading-[normal] left-[117px] not-italic text-[15px] text-white top-[17px] tracking-[-0.15px] whitespace-nowrap">확인</p>
    </div>
  );
}

function Component() {
  return (
    <div className="absolute bg-white drop-shadow-[0px_12px_20px_rgba(0,0,0,0.18)] h-[288px] left-[42px] rounded-[24px] top-[251px] w-[310px]" data-name="응모 완료 모달">
      <Clover />
      <p className="absolute font-['SUIT:Bold',sans-serif] leading-[normal] left-[56px] not-italic text-[#1a1a1e] text-[19px] top-[94px] tracking-[-0.38px] whitespace-nowrap">답변 전송이 완료되었어요 !</p>
      <p className="-translate-x-1/2 absolute font-['SUIT:Bold',sans-serif] leading-[1.5] left-[155px] not-italic text-[#6e7076] text-[14px] text-center top-[137px] tracking-[-0.14px] w-[262px]">따뜻한 의견을 공유해주셔서 감사해요</p>
      <Component1 />
    </div>
  );
}

export default function Component2() {
  return (
    <div className="bg-[#fff1d1] relative size-full" data-name="답변 작성3">
      <MenuBar />
      <CtaSendMyWorry />
      <InputArea />
      <Cards />
      <div className="absolute bg-black h-[852px] left-[-1px] opacity-32 top-0 w-[393px]" data-name="Rectangle" />
      <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] left-[30px] not-italic text-[#25272b] text-[16px] top-[18px] whitespace-nowrap">10:46</p>
      <div className="absolute bg-[#1a1a1a] h-[4px] left-[295px] rounded-[0.5px] top-[28px] w-[3px]" data-name="Rectangle" />
      <div className="absolute bg-[#1a1a1a] h-[6px] left-[300px] rounded-[0.5px] top-[26px] w-[3px]" data-name="Rectangle" />
      <div className="absolute bg-[#1a1a1a] h-[8px] left-[305px] rounded-[0.5px] top-[24px] w-[3px]" data-name="Rectangle" />
      <div className="absolute bg-[#1a1a1a] h-[10px] left-[310px] rounded-[0.5px] top-[22px] w-[3px]" data-name="Rectangle" />
      <div className="absolute border-[#1a1a1a] border-[1.5px] border-solid h-[12px] left-[350px] rounded-[3px] top-[22px] w-[26px]" data-name="Rectangle" />
      <div className="absolute bg-white border border-[#1a1a1a] border-solid h-[6px] left-[377px] rounded-[1px] top-[25px] w-[2px]" data-name="Rectangle" />
      <div className="absolute bg-[#1a1a1a] border border-[#1a1a1a] border-solid h-[7px] left-[352px] rounded-[1px] top-[24.5px] w-[16px]" data-name="Rectangle" />
      <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] left-[22px] not-italic text-[#2a2a2a] text-[32px] top-[56px] whitespace-nowrap">‹</p>
      <p className="absolute font-['SUIT:ExtraBold',sans-serif] leading-[normal] left-[163.5px] not-italic text-[#2a2a2a] text-[17px] top-[69px] tracking-[-0.34px] whitespace-nowrap">답변 작성</p>
      <Component />
    </div>
  );
}