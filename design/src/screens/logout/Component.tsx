import svgPaths from "./svg-1ljshgtind";

function ProfileImageContainer() {
  return (
    <div className="absolute h-[26.34px] left-[24px] top-[12px] w-[33.116px]" data-name="Profile image container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 33.1161 26.3397">
        <g id="Profile image container">
          <path d={svgPaths.p210bfa00} fill="var(--fill-0, #FFF5EB)" id="Ellipse" />
          <g id="Mask group">
            <mask height="27" id="mask0_3_286" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="16" x="0" y="0">
              <path d={svgPaths.pc94fd00} fill="var(--fill-0, #FFF5EB)" id="Ellipse_2" />
            </mask>
            <g mask="url(#mask0_3_286)">
              <path d={svgPaths.pab18a00} fill="var(--fill-0, #1A1A1A)" id="Ellipse_3" />
            </g>
          </g>
          <g id="Mask group_2">
            <mask height="27" id="mask1_3_286" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="16" x="0" y="0">
              <path d={svgPaths.pc94fd00} fill="var(--fill-0, #FFF5EB)" id="Ellipse_4" />
            </mask>
            <g mask="url(#mask1_3_286)">
              <path d={svgPaths.pab18a00} fill="var(--fill-0, #1A1A1A)" id="Ellipse_5" />
            </g>
          </g>
          <g id="Mask group_3">
            <mask height="27" id="mask2_3_286" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="16" x="0" y="0">
              <path d={svgPaths.pc94fd00} fill="var(--fill-0, #FFF5EB)" id="Ellipse_6" />
            </mask>
            <g mask="url(#mask2_3_286)">
              <path d={svgPaths.pab18a00} fill="var(--fill-0, #1A1A1A)" id="Ellipse_7" />
            </g>
          </g>
          <path d={svgPaths.p1df7a800} fill="var(--fill-0, #FFF5EB)" id="Ellipse_8" />
          <g id="Mask group_4">
            <mask height="27" id="mask3_3_286" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="17" x="17" y="0">
              <path d={svgPaths.p1c90a780} fill="var(--fill-0, #FFF5EB)" id="Ellipse_9" />
            </mask>
            <g mask="url(#mask3_3_286)">
              <path d={svgPaths.p4179200} fill="var(--fill-0, #1A1A1A)" id="Ellipse_10" />
            </g>
          </g>
          <g id="Mask group_5">
            <mask height="27" id="mask4_3_286" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="17" x="17" y="0">
              <path d={svgPaths.p1c90a780} fill="var(--fill-0, #FFF5EB)" id="Ellipse_11" />
            </mask>
            <g mask="url(#mask4_3_286)">
              <path d={svgPaths.p4179200} fill="var(--fill-0, #1A1A1A)" id="Ellipse_12" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

function Frame() {
  return (
    <div className="absolute bg-[#ff8b0d] left-[17px] overflow-clip rounded-[32px] size-[64px] top-[15px]" data-name="Frame">
      <ProfileImageContainer />
    </div>
  );
}

function ProfileCard() {
  return (
    <div className="absolute bg-white h-[93px] left-[20px] overflow-clip rounded-[24px] top-[132px] w-[353px]" data-name="Profile Card">
      <Frame />
      <p className="absolute font-['SUIT:ExtraBold',sans-serif] leading-[normal] left-[100px] not-italic text-[#1a1a1e] text-[18px] top-[23px] tracking-[-0.18px] whitespace-nowrap">라미</p>
      <p className="absolute font-['Inter:Bold',sans-serif] font-bold leading-[normal] left-[100px] not-italic text-[#ea4335] text-[14px] top-[53px] whitespace-nowrap">♥</p>
      <p className="absolute font-['SUIT:Bold',sans-serif] leading-[normal] left-[116px] not-italic text-[#1a1a1e] text-[13px] top-[54px] tracking-[-0.39px] whitespace-nowrap">314</p>
      <p className="absolute font-['SUIT:Bold',sans-serif] leading-[normal] left-[147px] not-italic text-[#7a7a7e] text-[11px] top-[56px] tracking-[-0.33px] whitespace-nowrap">받은 하트</p>
      <p className="absolute font-['SUIT:Bold',sans-serif] leading-[normal] left-[256px] not-italic text-[#7a7a7e] text-[12px] top-[26px] tracking-[-0.36px] whitespace-nowrap">{`관심분야 수정 >`}</p>
    </div>
  );
}

function Frame1() {
  return (
    <div className="absolute bg-[#ffe4cc] h-[22px] left-[18px] overflow-clip rounded-[999px] top-[16px] w-[42px]" data-name="Frame">
      <p className="absolute font-['Inter:Bold','Noto_Sans_KR:Bold',sans-serif] font-bold leading-[normal] left-[10.5px] not-italic text-[#c45614] text-[11px] top-[4.5px] whitespace-nowrap">학업</p>
    </div>
  );
}

function Ans() {
  return (
    <div className="absolute bg-white h-[86px] left-[20px] overflow-clip rounded-[18px] top-[302px] w-[353px]" data-name="Ans - 학업">
      <Frame1 />
      <p className="absolute font-['Inter:Bold','Noto_Sans_KR:Bold',sans-serif] font-bold leading-[normal] left-[68px] not-italic text-[#9a9aa0] text-[12px] top-[20px] whitespace-nowrap">9월 24일</p>
      <p className="absolute font-['SUIT:SemiBold',sans-serif] h-[36px] leading-[1.45] left-[18px] not-italic text-[#1a1a1e] text-[13px] top-[49px] tracking-[-0.52px] w-[305px]">{`"누구나 그런 시기가 있는 것 같아요. 저도 비슷한 경험이..."`}</p>
    </div>
  );
}

function Frame2() {
  return (
    <div className="absolute bg-[#ffe4cc] h-[22px] left-[18px] overflow-clip rounded-[999px] top-[16px] w-[42px]" data-name="Frame">
      <p className="absolute font-['Inter:Bold','Noto_Sans_KR:Bold',sans-serif] font-bold leading-[normal] left-[10.5px] not-italic text-[#c45614] text-[11px] top-[4.5px] whitespace-nowrap">진로</p>
    </div>
  );
}

function Ans1() {
  return (
    <div className="absolute bg-white h-[86px] left-[20px] overflow-clip rounded-[18px] top-[400px] w-[353px]" data-name="Ans - 진로">
      <Frame2 />
      <p className="absolute font-['Inter:Bold','Noto_Sans_KR:Bold',sans-serif] font-bold leading-[normal] left-[68px] not-italic text-[#9a9aa0] text-[12px] top-[20px] whitespace-nowrap">9월 20일</p>
      <p className="absolute font-['SUIT:SemiBold',sans-serif] h-[36px] leading-[1.45] left-[18px] not-italic text-[#1a1a1e] text-[13px] top-[49px] tracking-[-0.52px] w-[305px]">{`"자신이 무엇을 좋아하는지 천천히 찾아가는 과정도..."`}</p>
    </div>
  );
}

function Component1() {
  return (
    <div className="absolute left-[20px] size-[24px] top-[12px]" data-name="알림 설정 아이콘">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="ìë¦¼ ì¤ì  ìì´ì½">
          <path d={svgPaths.p2275ba10} id="Vector" stroke="var(--stroke-0, #5A5C62)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.pcf0ba88} id="Vector_2" stroke="var(--stroke-0, #5A5C62)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Component2() {
  return (
    <div className="absolute left-[20px] size-[24px] top-[60px]" data-name="개인정보 처리방침 아이콘">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="ê°ì¸ì ë³´ ì²ë¦¬ë°©ì¹¨ ìì´ì½">
          <path d={svgPaths.p2e91c880} id="Vector" stroke="var(--stroke-0, #5A5C62)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame3() {
  return (
    <div className="absolute left-[323px] size-[18px] top-[63px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="Frame">
          <path d="M6.75 13.5L11.25 9L6.75 4.5" id="Vector" stroke="var(--stroke-0, #C0C2C8)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
}

function Component3() {
  return (
    <div className="absolute left-[20px] size-[24px] top-[108px]" data-name="로그아웃 아이콘">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="ë¡ê·¸ìì ìì´ì½">
          <path d={svgPaths.p29914600} id="Vector" stroke="var(--stroke-0, #5A5C62)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d="M16 17L21 12L16 7" id="Vector_2" stroke="var(--stroke-0, #5A5C62)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d="M21 12H9" id="Vector_3" stroke="var(--stroke-0, #5A5C62)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame4() {
  return (
    <div className="absolute left-[323px] size-[18px] top-[111px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="Frame">
          <path d="M6.75 13.5L11.25 9L6.75 4.5" id="Vector" stroke="var(--stroke-0, #C0C2C8)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
}

function Component4() {
  return (
    <div className="absolute left-[20px] size-[24px] top-[156px]" data-name="회원 탈퇴 아이콘">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="íì íí´ ìì´ì½">
          <path d={svgPaths.p1d820380} id="Vector" stroke="var(--stroke-0, #EA4335)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p161d4800} id="Vector_2" stroke="var(--stroke-0, #EA4335)" strokeWidth="2" />
          <path d="M17 8L22 13" id="Vector_3" stroke="var(--stroke-0, #EA4335)" strokeLinecap="round" strokeWidth="2" />
          <path d="M22 8L17 13" id="Vector_4" stroke="var(--stroke-0, #EA4335)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame5() {
  return (
    <div className="absolute left-[323px] size-[18px] top-[159px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="Frame">
          <path d="M6.75 13.5L11.25 9L6.75 4.5" id="Vector" stroke="var(--stroke-0, #C0C2C8)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
}

function SettingsCard() {
  return (
    <div className="absolute bg-white h-[192px] left-[20px] overflow-clip rounded-[18px] top-[544px] w-[353px]" data-name="Settings Card">
      <Component1 />
      <p className="absolute font-['SUIT:SemiBold',sans-serif] leading-[normal] left-[56px] not-italic text-[#1a1a1e] text-[15px] top-[15px] tracking-[-0.6px] whitespace-nowrap">알림 설정</p>
      <div className="absolute bg-[#f0f0f2] h-px left-[24px] top-[48px] w-[305px]" data-name="Rectangle" />
      <Component2 />
      <p className="absolute font-['SUIT:SemiBold',sans-serif] leading-[normal] left-[56px] not-italic text-[#1a1a1e] text-[15px] top-[63px] tracking-[-0.6px] whitespace-nowrap">개인정보 처리방침</p>
      <Frame3 />
      <div className="absolute bg-[#f0f0f2] h-px left-[24px] top-[96px] w-[305px]" data-name="Rectangle" />
      <Component3 />
      <p className="absolute font-['SUIT:SemiBold',sans-serif] leading-[normal] left-[56px] not-italic text-[#1a1a1e] text-[15px] top-[111px] tracking-[-0.6px] whitespace-nowrap">로그아웃</p>
      <Frame4 />
      <div className="absolute bg-[#f0f0f2] h-px left-[24px] top-[144px] w-[305px]" data-name="Rectangle" />
      <Component4 />
      <p className="absolute font-['SUIT:SemiBold',sans-serif] leading-[normal] left-[56px] not-italic text-[#ea4335] text-[15px] top-[159px] tracking-[-0.6px] whitespace-nowrap">회원 탈퇴</p>
      <Frame5 />
    </div>
  );
}

function BottomBarContainer() {
  return (
    <div className="absolute h-[101px] left-[-8px] top-[751px] w-[410px]" data-name="Bottom bar container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 410 101">
        <g id="Bottom bar container">
          <rect fill="var(--fill-0, #FFF5EB)" height="88" id="Middle button container" rx="37" width="107.439" x="148.942" />
          <path d="M0 29H410V101H0V29Z" fill="var(--fill-0, #FFF5EB)" id="Rectangle 2" />
          <rect fill="var(--fill-0, #FF8B3D)" height="59" id="Middle button" rx="29" width="89.5324" x="157.424" y="9" />
          <g id="Bottom center icon container">
            <path d={svgPaths.p1c4ab120} fill="var(--fill-0, #FFF5EB)" id="Ellipse" />
            <g id="Mask group">
              <mask height="26" id="mask0_3_253" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="16" x="186" y="24">
                <path d={svgPaths.p3db49880} fill="var(--fill-0, #FFF5EB)" id="Ellipse_2" stroke="var(--stroke-0, black)" strokeWidth="2" />
              </mask>
              <g mask="url(#mask0_3_253)">
                <path d={svgPaths.p28531c40} fill="var(--fill-0, #1A1A1A)" id="Ellipse_3" />
              </g>
            </g>
            <path d={svgPaths.p39cc3000} fill="var(--fill-0, #FFF5EB)" id="Ellipse_4" />
            <g id="Mask group_2">
              <mask height="26" id="mask1_3_253" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="17" x="204" y="24">
                <path d={svgPaths.p37d13d80} fill="var(--fill-0, #FFF5EB)" id="Ellipse_5" />
              </mask>
              <g mask="url(#mask1_3_253)">
                <path d={svgPaths.p208b2d00} fill="var(--fill-0, #1A1A1A)" id="Ellipse_6" />
              </g>
            </g>
            <g id="Mask group_3">
              <mask height="26" id="mask2_3_253" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="17" x="204" y="24">
                <path d={svgPaths.p37d13d80} fill="var(--fill-0, #FFF5EB)" id="Ellipse_7" />
              </mask>
              <g mask="url(#mask2_3_253)">
                <path d={svgPaths.p208b2d00} fill="var(--fill-0, #1A1A1A)" id="Ellipse_8" />
              </g>
            </g>
            <g id="Mask group_4">
              <mask height="26" id="mask3_3_253" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="17" x="204" y="24">
                <path d={svgPaths.p37d13d80} fill="var(--fill-0, #FFF5EB)" id="Ellipse_9" />
              </mask>
              <g mask="url(#mask3_3_253)">
                <path d={svgPaths.p208b2d00} fill="var(--fill-0, #1A1A1A)" id="Ellipse_10" />
              </g>
            </g>
          </g>
          <rect fill="var(--fill-0, #FAE5D7)" height="36" id="Bottom left button" rx="7" width="109.324" x="32.0791" y="37" />
          <rect fill="var(--fill-0, #FAE5D7)" height="36" id="Bottom right button" rx="7" width="109.324" x="263.921" y="37" />
          <path d={svgPaths.p2b900100} fill="var(--fill-0, #FF8B3D)" id="Vector" />
          <path d={svgPaths.p24e0cb00} fill="var(--fill-0, #FF8B3D)" id="Vector_2" />
        </g>
      </svg>
    </div>
  );
}

function Component6() {
  return (
    <div className="absolute bg-[#ff8b3d] h-[52px] left-[24px] overflow-clip rounded-[12px] top-[159px] w-[147px]" data-name="당첨 결과 알림 받기">
      <p className="absolute font-['SUIT:Bold',sans-serif] leading-[normal] left-[48px] not-italic text-[15px] text-white top-[16px] tracking-[-0.15px] whitespace-nowrap">로그아웃</p>
    </div>
  );
}

function Component7() {
  return (
    <div className="absolute border border-[#b8b8b8] border-solid h-[52px] left-[183px] overflow-clip rounded-[12px] top-[159px] w-[99px]" data-name="당첨 결과 알림 받기">
      <p className="absolute font-['SUIT:Bold',sans-serif] leading-[normal] left-[35px] not-italic text-[#b8b8b8] text-[15px] top-[15px] tracking-[-0.15px] whitespace-nowrap">취소</p>
    </div>
  );
}

function Component5() {
  return (
    <div className="absolute bg-white drop-shadow-[0px_12px_20px_rgba(0,0,0,0.18)] h-[233px] left-[42px] rounded-[24px] top-[246px] w-[310px]" data-name="응모 완료 모달">
      <p className="absolute font-['SUIT:ExtraBold',sans-serif] leading-[normal] left-[53px] not-italic text-[#1a1a1e] text-[24px] top-[58px] tracking-[-0.48px] whitespace-nowrap">로그아웃 하실건가요?</p>
      <p className="-translate-x-1/2 absolute font-['SUIT:Bold',sans-serif] leading-[1.5] left-[155px] not-italic text-[#6e7076] text-[14px] text-center top-[103px] tracking-[-0.14px] w-[262px]">다시 큐링에 들어오시려면 재로그인이 필요해요</p>
      <Component6 />
      <Component7 />
    </div>
  );
}

export default function Component() {
  return (
    <div className="bg-[#ff8b0d] relative size-full" data-name="로그아웃">
      <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] left-[30px] not-italic text-[16px] text-white top-[18px] whitespace-nowrap">9:41</p>
      <div className="absolute bg-white h-[4px] left-[295px] rounded-[0.5px] top-[28px] w-[3px]" data-name="Rectangle" />
      <div className="absolute bg-white h-[6px] left-[300px] rounded-[0.5px] top-[26px] w-[3px]" data-name="Rectangle" />
      <div className="absolute bg-white h-[8px] left-[305px] rounded-[0.5px] top-[24px] w-[3px]" data-name="Rectangle" />
      <div className="absolute bg-white h-[10px] left-[310px] rounded-[0.5px] top-[22px] w-[3px]" data-name="Rectangle" />
      <div className="absolute border-[1.5px] border-solid border-white h-[12px] left-[350px] rounded-[3px] top-[22px] w-[26px]" data-name="Rectangle" />
      <div className="absolute bg-white h-[6px] left-[377px] rounded-[1px] top-[25px] w-[2px]" data-name="Rectangle" />
      <div className="absolute bg-white h-[7px] left-[352px] rounded-[1px] top-[24.5px] w-[16px]" data-name="Rectangle" />
      <ProfileCard />
      <p className="absolute font-['SUIT:ExtraBold',sans-serif] leading-[normal] left-[24px] not-italic text-[16px] text-white top-[270px] tracking-[-0.16px] whitespace-nowrap">내가 쓴 답변</p>
      <p className="absolute font-['SUIT:ExtraBold',sans-serif] leading-[normal] left-[20px] not-italic text-[16px] text-white top-[511px] tracking-[-0.16px] whitespace-nowrap">설정</p>
      <p className="absolute font-['SUIT:Bold','Noto_Sans:Bold',sans-serif] leading-[normal] left-[312px] opacity-90 text-[13px] text-white top-[274px] whitespace-nowrap" style={{ fontVariationSettings: "'CTGR' 0, 'wdth' 100, 'wght' 700" }}>
        전체보기 ›
      </p>
      <Ans />
      <Ans1 />
      <SettingsCard />
      <div className="absolute bg-[#1a1a1e] h-[5px] left-[129.5px] rounded-[3px] top-[838px] w-[134px]" data-name="Rectangle" />
      <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] left-[22px] not-italic text-[#2a2a2a] text-[32px] top-[56px] whitespace-nowrap">‹</p>
      <p className="absolute font-['SUIT:ExtraBold',sans-serif] leading-[normal] left-[165.5px] not-italic text-[#2a2a2a] text-[17px] top-[69px] tracking-[-0.34px] whitespace-nowrap">마이페이지</p>
      <BottomBarContainer />
      <div className="absolute h-[852px] left-0 top-0 w-[393px]" data-name="Rectangle">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 393 852">
          <path d="M0 0H393V852H0V0Z" fill="var(--fill-0, black)" id="Rectangle" opacity="0.32" />
        </svg>
      </div>
      <Component5 />
    </div>
  );
}