'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  User,
  ShoppingBag,
  FileText,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Search,
  Mail,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Hello! I'm your TechMart AI Support Agent.\n\nI can assist you with:\n• **Product specs, stock & pricing** (from live Google Sheets)\n• **Order status & delivery tracking**\n• **Refund evaluations** against our company policy document\n• **Automated confirmation emails** upon refund approval\n\nHow can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load products & orders on tab switch
  useEffect(() => {
    if (activeTab === 'products' && products.length === 0) {
      loadProducts();
    }
    if (activeTab === 'orders' && orders.length === 0) {
      loadOrders();
    }
  }, [activeTab]);

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.products) setProducts(data.products);
    } catch (e) {
      console.error(e);
    } finally {
      setProductsLoading(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
    } catch (e) {
      console.error(e);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages,
          customerEmail: customerEmail.trim() || undefined
        })
      });

      const data = await res.json();
      const botMsg = {
        role: 'assistant',
        content: data.reply || "I'm sorry, I couldn't process that request right now.",
        refundAction: data.refundAction,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);

      // If a refund was processed, refresh orders in the background
      if (data.refundAction?.status === 'approved') {
        loadOrders();
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, a network error occurred while connecting to the agent.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    'What laptops do you offer under $500?',
    'What is your policy on electronic returns?',
    'Please check the status of order ORD-101',
    'I would like to request a refund for order ORD-103',
    'Can I return order ORD-102 (purchased 18 days ago)?'
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-lg text-white flex items-center gap-2">
              TechMart AI Support Agent
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Live Next.js Capstone
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Synced with Word Policy (.docx) • Google Sheets API • Automated Email Engine
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            AI Chat Support
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'products'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Products Sheet
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Orders & Refunds
          </button>
          <button
            onClick={() => setActiveTab('policy')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'policy'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Policy (.docx)
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* TAB 1: AI Chat Support */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-4 h-full">
            {/* Quick Actions */}
            <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
              <span className="text-slate-500 font-medium whitespace-nowrap flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Quick Suggestions:
              </span>
              {samplePrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Chat Message Stream */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 text-white shadow">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-slate-800/90 text-slate-100 border border-slate-700 rounded-tl-none'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Refund Banner Indicator */}
                    {msg.refundAction && (
                      <div className="mt-3 pt-3 border-t border-slate-700/60 text-xs">
                        {msg.refundAction.status === 'approved' ? (
                          <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-xl p-3 text-emerald-200">
                            <div className="flex items-center gap-2 font-semibold text-emerald-400 mb-1">
                              <CheckCircle className="h-4 w-4 text-emerald-400" />
                              Automated Refund Approved & Dispatched
                            </div>
                            <p className="text-[11px] text-emerald-300/80">
                              Order <strong>{msg.refundAction.order?.order_id}</strong> was eligible (
                              {msg.refundAction.daysAgo} days ago ≤ {msg.refundAction.maxAllowedDays}-day policy).
                              Status updated in Google Sheets.
                            </p>
                            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-900/40 px-2 py-1 rounded">
                              <Mail className="h-3 w-3" />
                              Confirmation email triggered to customer inbox.
                            </div>
                          </div>
                        ) : msg.refundAction.status === 'rejected' ? (
                          <div className="bg-rose-950/60 border border-rose-500/30 rounded-xl p-3 text-rose-200">
                            <div className="flex items-center gap-2 font-semibold text-rose-400 mb-1">
                              <XCircle className="h-4 w-4 text-rose-400" />
                              Refund Policy Rejection
                            </div>
                            <p className="text-[11px] text-rose-300/80">
                              Order <strong>{msg.refundAction.order?.order_id}</strong> was purchased{' '}
                              <strong>{msg.refundAction.daysAgo} days ago</strong>, which exceeds our{' '}
                              {msg.refundAction.maxAllowedDays}-day policy limit.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )}

                    <div
                      className={`text-[10px] mt-1.5 text-right ${
                        msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="h-8 w-8 rounded-lg bg-slate-700 flex items-center justify-center shrink-0 text-white">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-slate-300 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce"></span>
                    <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.4s]"></span>
                    <span className="text-xs text-slate-400 ml-1">
                      Querying Google Sheets & Company Policy...
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="mt-3 border border-slate-800 rounded-xl bg-slate-950 p-2 shadow-xl">
              <div className="flex items-center gap-2 mb-2 px-1">
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Customer Email for confirmation (e.g., john@example.com)"
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 w-full max-w-sm"
                />
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  Optional: Used for automated refund receipts
                </span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about product pricing, order status (ORD-101), or request a refund..."
                  className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition flex items-center gap-1.5 shadow"
                >
                  <Send className="h-4 w-4" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: Products Sheet Viewer */}
        {activeTab === 'products' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-6xl w-full mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-blue-400" />
                  Google Sheets: Products Catalog
                </h2>
                <p className="text-xs text-slate-400">
                  Live products, specifications, inventory stock, and pricing retrieved from Google Sheets.
                </p>
              </div>
              <button
                onClick={loadProducts}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 border border-slate-700"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${productsLoading ? 'animate-spin' : ''}`} />
                Sync Sheet
              </button>
            </div>

            {productsLoading ? (
              <div className="p-8 text-center text-slate-400">Loading products from Google Sheets...</div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="p-3">Category</th>
                      <th className="p-3">Brand</th>
                      <th className="p-3">Model Name</th>
                      <th className="p-3">Key Specifications</th>
                      <th className="p-3">Best For</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {products.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-900/50">
                        <td className="p-3 font-medium text-blue-400">{p.Category}</td>
                        <td className="p-3">{p.Brand}</td>
                        <td className="p-3 font-semibold text-white">{p['Model Name']}</td>
                        <td className="p-3 max-w-xs truncate text-slate-400">{p['Key Specifications']}</td>
                        <td className="p-3 text-slate-400">{p['Best For']}</td>
                        <td className="p-3 font-medium text-emerald-400">${p.price}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              parseInt(p.stock) > 0
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {p.stock} units
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Orders & Refunds Viewer */}
        {activeTab === 'orders' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-6xl w-full mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-indigo-400" />
                  Google Sheets: Orders & Refund Tracking
                </h2>
                <p className="text-xs text-slate-400">
                  Live orders database. The AI evaluates refund eligibility based on <code>days_ago</code> and category policy.
                </p>
              </div>
              <button
                onClick={loadOrders}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 border border-slate-700"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
                Sync Orders
              </button>
            </div>

            {ordersLoading ? (
              <div className="p-8 text-center text-slate-400">Loading orders from Google Sheets...</div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Days Ago</th>
                      <th className="p-3">Policy Eligibility</th>
                      <th className="p-3">Current Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {orders.map((o, i) => {
                      const days = parseInt(o.days_ago || '0');
                      const isElec = ['laptop', 'phone', 'tablet', 'electronics', 'headphones'].some((c) =>
                        (o.category || '').toLowerCase().includes(c)
                      );
                      const maxDays = isElec ? 15 : 30;
                      const eligible = days <= maxDays;

                      return (
                        <tr key={i} className="hover:bg-slate-900/50">
                          <td className="p-3 font-mono font-bold text-white">{o.order_id}</td>
                          <td className="p-3">{o.customer}</td>
                          <td className="p-3 text-slate-200">{o['Model Name'] || o.product}</td>
                          <td className="p-3 text-slate-400 capitalize">{o.category}</td>
                          <td className="p-3 font-mono">{o.days_ago} days</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                eligible
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {eligible ? `Eligible (≤ ${maxDays}d)` : `Expired (> ${maxDays}d)`}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                                o.Status === 'Return Approved'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {o.Status || 'Active / Delivered'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Policy Viewer */}
        {activeTab === 'policy' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-400" />
                Company Return & Refund Policies (from .docx)
              </h2>
              <p className="text-xs text-slate-400">
                Extracted directly from <code>Company_Policy.docx</code>. The AI refers strictly to these terms when validating requests.
              </p>
            </div>

            <div className="space-y-4">
              <div className="border border-slate-800 rounded-xl bg-slate-950 p-5">
                <h3 className="font-semibold text-sm text-blue-400 mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Return Window Rules
                </h3>
                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1.5 leading-relaxed">
                  <li>
                    <strong>Standard Items</strong>: Customers may return items within <strong>30 days</strong> of purchase date.
                  </li>
                  <li>
                    <strong>Electronics</strong> (laptops, phones, tablets, headphones): Must be returned within <strong>15 days</strong>.
                  </li>
                  <li>All returned items must be unused and in original packaging with all accessories included.</li>
                  <li>Items marked as <em>"Final Sale"</em> cannot be returned or exchanged.</li>
                </ul>
              </div>

              <div className="border border-slate-800 rounded-xl bg-slate-950 p-5">
                <h3 className="font-semibold text-sm text-emerald-400 mb-2 flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Refund Processing & Disbursement
                </h3>
                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1.5 leading-relaxed">
                  <li>Refunds are processed within <strong>5 business days</strong> after approval.</li>
                  <li>Disbursements are made to the original payment method.</li>
                  <li>Credit card refunds may require 3–5 additional business days to appear on statements.</li>
                  <li>Shipping fees are non-refundable unless the return is due to a defective or wrong item.</li>
                </ul>
              </div>

              <div className="border border-slate-800 rounded-xl bg-slate-950 p-5">
                <h3 className="font-semibold text-sm text-purple-400 mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Customer Support & Dispatch
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Support hours: Monday to Friday, 9:00 AM – 6:00 PM EST. Contact: <code>support@techmart.com</code> | Phone: <code>1-800-TECHMART</code>.
                  Automated confirmation emails are dispatched immediately upon refund approval.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
