import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export type SettlementReceiptPdf = {
  id: number;
  riderUserId: number;
  receiptCode: string;
  amountMinor: number;
  balanceAfterMinor: number;
  issuedAt: Date | string;
  reconciledOrderIds: number[];
};

const formatPkr = (minor: number) => `PKR ${(minor / 100).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);

export function buildSettlementReceiptHtml(receipt: SettlementReceiptPdf) {
  const issuedAt = new Date(receipt.issuedAt).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
  const orders = receipt.reconciledOrderIds.length ? receipt.reconciledOrderIds.map((orderId) => `#${orderId}`).join(", ") : "No orders recorded";
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><style>@page{margin:28px}body{font-family:Arial,sans-serif;color:#17251D;font-size:13px;line-height:1.45}.header{background:#064B2C;color:#fff;padding:20px;border-radius:14px}.eyebrow{font-size:10px;font-weight:700;letter-spacing:1px;color:#C8E1CF}.title{font-size:24px;font-weight:800;margin:6px 0 0}.card{border:1px solid #DCE6DE;border-radius:14px;padding:18px;margin-top:18px}.row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #EDF0EC}.row:last-child{border-bottom:0}.label{color:#5F6E63;font-size:11px;font-weight:700}.value{font-weight:800;text-align:right}.amount{font-size:21px;color:#064B2C}.note{margin-top:18px;color:#5F6E63;font-size:10px}.footer{margin-top:28px;padding-top:14px;border-top:1px solid #DCE6DE;color:#5F6E63;font-size:10px}</style></head><body><section class="header"><div class="eyebrow">KHANA KARLO · RIDER CASH ACCOUNT</div><div class="title">Settlement Receipt</div></section><section class="card"><div class="row"><div class="label">Receipt reference</div><div class="value">${escapeHtml(receipt.receiptCode)}</div></div><div class="row"><div class="label">Issued</div><div class="value">${escapeHtml(issuedAt)}</div></div><div class="row"><div class="label">Rider account</div><div class="value">Rider #${receipt.riderUserId}</div></div><div class="row"><div class="label">COD custody remitted</div><div class="value amount">${formatPkr(receipt.amountMinor)}</div></div><div class="row"><div class="label">Cash Account balance after remittance</div><div class="value">${formatPkr(receipt.balanceAfterMinor)}</div></div><div class="row"><div class="label">Reconciled orders</div><div class="value">${escapeHtml(orders)}</div></div></section><p class="note">This receipt is generated from the server-authoritative Rider Cash Account settlement record. Keep it for your delivery and remittance records.</p><footer class="footer">Khana KarLo Pakistan · Controlled COD pilot · ${escapeHtml(receipt.receiptCode)}</footer></body></html>`;
}

export async function downloadSettlementReceipt(receipt: SettlementReceiptPdf) {
  const html = buildSettlementReceiptHtml(receipt);
  if (Platform.OS === "web") {
    const receiptWindow = globalThis.window?.open("", "_blank", "noopener,noreferrer");
    if (!receiptWindow) throw new Error("Allow pop-ups to download this receipt.");
    receiptWindow.document.write(html);
    receiptWindow.document.close();
    receiptWindow.focus();
    globalThis.setTimeout(() => receiptWindow.print(), 200);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html, margins: { top: 28, right: 28, bottom: 28, left: 28 } });
  if (!(await Sharing.isAvailableAsync())) throw new Error("PDF sharing is not available on this device.");
  await Sharing.shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf", dialogTitle: `Settlement receipt ${receipt.receiptCode}` });
}
