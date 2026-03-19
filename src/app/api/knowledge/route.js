import { NextResponse } from 'next/server';
import { getKnowledge, updateKnowledge } from '@/lib/complianceEngine';

export async function GET() {
  return NextResponse.json(getKnowledge());
}

export async function PUT(request) {
  const payload = await request.json();
  const updated = updateKnowledge(payload || {});
  return NextResponse.json(updated);
}
