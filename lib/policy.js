import path from 'path';
import fs from 'fs';

let cachedPolicy = null;

export async function getCompanyPolicy() {
  if (cachedPolicy) return cachedPolicy;

  const docxPath = path.join(process.cwd(), 'Company_Policy.docx');
  const txtPath = path.join(process.cwd(), 'policy.txt');

  // 1. Try reading from Word (.docx) document
  if (fs.existsSync(docxPath)) {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ path: docxPath });
      if (result.value && result.value.trim().length > 0) {
        cachedPolicy = result.value.trim();
        return cachedPolicy;
      }
    } catch (err) {
      console.warn('Mammoth docx read warning:', err.message);
    }
  }

  // 2. Fallback to policy.txt
  if (fs.existsSync(txtPath)) {
    cachedPolicy = fs.readFileSync(txtPath, 'utf8').trim();
    return cachedPolicy;
  }

  return `
COMPANY POLICY DOCUMENT
RETURN POLICY:
- Customers may return items within 30 days of the purchase date.
- Electronics such as laptops, phones, and tablets must be returned within 15 days.
- Items marked as "Final Sale" cannot be returned or exchanged.
REFUND POLICY:
- Refunds are processed within 5 business days after the returned item is received.
- Refunds are issued to the original payment method only.
SHIPPING POLICY:
- Standard shipping takes 3-5 business days ($4.99).
- Free shipping on orders above $50.
WARRANTY:
- 1-year manufacturer warranty for hardware defects.
`.trim();
}
