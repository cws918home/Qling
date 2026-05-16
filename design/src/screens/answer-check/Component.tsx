import svgPaths from "./svg-4xueh65guv";
import imgCards from "./220f7755e41d36d8367585b359ecd693bdb291fb.png";
import imgIcon from "./aad743d8efcc994a297a2ea3f394b335f535f2c5.png";

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
    <div className="bg-white h-[300px] overflow-clip relative rounded-[18px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] shrink-0 w-full" data-name="Card - 학업">
      <p className="absolute font-['SUIT:SemiBold',sans-serif] leading-[normal] left-[80px] not-italic text-[#b8b8b8] text-[12px] top-[17px] tracking-[-0.36px] whitespace-nowrap">2026.05.02</p>
      <p className="absolute font-['SUIT:ExtraBold',sans-serif] leading-[24px] left-[19px] not-italic text-[#2a2a2a] text-[16px] top-[44px] tracking-[-0.48px] w-[325px]">꾸미고 싶긴 한데 안 꾸며봐서 어떻게 꾸며야 할 지 잘 모르겠어요, 뭐부터 하는게 좋을까요</p>
      <p className="absolute font-['SUIT:Bold',sans-serif] leading-[24px] left-[19px] not-italic text-[#2a2a2a] text-[12px] top-[112px] tracking-[-0.36px] w-[325px]">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      <Frame />
      <div className="absolute bg-[#c2c4c8] h-[0.7px] left-[15px] rounded-[3px] top-[99px] w-[332px]" data-name="Rectangle" />
    </div>
  );
}

function Cards() {
  return (
    <div className="absolute content-stretch drop-shadow-[0px_4px_2px_rgba(0,0,0,0.25)] flex flex-col h-[300px] items-start left-[16px] overflow-clip top-[127px] w-[361px]" data-name="Cards">
      <Card />
    </div>
  );
}

function Frame1() {
  return <div className="absolute left-[254px] size-[14px] top-[190px]" data-name="Frame" />;
}

function Card1() {
  return (
    <div className="bg-white h-[213px] overflow-clip relative rounded-[18px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] shrink-0 w-full" data-name="Card - 학업">
      <p className="absolute font-['SUIT:SemiBold',sans-serif] leading-[normal] left-[19px] not-italic text-[#b8b8b8] text-[12px] top-[17px] tracking-[-0.36px] whitespace-nowrap">2026.05.04</p>
      <p className="absolute font-['SUIT:Bold',sans-serif] leading-[24px] left-[19px] not-italic text-[#2a2a2a] text-[12px] top-[43px] tracking-[-0.36px] w-[325px]">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
      <Frame1 />
      <div className="absolute left-[273px] size-[17px] top-[183px]" data-name="Icon">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute left-0 max-w-none size-full top-0" src={imgCards} />
        </div>
      </div>
      <div className="absolute flex items-center justify-center left-[295px] size-[17px] top-[183px]">
        <div className="flex-none rotate-180">
          <div className="relative size-[17px]" data-name="Icon">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgCards} />
          </div>
        </div>
      </div>
      <div className="absolute left-[319px] size-[15px] top-[184px]" data-name="Icon">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgIcon} />
      </div>
    </div>
  );
}

function Cards1() {
  return (
    <div className="absolute content-stretch flex flex-col h-[213px] items-start left-[16px] overflow-clip shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] top-[449px] w-[361px]" data-name="Cards">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <img alt="" className="absolute max-w-none object-cover size-full" src={imgCards} />
        <img alt="" className="absolute max-w-none object-cover size-full" src={imgCards} />
      </div>
      <Card1 />
    </div>
  );
}

function Card2() {
  return (
    <div className="bg-white h-[213px] not-italic overflow-clip relative rounded-[18px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] shrink-0 text-[12px] tracking-[-0.36px] w-full" data-name="Card - 학업">
      <p className="absolute font-['SUIT:SemiBold',sans-serif] leading-[normal] left-[19px] text-[#b8b8b8] top-[17px] whitespace-nowrap">2026.05.03</p>
      <p className="absolute font-['SUIT:Bold',sans-serif] leading-[24px] left-[19px] text-[#2a2a2a] top-[43px] w-[325px]">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
    </div>
  );
}

function Cards2() {
  return (
    <div className="absolute content-stretch drop-shadow-[0px_4px_2px_rgba(0,0,0,0.25)] flex flex-col h-[213px] items-start left-[14px] overflow-clip top-[681px] w-[361px]" data-name="Cards">
      <Card2 />
    </div>
  );
}

