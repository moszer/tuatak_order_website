import { NextRequest, NextResponse } from 'next/server';

const GEO_BASE = 'https://geothai.fasu.dev/api';

// GET /api/geo?type=provinces
// GET /api/geo?type=districts&province_code=25
// GET /api/geo?type=subdistricts&district_code=2501
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  let url: string;
  if (type === 'provinces') {
    url = `${GEO_BASE}/provinces?limit=100`;
  } else if (type === 'districts') {
    const provinceCode = searchParams.get('province_code');
    if (!provinceCode) return NextResponse.json({ error: 'province_code required' }, { status: 400 });
    url = `${GEO_BASE}/districts?province_code=${provinceCode}&limit=200`;
  } else if (type === 'subdistricts') {
    const districtCode = searchParams.get('district_code');
    if (!districtCode) return NextResponse.json({ error: 'district_code required' }, { status: 400 });
    url = `${GEO_BASE}/subdistricts?district_code=${districtCode}&limit=200`;
  } else {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  }

  const res = await fetch(url);
  const data = await res.json();
  return NextResponse.json(data);
}
