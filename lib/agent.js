import { getProducts, getOrders, findOrder, updateOrderStatus, logInteraction } from './sheets.js';
import { getCompanyPolicy } from './policy.js';
import { sendRefundConfirmationEmail } from './email.js';

export async function processCustomerMessage({ message, history = [], customerEmail = null }) {
  const policyText = await getCompanyPolicy();
  const products = await getProducts();
  const orders = await getOrders();

  // Check if message is a refund request
  const refundMatch = message.match(/refund|return|money back/i);
  const orderIdMatch = message.match(/ORD-\d{3}/i) || message.match(/ORD\d{3}/i);

  let refundAction = null;

  if (refundMatch && orderIdMatch) {
    const rawId = orderIdMatch[0].toUpperCase().replace('ORD', 'ORD-').replace('--', '-');
    const order = await findOrder(rawId);

    if (order) {
      const daysAgo = parseInt(order.days_ago || '0', 10);
      const category = (order.category || '').toLowerCase();
      const isElectronic = ['laptop', 'phone', 'tablet', 'electronics', 'headphones'].some(c => category.includes(c));

      // Policy rule: Electronics <= 15 days, others <= 30 days
      const maxAllowedDays = isElectronic ? 15 : 30;
      const isEligible = daysAgo <= maxAllowedDays;

      if (isEligible) {
        // 1. Approve refund in Google Sheets
        await updateOrderStatus(order.order_id, 'Return Approved');

        // 2. Automatically dispatch confirmation email
        const emailResult = await sendRefundConfirmationEmail({
          customerEmail: customerEmail || `${order.customer.toLowerCase()}@example.com`,
          customerName: order.customer,
          orderId: order.order_id,
          productName: order['Model Name'] || order.product || 'Product',
          reason: 'Customer requested return within policy window'
        });

        // 3. Log interaction
        await logInteraction({
          orderId: order.order_id,
          customer: order.customer,
          query: message,
          action: 'Refund Approved',
          emailStatus: emailResult.mode
        });

        refundAction = {
          status: 'approved',
          order,
          daysAgo,
          maxAllowedDays,
          emailResult
        };
      } else {
        // Reject refund
        await logInteraction({
          orderId: order.order_id,
          customer: order.customer,
          query: message,
          action: 'Refund Denied (Exceeded Policy Window)'
        });

        refundAction = {
          status: 'rejected',
          order,
          daysAgo,
          maxAllowedDays,
          reason: `Order placed ${daysAgo} days ago exceeds the ${maxAllowedDays}-day policy limit.`
        };
      }
    } else {
      refundAction = {
        status: 'not_found',
        searchedId: rawId
      };
    }
  }

  // Generate AI Response using Gemini REST API
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  const productsSummary = products.map(p => 
    `- ${p.Brand} ${p['Model Name']} (${p.Category}): $${p.price} | Stock: ${p.stock} | Specs: ${p['Key Specifications']} | Best For: ${p['Best For']}`
  ).join('\n');

  const ordersSummary = orders.map(o => 
    `- Order ${o.order_id} | Customer: ${o.customer} | Product: ${o['Model Name']} (${o.category}) | Purchased: ${o.days_ago} days ago | Status: ${o.Status || 'Active'}`
  ).join('\n');

  const prompt = `
You are an intelligent, polite, and helpful AI E-Commerce Support Agent for TechMart.
You have real-time access to company policies (Word document), Google Sheets product catalog, and customer order records.

=== COMPANY POLICY (FROM .DOCX) ===
${policyText}

=== LIVE GOOGLE SHEETS PRODUCT CATALOG ===
${productsSummary}

=== LIVE GOOGLE SHEETS CUSTOMER ORDERS ===
${ordersSummary}

${refundAction ? `=== REFUND ACTION RESULT ===\n${JSON.stringify(refundAction, null, 2)}` : ''}

=== CUSTOMER MESSAGE ===
"${message}"

INSTRUCTIONS:
1. Product/Pricing Inquiries: Answer questions about product specifications, pricing, stock availability, and recommendations using the Google Sheets product catalog.
2. Order Tracking: If the customer provides an Order ID, look up their order status and details from the Google Sheets orders data.
3. Refund Requests:
   - If a refund action was evaluated above, report the result clearly:
     - If APPROVED: Congratulate the customer, confirm their refund has been initiated, and mention that an automated confirmation email has been dispatched to their email address.
     - If REJECTED: Explain politely why it is ineligible citing the exact policy (e.g., electronics must be returned within 15 days, but order was ${refundAction?.daysAgo} days ago).
     - If NOT FOUND: Ask the customer to double-check their Order ID format (e.g., ORD-101).
   - If they ask about refund policy generally, quote the return windows from the policy document.
4. Keep your tone professional, warm, concise, and helpful. Format key information with bold text or bullet points.

YOUR RESPONSE:
`;

  let replyText = '';

  if (apiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2 }
        })
      });

      if (res.ok) {
        const data = await res.json();
        replyText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      }
    } catch (err) {
      console.error('Gemini API call failed:', err);
    }
  }

  // Fallback heuristic if API key is not present or offline
  if (!replyText) {
    if (refundAction?.status === 'approved') {
      replyText = `✅ **Refund Approved!** Your return for **Order ${refundAction.order.order_id}** (${refundAction.order['Model Name']}) has been successfully processed under our policy. An automated confirmation email has been dispatched to your address.`;
    } else if (refundAction?.status === 'rejected') {
      replyText = `❌ **Refund Request Ineligible**: Under our company policy, electronics must be returned within **${refundAction.maxAllowedDays} days**. Because this order was purchased **${refundAction.daysAgo} days ago**, we cannot approve a refund.`;
    } else if (orderIdMatch) {
      const o = await findOrder(orderIdMatch[0]);
      if (o) {
        replyText = `📦 **Order ${o.order_id} Details**:\n- **Customer**: ${o.customer}\n- **Product**: ${o['Model Name']}\n- **Purchased**: ${o.days_ago} days ago\n- **Status**: ${o.Status || 'Active / Delivered'}`;
      } else {
        replyText = `I couldn't find an order matching **${orderIdMatch[0]}**. Please verify your Order ID (e.g., ORD-101).`;
      }
    } else {
      replyText = `Hello! I can assist you with product specs & pricing, tracking existing orders, or processing refunds according to our company policy. How can I help you today?`;
    }
  }

  return {
    reply: replyText,
    refundAction
  };
}
