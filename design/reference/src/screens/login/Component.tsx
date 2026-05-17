import imgImg1158 from "./af8b6098c508489c06974f60d962ea8318597f66.png";

function GoogleLoginButton() {
  return (
    <div className="absolute bg-white border border-[#dadce0] border-solid h-[47px] left-[24px] overflow-clip rounded-[28px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] top-[663px] w-[345px]" data-name="Google Login Button">
      <p className="absolute font-['SUIT:ExtraBold',sans-serif] leading-[normal] left-[116px] not-italic text-[#1a1a1a] text-[17px] top-[12px] tracking-[-0.85px] whitespace-nowrap">Google로 로그인</p>
      <div className="absolute h-[30px] left-[11px] top-[8px] w-[31px]" data-name="IMG_1158">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute h-[2840%] left-[-467.74%] max-w-none top-[-2231.36%] w-[1267.74%]" src={imgImg1158} />
        </div>
      </div>
    </div>
  );
}

export default function Component() {
  return (
    <div className="bg-[#fff1d1] relative size-full" data-name="로그인 화면">
      <div className="absolute font-['SUIT:ExtraBold',sans-serif] leading-[0] left-[29px] not-italic text-[#1a1a1a] text-[58px] top-[276px] tracking-[-2.9px] w-[244px]">
        <p className="leading-[1.3] mb-0">고민끝에</p>
        <p className="leading-[1.3]">큐링</p>
      </div>
      <div className="absolute left-[322px] size-[22px] top-[404px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 22">
          <circle cx="11" cy="11" fill="var(--fill-0, #FF8B3D)" id="Ellipse" r="11" />
        </svg>
      </div>
      <GoogleLoginButton />
      <p className="-translate-x-1/2 absolute font-['SUIT:Bold',sans-serif] leading-[18px] left-[196.5px] not-italic text-[#b8b8b8] text-[11px] text-center top-[765px] tracking-[-0.55px] w-[385px]">로그인 시 큐링의 개인정보처리방침 및 이용 약관에 동의하는 것으로 간주합니다</p>
      <div className="absolute bg-[#1a1a1a] h-[5px] left-[129.5px] rounded-[3px] top-[838px] w-[134px]" data-name="Rectangle" />
      <div className="absolute bg-[#c2c4c8] h-[2px] left-[85px] rounded-[3px] top-[563px] w-[222px]" data-name="Rectangle" />
    </div>
  );
}