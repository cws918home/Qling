import svgPaths from "./svg-t8hfqjmymz";

function EyesContainer() {
  return (
    <div className="absolute h-[74.98px] left-[149px] top-[351px] w-[95px]" data-name="Eyes container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 95 74.9796">
        <g id="Eyes container">
          <path d={svgPaths.p37db1900} fill="var(--fill-0, #FFF5EB)" id="Ellipse" />
          <g id="Mask group">
            <mask height="75" id="mask0_3_142" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="45" x="0" y="0">
              <path d={svgPaths.p135b3ef0} fill="var(--fill-0, #FFF5EB)" id="Ellipse_2" />
            </mask>
            <g mask="url(#mask0_3_142)">
              <path d={svgPaths.pc436300} fill="var(--fill-0, #1A1A1A)" id="Ellipse_3" />
            </g>
          </g>
          <g id="Mask group_2">
            <mask height="75" id="mask1_3_142" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="45" x="0" y="0">
              <path d={svgPaths.p135b3ef0} fill="var(--fill-0, #FFF5EB)" id="Ellipse_4" />
            </mask>
            <g mask="url(#mask1_3_142)">
              <path d={svgPaths.pc436300} fill="var(--fill-0, #1A1A1A)" id="Ellipse_5" />
            </g>
          </g>
          <g id="Mask group_3">
            <mask height="75" id="mask2_3_142" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="45" x="0" y="0">
              <path d={svgPaths.p135b3ef0} fill="var(--fill-0, #FFF5EB)" id="Ellipse_6" />
            </mask>
            <g mask="url(#mask2_3_142)">
              <path d={svgPaths.pc436300} fill="var(--fill-0, #1A1A1A)" id="Ellipse_7" />
            </g>
          </g>
          <path d={svgPaths.p3d56be00} fill="var(--fill-0, #FFF5EB)" id="Ellipse_8" />
          <g id="Mask group_4">
            <mask height="75" id="mask3_3_142" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="45" x="50" y="0">
              <path d={svgPaths.pceac600} fill="var(--fill-0, #FFF5EB)" id="Ellipse_9" />
            </mask>
            <g mask="url(#mask3_3_142)">
              <path d={svgPaths.p2082a9f0} fill="var(--fill-0, #1A1A1A)" id="Ellipse_10" />
            </g>
          </g>
          <g id="Mask group_5">
            <mask height="75" id="mask4_3_142" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="45" x="50" y="0">
              <path d={svgPaths.pceac600} fill="var(--fill-0, #FFF5EB)" id="Ellipse_11" />
            </mask>
            <g mask="url(#mask4_3_142)">
              <path d={svgPaths.p2082a9f0} fill="var(--fill-0, #1A1A1A)" id="Ellipse_12" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="absolute contents left-[150px] top-[702px]" data-name="Button">
      <p className="absolute font-['SUIT:Heavy',sans-serif] leading-[normal] left-[150px] not-italic text-[#fff5eb] text-[30px] top-[702px] tracking-[1.2px] whitespace-nowrap">{` Qling`}</p>
    </div>
  );
}

export default function Component() {
  return (
    <div className="bg-[#ff8b3d] relative size-full" data-name="로딩화면">
      <EyesContainer />
      <Button />
      <div className="absolute left-[177px] size-[40px] top-[457px]" data-name="Circular-indeterminate progress indicator">
        <div className="absolute flex inset-[52.65%_0.66%_0.02%_63.31%] items-center justify-center" style={{ containerType: "size" }}>
          <div className="flex-none h-[hypot(-79.3071cqw,-10.6472cqh)] rotate-100 w-[hypot(-20.6929cqw,89.3528cqh)]">
            <div className="relative size-full" data-name="Active indicator">
              <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17.1763 11.6075">
                <path clipRule="evenodd" d={svgPaths.p20db8e00} fill="var(--fill-0, #D4BE91)" fillRule="evenodd" id="Active indicator" />
              </svg>
            </div>
          </div>
        </div>
        <div className="absolute flex inset-[-7.83%_-5.34%_-7.56%_-7.84%] items-center justify-center" style={{ containerType: "size" }}>
          <div className="flex-none h-[hypot(-84.656cqw,-14.642cqh)] rotate-100 w-[hypot(-15.344cqw,85.358cqh)]">
            <div className="relative size-full" data-name="Track">
              <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 40.0038 38.9169">
                <path clipRule="evenodd" d={svgPaths.p1133e400} fill="var(--fill-0, #FFE4CC)" fillRule="evenodd" id="Track" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}