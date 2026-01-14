const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');

// Find and disable the auto-capitalization useEffect
const startMarker = '  // --- TỰ ĐỘNG KẾT CHUYỂN LÃI (LOGIC NGÂN HÀNG: End - Start) ---';
const endMarker = '  const handleStatusChange = async (id: string, newStatus: TransactionStatus) => {';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

console.log('Start index:', startIdx);
console.log('End index:', endIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const before = content.substring(0, startIdx);
  const after = content.substring(endIdx);

  // Comment out the auto-capitalization for now
  const replacement = `  // --- TỰ ĐỘNG KẾT CHUYỂN LÃI - DISABLED ---
  // NOTE: This auto-capitalization feature has been disabled because it can cause
  // balance jumping issues. It runs on every bankTransactions change and can add
  // unexpected interest deposits. If needed, implement as a manual action or
  // move this logic to the backend.
  // The original code calculated monthly interest based on running balances and
  // created automatic deposit transactions for interest capitalization.

  `;

  content = before + replacement + after;
  fs.writeFileSync('App.tsx', content);
  console.log('Disabled auto-capitalization in App.tsx');
} else {
  console.log('Pattern not found');
}
