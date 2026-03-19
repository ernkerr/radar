'use client';

import { Settings, Radio } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AppNav() {
  const router = useRouter();

  return (
    <nav className="sticky top-0 z-20 bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-5 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Radio size={18} strokeWidth={1.75} className="text-black" />
          <span className="font-semibold text-sm tracking-wide">Radar</span>
        </div>
        <button
          onClick={() => router.push('/config')}
          className="text-gray-400 hover:text-black transition-colors"
          title="Configuration"
          aria-label="Configuration"
        >
          <Settings size={18} strokeWidth={1.75} />
        </button>
      </div>
    </nav>
  );
}
