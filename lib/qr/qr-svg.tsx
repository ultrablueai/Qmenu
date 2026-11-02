import QRCode from "./vendor";

export default function QrSvg({ value, size = 240 }: { value: string; size?: number }) {
  const qr = new QRCode(0, 1);
  qr.addData(value);
  qr.make();
  const count = qr.getModuleCount();
  const margin = 4;
  const width = count + margin * 2;
  const cells: Array<{ x: number; y: number }> = [];
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) cells.push({x: col + margin, y: row + margin});
    }
  }
  return <svg viewBox={`0 0 ${width} ${width}`} width={size} height={size}
    role="img" aria-label="رمز QR الخاص ببطاقة العميل"
    xmlns="http://www.w3.org/2000/svg" style={{maxWidth:"100%",height:"auto",background:"white",borderRadius:12}}>
    <rect width={width} height={width} fill="#fff"/>
    <g fill="#153c42" shapeRendering="crispEdges">
      {cells.map(cell=><rect key={`${cell.y}-${cell.x}`} x={cell.x} y={cell.y} width="1" height="1"/>)}
    </g>
  </svg>;
}