function MenuBar() {
  return (
    <div className="absolute h-[104px] left-0 top-[764px] w-[417px]" data-name="Menu Bar">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 417 104">
        <g id="Menu Bar">
          <rect fill="var(--fill-0, #FFF5EB)" height="88" id="Selected Menu Icon Background" rx="37" width="114" x="140" />
          <path d="M0 32H417V104H0V32Z" fill="var(--fill-0, #FFF5EB)" id="Rectangle 2" />
          <rect fill="var(--fill-0, #FF8B3D)" height="59" id="Menu Container" rx="29" width="95" x="149" y="9" />
          <g id="Menu Icon">
            <path d={svgPaths.p169ad500} fill="var(--fill-0, #FFF5EB)" id="Ellipse" />
            <g id="Mask group">
              <mask height="26" id="mask0_2_143" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="17" x="197" y="24">
                <path d={svgPaths.p3e527880} fill="var(--fill-0, #FFF5EB)" id="Ellipse_2" stroke="var(--stroke-0, black)" strokeWidth="2" />
              </mask>
              <g mask="url(#mask0_2_143)">
                <path d={svgPaths.p191a2700} fill="var(--fill-0, #1A1A1A)" id="Ellipse_3" />
              </g>
            </g>
            <path d={svgPaths.p38eb4a00} fill="var(--fill-0, #FFF5EB)" id="Ellipse_4" />
            <g id="Mask group_2">
              <mask height="26" id="mask1_2_143" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="18" x="216" y="24">
                <path d={svgPaths.p2df35bc0} fill="var(--fill-0, #FFF5EB)" id="Ellipse_5" />
              </mask>
              <g mask="url(#mask1_2_143)">
                <path d={svgPaths.p33139500} fill="var(--fill-0, #1A1A1A)" id="Ellipse_6" />
              </g>
            </g>
            <g id="Mask group_3">
              <mask height="26" id="mask2_2_143" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="18" x="216" y="24">
                <path d={svgPaths.p2df35bc0} fill="var(--fill-0, #FFF5EB)" id="Ellipse_7" />
              </mask>
              <g mask="url(#mask2_2_143)">
                <path d={svgPaths.p33139500} fill="var(--fill-0, #1A1A1A)" id="Ellipse_8" />
              </g>
            </g>
            <g id="Mask group_4">
              <mask height="26" id="mask3_2_143" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="18" x="216" y="24">
                <path d={svgPaths.p2df35bc0} fill="var(--fill-0, #FFF5EB)" id="Ellipse_9" />
              </mask>
              <g mask="url(#mask3_2_143)">
                <path d={svgPaths.p33139500} fill="var(--fill-0, #1A1A1A)" id="Ellipse_10" />
              </g>
            </g>
          </g>
          <rect fill="var(--fill-0, #FAE5D7)" height="36" id="Menu Button" rx="7" width="116" x="262" y="37" />
          <path d={svgPaths.p37614900} fill="var(--fill-0, #FF8B3D)" id="Vector" />
          <rect fill="var(--fill-0, #DADCE0)" height="36" id="Menu Button_2" rx="7" width="116" x="16" y="37" />
          <path d={svgPaths.p29c4a2f0} fill="var(--fill-0, #B8B8B8)" id="Vector_2" />
        </g>
      </svg>
    </div>
  );
}

export default function Component() {
  return (
    <div className="bg-[#fff1d1] relative size-full" data-name="답변 확인">
      <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] left-[30px] not-italic text-[#25272b] text-[16px] top-[18px] whitespace-nowrap">10:46</p>
      <div className="absolute bg-[#1a1a1a] h-[4px] left-[295px] rounded-[0.5px] top-[28px] w-[3px]" data-name="Rectangle" />
      <div className="absolute bg-[#1a1a1a] h-[6px] left-[300px] rounded-[0.5px] top-[26px] w-[3px]" data-name="Rectangle" />
      <div className="absolute bg-[#1a1a1a] h-[8px] left-[305px] rounded-[0.5px] top-[24px] w-[3px]" data-name="Rectangle" />
      <div className="absolute bg-[#1a1a1a] h-[10px] left-[310px] rounded-[0.5px] top-[22px] w-[3px]" data-name="Rectangle" />
      <div className="absolute border-[#1a1a1a] border-[1.5px] border-solid h-[12px] left-[350px] rounded-[3px] top-[22px] w-[26px]" data-name="Rectangle" />
      <div className="absolute bg-white border border-[#1a1a1a] border-solid h-[6px] left-[377px] rounded-[1px] top-[25px] w-[2px]" data-name="Rectangle" />
      <div className="absolute bg-[#1a1a1a] border border-[#1a1a1a] border-solid h-[7px] left-[352px] rounded-[1px] top-[24.5px] w-[16px]" data-name="Rectangle" />
      <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] left-[22px] not-italic text-[#2a2a2a] text-[32px] top-[56px] whitespace-nowrap">‹</p>
      <p className="absolute font-['SUIT:ExtraBold',sans-serif] leading-[normal] left-[163.5px] not-italic text-[#2a2a2a] text-[17px] top-[69px] tracking-[-0.34px] whitespace-nowrap">답변 확인</p>
      <Cards />
      <Cards1 />
      <Cards2 />
      <MenuBar />
    </div>
  );
}