import svgPaths from "./svg-er6i23gp6i";

function Frame() {
  return (
    <div className="absolute left-[22.5px] size-[20px] top-[22.5px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_2_139)" id="Frame">
          <path d={svgPaths.p29782100} id="Vector" stroke="var(--stroke-0, #B8B8B8)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M12.5 4.16667L15.8333 7.5" id="Vector_2" stroke="var(--stroke-0, #B8B8B8)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
        <defs>
          <clipPath id="clip0_2_139">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function InputArea() {
  return (
    <div className="absolute bg-[#fff5eb] border-[#ff8b3d] border-[1.5px] border-solid h-[541px] left-[20px] overflow-clip rounded-[18px] top-[120px] w-[353px]" data-name="Input Area">
      <Frame />
      <p className="absolute font-['SUIT:Bold',sans-serif] leading-[24px] left-[50.5px] not-italic text-[#b8b8b8] text-[16px] top-[20.5px] tracking-[-0.64px] whitespace-nowrap">당신의 솔직한 이야기를 들려주세요</p>
      <p className="absolute font-['SUIT:Bold',sans-serif] leading-[normal] left-[281.5px] not-italic text-[#b8b8b8] text-[13px] top-[501.5px] whitespace-nowrap">0 / 1000</p>
    </div>
  );
}

function CtaSendMyWorry() {
  return (
    <div className="absolute bg-[#ff8b3d] content-stretch flex h-[48px] items-center justify-center left-[63px] overflow-clip px-[22px] rounded-[999px] top-[684px] w-[267px]" data-name="CTA - Send My Worry">
      <p className="font-['SUIT:ExtraBold',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#fff5eb] text-[16px] whitespace-nowrap">고민 전송</p>
    </div>
  );
}

function MenuBar() {
  return (
    <div className="absolute h-[104px] left-0 top-[755px] w-[417px]" data-name="Menu Bar">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 417 104">
        <g id="Menu Bar">
          <rect fill="var(--fill-0, #FFF5EB)" height="88" id="Selected Menu Icon Background" rx="37" width="114" x="140" />
          <path d="M0 32H417V104H0V32Z" fill="var(--fill-0, #FFF5EB)" id="Rectangle 2" />
          <rect fill="var(--fill-0, #FF8B3D)" height="59" id="Menu Container" rx="29" width="95" x="149" y="9" />
          <g id="Menu Icon">
            <path d={svgPaths.p169ad500} fill="var(--fill-0, #FFF5EB)" id="Ellipse" />
            <g id="Mask group">
              <mask height="26" id="mask0_2_115" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="17" x="197" y="24">
                <path d={svgPaths.p3e527880} fill="var(--fill-0, #FFF5EB)" id="Ellipse_2" stroke="var(--stroke-0, black)" strokeWidth="2" />
              </mask>
              <g mask="url(#mask0_2_115)">
                <path d={svgPaths.p191a2700} fill="var(--fill-0, #1A1A1A)" id="Ellipse_3" />
              </g>
            </g>
            <path d={svgPaths.p38eb4a00} fill="var(--fill-0, #FFF5EB)" id="Ellipse_4" />
            <g id="Mask group_2">
              <mask height="26" id="mask1_2_115" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="18" x="216" y="24">
                <path d={svgPaths.p2df35bc0} fill="var(--fill-0, #FFF5EB)" id="Ellipse_5" />
              </mask>
              <g mask="url(#mask1_2_115)">
                <path d={svgPaths.p33139500} fill="var(--fill-0, #1A1A1A)" id="Ellipse_6" />
              </g>
            </g>
            <g id="Mask group_3">
              <mask height="26" id="mask2_2_115" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="18" x="216" y="24">
                <path d={svgPaths.p2df35bc0} fill="var(--fill-0, #FFF5EB)" id="Ellipse_7" />
              </mask>
              <g mask="url(#mask2_2_115)">
                <path d={svgPaths.p33139500} fill="var(--fill-0, #1A1A1A)" id="Ellipse_8" />
              </g>
            </g>
            <g id="Mask group_4">
              <mask height="26" id="mask3_2_115" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="18" x="216" y="24">
                <path d={svgPaths.p2df35bc0} fill="var(--fill-0, #FFF5EB)" id="Ellipse_9" />
              </mask>
              <g mask="url(#mask3_2_115)">
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
    <div className="bg-[#fff1d1] relative size-full" data-name="질문 작성">
      <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] left-[30px] not-italic text-[#25272b] text-[16px] top-[18px] whitespace-nowrap">10:46</p>
      <div className="absolute bg-[#1a1a1a] h-[4px] left-[295px] rounded-[0.5px] top-[28px] w-[3px]" data-name="Rectangle" />
      <div className="absolute bg-[#1a1a1a] h-[6px] left-[300px] rounded-[0.5px] top-[26px] w-[3px]" data-name="Rectangle" />
      <div className="absolute bg-[#1a1a1a] h-[8px] left-[305px] rounded-[0.5px] top-[24px] w-[3px]" data-name="Rectangle" />
      <div className="absolute bg-[#1a1a1a] h-[10px] left-[310px] rounded-[0.5px] top-[22px] w-[3px]" data-name="Rectangle" />
      <div className="absolute border-[#1a1a1a] border-[1.5px] border-solid h-[12px] left-[350px] rounded-[3px] top-[22px] w-[26px]" data-name="Rectangle" />
      <div className="absolute bg-white border border-[#1a1a1a] border-solid h-[6px] left-[377px] rounded-[1px] top-[25px] w-[2px]" data-name="Rectangle" />
      <div className="absolute bg-[#1a1a1a] border border-[#1a1a1a] border-solid h-[7px] left-[352px] rounded-[1px] top-[24.5px] w-[16px]" data-name="Rectangle" />
      <InputArea />
      <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] left-[22px] not-italic text-[#2a2a2a] text-[32px] top-[56px] whitespace-nowrap">‹</p>
      <p className="absolute font-['SUIT:ExtraBold',sans-serif] leading-[normal] left-[163.5px] not-italic text-[#2a2a2a] text-[17px] top-[69px] tracking-[-0.34px] whitespace-nowrap">질문 작성</p>
      <CtaSendMyWorry />
      <MenuBar />
    </div>
  );
}