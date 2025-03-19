// 'use client';

// import { AI } from 'ai/rsc';
// import { useState } from 'react';

// export function AIProvider({ children }: { children: React.ReactNode }) {
//   const [model, setModel] = useState<'deepseek' | 'google'>('deepseek');

//   return (
//     <AI
//       initialAIState={[]}
//       initialUIState={[]}
//       options={{
//         headers: {
//           'X-Model': model
//         }
//       }}
//     >
//       {children}
//     </AI>
//   );
// }