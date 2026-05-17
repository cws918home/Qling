import svgPaths from "./svg-qqyqxlr4si";

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
              <mask height="26" id="mask0_2_144" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="17" x="163" y="24">
                <path d={svgPaths.p15619480} fill="var(--fill-0, #FFF5EB)" id="Ellipse_2" stroke="var(--stroke-0, black)" strokeWidth="2" />
              </mask>
              <g mask="url(#mask0_2_144)">
                <path d={svgPaths.pad1b700} fill="var(--fill-0, #1A1A1A)" id="Ellipse_3" />
              </g>
            </g>
          </g>
          <g id="Menu Icon_2">
            <path d={svgPaths.p23c07380} fill="var(--fill-0, #FFF5EB)" id="Ellipse_4" />
            <g id="Mask group_2">
              <mask height="26" id="mask1_2_144" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="17" x="182" y="24">
                <path d={svgPaths.p31e3c200} fill="var(--fill-0, #FFF5EB)" id="Ellipse_5" stroke="var(--stroke-0, black)" strokeWidth="2" />
              </mask>
              <g mask="url(#mask1_2_144)">
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

function Frame1() {
  return (
    <div className="absolute left-[22.5px] size-[20px] top-[22.5px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_2_140)" id="Frame">
          <path d={svgPaths.p29782100} id="Vector" stroke="var(--stroke-0, #B8B8B8)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M12.5 4.16667L15.8333 7.5" id="Vector_2" stroke="var(--stroke-0, #B8B8B8)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
        <defs>
          <clipPath id="clip0_2_140">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function InputArea() {
  return (
    <div className="absolute bg-[#fff5eb] border-[#ff8b3d] border-[1.5px] border-solid h-[434px] left-[20px] overflow-clip rounded-[18px] top-[227px] w-[353px]" data-name="Input Area">
      <Frame1 />
      <p className="absolute font-['SUIT:Bold',sans-serif] leading-[24px] left-[50.5px] not-italic text-[#b8b8b8] text-[16px] top-[20.5px] tracking-[-0.64px] whitespace-nowrap">당신의 솔직한 이야기를 들려주세요</p>
      <p className="absolute font-['SUIT:Bold',sans-serif] leading-[normal] left-[281.5px] not-italic text-[#b8b8b8] text-[13px] top-[501.5px] whitespace-nowrap">0 / 1000</p>
      <p className="absolute font-['SUIT:Bold',sans-serif] leading-[normal] left-[281.5px] not-italic text-[#b8b8b8] text-[13px] top-[394.5px] whitespace-nowrap">0 / 1000</p>
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

function Frame2() {
  return (
    <div className="absolute bg-[#ffe4cc] content-stretch flex items-start left-[13px] overflow-clip px-[12px] py-[5px] rounded-[999px] top-[54px]" data-name="Frame">
      <div className="flex flex-col font-['Inter:Bold','Noto_Sans_KR:Bold',sans-serif] font-bold justify-center leading-[0] not-italic relative shrink-0 text-[#ff8b3d] text-[11px] text-center whitespace-nowrap">
        <p className="leading-[normal]">외모</p>
      </div>
    </div>
  );
}

function Component() {
  return (
    <div className="absolute bg-white h-[504px] left-0 overflow-clip rounded-[18px] shadow-[0px_12px_40px_0px_rgba(0,0,0,0.18)] top-[251px] w-[393px]" data-name="응모 완료 모달">
      <p className="absolute font-['SUIT:ExtraBold',sans-serif] leading-[normal] left-[166px] not-italic text-[#2a2a2a] text-[17px] top-[13px] tracking-[-0.34px] whitespace-nowrap">고민 보기</p>
      <div className="absolute bg-[#c2c4c8] h-px left-0 rounded-[3px] top-[44px] w-[393px]" data-name="Rectangle" />
      <Frame2 />
      <p className="absolute font-['SUIT:ExtraBold',sans-serif] leading-[24px] left-[17px] not-italic text-[#2a2a2a] text-[16px] top-[87px] tracking-[-0.48px] w-[360px]">꾸미고 싶긴 한데 안 꾸며봐서 어떻게 꾸며야 할 지 잘 모르겠어요, 뭐부터 하는게 좋을까요</p>
      <p className="absolute font-['SUIT:Bold',sans-serif] leading-[24px] left-[19px] not-italic text-[#2a2a2a] text-[12px] top-[155px] tracking-[-0.36px] w-[360px]">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      <p className="absolute font-['Inter:Bold',sans-serif] font-bold leading-[normal] left-[356px] not-italic text-[#2a2a2a] text-[32px] top-0 whitespace-nowrap">x</p>
    </div>
  );
}

export default function Component1() {
  return (
    <div className="bg-[#fff1d1] relative w-full min-h-[859px]" data-name="답변 작성2">
      <MenuBar />
      <Cards />
      <InputArea />
      <div className="absolute h-[852px] left-0 top-0 w-[402.5px]" data-name="Rectangle">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 402.5 852">
          <path d="M0 0H393L402.5 852H0V0Z" fill="var(--fill-0, black)" id="Rectangle" opacity="0.32" />
        </svg>
      </div>
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
      <CtaSendMyWorry />
      <Component />
    </div>
  );
}