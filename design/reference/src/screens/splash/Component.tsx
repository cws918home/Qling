import svgPaths from "./svg-xg38dn5s3c";

function EyesContainer() {
  return (
    <div className="absolute h-[74.98px] left-[149px] top-[351px] w-[95px]" data-name="Eyes container">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 95 74.9796">
        <g id="Eyes container">
          <path d={svgPaths.p37db1900} fill="var(--fill-0, #FFF5EB)" id="Ellipse" />
          <g id="Mask group">
            <mask height="75" id="mask0_2_49" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="45" x="0" y="0">
              <path d={svgPaths.p135b3ef0} fill="var(--fill-0, #FFF5EB)" id="Ellipse_2" />
            </mask>
            <g mask="url(#mask0_2_49)">
              <path d={svgPaths.pc436300} fill="var(--fill-0, #1A1A1A)" id="Ellipse_3" />
            </g>
          </g>
          <g id="Mask group_2">
            <mask height="75" id="mask1_2_49" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="45" x="0" y="0">
              <path d={svgPaths.p135b3ef0} fill="var(--fill-0, #FFF5EB)" id="Ellipse_4" />
            </mask>
            <g mask="url(#mask1_2_49)">
              <path d={svgPaths.pc436300} fill="var(--fill-0, #1A1A1A)" id="Ellipse_5" />
            </g>
          </g>
          <g id="Mask group_3">
            <mask height="75" id="mask2_2_49" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="45" x="0" y="0">
              <path d={svgPaths.p135b3ef0} fill="var(--fill-0, #FFF5EB)" id="Ellipse_6" />
            </mask>
            <g mask="url(#mask2_2_49)">
              <path d={svgPaths.pc436300} fill="var(--fill-0, #1A1A1A)" id="Ellipse_7" />
            </g>
          </g>
          <path d={svgPaths.p3d56be00} fill="var(--fill-0, #FFF5EB)" id="Ellipse_8" />
          <g id="Mask group_4">
            <mask height="75" id="mask3_2_49" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="45" x="50" y="0">
              <path d={svgPaths.pceac600} fill="var(--fill-0, #FFF5EB)" id="Ellipse_9" />
            </mask>
            <g mask="url(#mask3_2_49)">
              <path d={svgPaths.p2082a9f0} fill="var(--fill-0, #1A1A1A)" id="Ellipse_10" />
            </g>
          </g>
          <g id="Mask group_5">
            <mask height="75" id="mask4_2_49" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="45" x="50" y="0">
              <path d={svgPaths.pceac600} fill="var(--fill-0, #FFF5EB)" id="Ellipse_11" />
            </mask>
            <g mask="url(#mask4_2_49)">
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

export default function Splash() {
  return (
    <div className="bg-[#ff8b3d] relative size-full" data-name="Splash">
      <EyesContainer />
      <Button />
    </div>
  );
}