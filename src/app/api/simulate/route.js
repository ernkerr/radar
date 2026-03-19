import { NextResponse } from 'next/server';
import { simulateIncomingRegulationEvent } from '@/lib/complianceEngine';

function runSimulation() {
  const result = simulateIncomingRegulationEvent();
  return NextResponse.json(result);
}

export async function POST() {
  return runSimulation();
}

export async function GET(request) {
  const url = new URL(request.url);

  if (url.searchParams.get('trigger') === '1') {
    return runSimulation();
  }

  return NextResponse.json({
    message: 'Use /api/simulate?trigger=1 to create a new incoming event.'
  });
}
