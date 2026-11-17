import { NextResponse } from 'next/server';
import { processCustomerMessage } from '@/lib/agent';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, history, customerEmail } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const result = await processCustomerMessage({
      message,
      history: history || [],
      customerEmail
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error in /api/chat:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request.', details: error.message },
      { status: 500 }
    );
  }
}
