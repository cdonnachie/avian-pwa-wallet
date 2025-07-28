'use client';

import dynamic from 'next/dynamic';

const ElectrumManagerComponent = dynamic(() => import('@/components/ElectrumManager'), {
  ssr: false,
});

export default function ElectrumManagerWrapper() {
  return <ElectrumManagerComponent />;
}
