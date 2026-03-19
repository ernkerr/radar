import { NextResponse } from 'next/server';
import { getStateSnapshot } from '@/lib/complianceEngine';

export async function GET() {
  return NextResponse.json(getStateSnapshot());
}
