import { NextResponse } from 'next/server';
import { getEventDetail } from '@/lib/complianceEngine';

export async function GET(_request, { params }) {
  const detail = getEventDetail(params.id);

  if (!detail) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  return NextResponse.json(detail);
}
