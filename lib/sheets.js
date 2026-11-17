import path from 'path';
import fs from 'fs';

const SHEET_IDS = {
  products: process.env.GOOGLE_SHEET_PRODUCTS_ID || '1vWSe1-GsTXi9lXrLyEEee0q3QXgtspepO6JWD0DNiPk',
  orders: process.env.GOOGLE_SHEET_ORDERS_ID || '1xl3LS8xbNuJMGssg5UD89CSbHdnh2FBYMU3on4DI-U0',
  bankDetails: process.env.GOOGLE_SHEET_BANK_ID || '1Ic0mnXGUEDYoGA5JRoOO3Ofk9NYpa9gJKw-HmzCJfzw'
};

// In-memory cache for fast response and fallback
let localOrdersState = null;
let localInteractionsLog = [];

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  
  // Parse header
  const headers = parseCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCsvLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = values[idx] !== undefined ? values[idx].trim() : '';
    });
    rows.push(obj);
  }
  return rows;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.replace(/^"|"$/g, ''));
  return result;
}

/**
 * Fetch products from Google Sheets
 */
export async function getProducts() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_IDS.products}/export?format=csv`;
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const csv = await res.text();
      return parseCsv(csv);
    }
  } catch (err) {
    console.error('Error fetching products from Google Sheets:', err);
  }
  return [];
}

/**
 * Fetch orders from Google Sheets
 */
export async function getOrders() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_IDS.orders}/export?format=csv`;
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const csv = await res.text();
      const remoteOrders = parseCsv(csv);
      if (!localOrdersState) {
        localOrdersState = remoteOrders;
      }
      return localOrdersState;
    }
  } catch (err) {
    console.error('Error fetching orders from Google Sheets:', err);
  }
  return localOrdersState || [];
}

/**
 * Find order by order_id
 */
export async function findOrder(orderId) {
  const orders = await getOrders();
  const normalizedId = orderId.toUpperCase().trim();
  return orders.find(o => o.order_id && o.order_id.toUpperCase().trim() === normalizedId) || null;
}

/**
 * Update order refund status
 */
export async function updateOrderStatus(orderId, newStatus) {
  const orders = await getOrders();
  const normalizedId = orderId.toUpperCase().trim();
  const order = orders.find(o => o.order_id && o.order_id.toUpperCase().trim() === normalizedId);
  
  if (order) {
    order.Status = newStatus;
  }

  // Attempt to write via Google Sheets API if Service Account is configured
  try {
    await appendToGoogleSheet(SHEET_IDS.bankDetails, [
      normalizedId,
      order ? order.customer : 'Unknown',
      order ? (order.product || order['Model Name']) : 'N/A',
      newStatus,
      new Date().toISOString()
    ]);
  } catch (err) {
    console.log('Logged status update locally:', normalizedId, newStatus);
  }

  return order;
}

/**
 * Log customer interaction
 */
export async function logInteraction(logData) {
  localInteractionsLog.push({
    timestamp: new Date().toISOString(),
    ...logData
  });
  return true;
}

/**
 * Helper to append row to Google Sheets via Service Account (if credentials present)
 */
async function appendToGoogleSheet(spreadsheetId, rowValues) {
  try {
    const { google } = await import('googleapis');
    let auth = null;

    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      try {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
      } catch (e) {
        console.warn('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', e.message);
      }
    }

    if (!auth) {
      const credsPath = path.join(process.cwd(), 'project-4a645cc9-a149-40e1-805-c5deaee41f91.json');
      if (fs.existsSync(credsPath)) {
        auth = new google.auth.GoogleAuth({
          keyFile: credsPath,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
      }
    }

    if (!auth) return;

    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowValues]
      }
    });
  } catch (err) {
    // Silently fall back if service account does not have write access to public sheet
    console.log('Google Sheets API note:', err.message);
  }
}
