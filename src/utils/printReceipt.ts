import { Order, ShopSettings } from '../types';

export function printReceipt(order: Order, settings: ShopSettings): void {
  const iframeId = 'print-receipt-iframe';
  let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
  
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;

  const logoHtml = settings.logoUrl 
    ? `<img src="${settings.logoUrl}" alt="${settings.shopName}" style="max-height: 50px; margin-bottom: 12px; filter: grayscale(100%);">`
    : '';

  const subtotal = order.subtotal || order.items.reduce((acc, it) => acc + (it.price * it.quantity), 0);
  const shipping = order.shippingFee !== undefined ? order.shippingFee : 0;
  const tax = order.taxAmount !== undefined ? order.taxAmount : 0;
  const discount = (subtotal + shipping + tax) - order.totalAmount;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - Order #${order.id}</title>
        <style>
          @page {
            size: auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 24px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #111;
            background: #fff;
            font-size: 13px;
            line-height: 1.5;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #e2e8f0;
            padding: 40px;
            box-sizing: border-box;
            background: #fff;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #111;
            padding-bottom: 24px;
            margin-bottom: 24px;
          }

          .header-left {
            flex: 1;
          }

          .header-right {
            text-align: right;
          }

          .title {
            font-size: 22px;
            font-weight: 800;
            text-transform: uppercase;
            margin: 0;
            letter-spacing: 0.5px;
            color: #111;
          }

          .meta-info {
            display: grid;
            grid-template-columns: 1.5fr 1fr;
            gap: 24px;
            margin-bottom: 30px;
          }

          .meta-block h4 {
            margin: 0 0 6px 0;
            font-size: 10px;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.5px;
            font-weight: 700;
          }

          .meta-block p {
            margin: 0;
            font-weight: 600;
            font-size: 13px;
          }

          .details-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }

          .details-table th {
            border-bottom: 2px solid #111;
            text-align: left;
            padding: 10px 6px;
            font-size: 10px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 700;
          }

          .details-table td {
            border-bottom: 1px solid #f1f5f9;
            padding: 12px 6px;
            vertical-align: top;
          }

          .details-table .num-col {
            text-align: right;
          }

          .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
          }

          .totals-table {
            width: 300px;
            border-collapse: collapse;
          }

          .totals-table td {
            padding: 6px 6px;
            font-size: 13px;
          }

          .totals-table tr.grand-total td {
            border-top: 2px solid #111;
            border-bottom: 2px solid #111;
            font-weight: 800;
            font-size: 16px;
            padding: 12px 6px;
            color: #000;
          }

          .footer-note {
            text-align: center;
            border-top: 1px dashed #e2e8f0;
            padding-top: 24px;
            margin-top: 30px;
            font-size: 11px;
            color: #64748b;
          }

          /* Styling adjustment when printed on 80mm thermal paper */
          @media print and (max-width: 85mm) {
            body {
              padding: 0;
              width: 76mm;
              font-size: 11px;
            }
            .receipt-container {
              border: none;
              padding: 0;
              width: 100%;
              max-width: 100%;
            }
            .header {
              flex-direction: column;
              align-items: center;
              text-align: center;
              border-bottom: 1px dashed #111;
              padding-bottom: 16px;
              margin-bottom: 16px;
            }
            .header-left, .header-right {
              width: 100%;
              text-align: center;
            }
            .header-right {
              margin-top: 12px;
            }
            .title {
              font-size: 18px;
            }
            .meta-info {
              grid-template-columns: 1fr;
              gap: 16px;
              margin-bottom: 20px;
              border-bottom: 1px dashed #e2e8f0;
              padding-bottom: 16px;
            }
            .details-table th, .details-table td {
              padding: 8px 4px;
            }
            .totals-section {
              justify-content: stretch;
            }
            .totals-table {
              width: 100%;
            }
            .totals-table tr.grand-total td {
              font-size: 14px;
              padding: 10px 4px;
            }
            .footer-note {
              font-size: 10px;
              padding-top: 16px;
              margin-top: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <div class="header-left">
              ${logoHtml}
              <div class="title">${settings.shopName || "GoldenCare Market"}</div>
              <div style="font-size: 12px; color: #475569; margin-top: 6px;">
                ${settings.address ? `<div>${settings.address}</div>` : ''}
                ${settings.phone ? `<div>Tel: ${settings.phone}</div>` : ''}
              </div>
            </div>
            <div class="header-right">
              <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">RECEIPT</h2>
              <div style="font-size: 12px; color: #475569; line-height: 1.4;">
                <div><strong>Receipt No:</strong> #${order.id}</div>
                <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</div>
                <div><strong>Payment:</strong> ${order.paymentStatus} (${order.paymentMethod || 'Paystack'})</div>
                ${order.paymentReference ? `<div><strong>Ref:</strong> ${order.paymentReference}</div>` : ''}
              </div>
            </div>
          </div>

          <div class="meta-info">
            <div class="meta-block">
              <h4>Billed To:</h4>
              <p style="margin-bottom: 4px; color: #0f172a;">${order.customerName}</p>
              <div style="color: #475569; font-size: 12px; line-height: 1.4;">
                <div>${order.customerAddress}</div>
                <div>Tel: ${order.customerPhone}</div>
                ${order.buyerEmail ? `<div>Email: ${order.buyerEmail}</div>` : ''}
              </div>
            </div>
            ${order.notes ? `
            <div class="meta-block">
              <h4>Delivery Notes:</h4>
              <p style="font-weight: normal; font-style: italic; color: #334155; font-size: 12px;">"${order.notes}"</p>
            </div>
            ` : ''}
          </div>

          <table class="details-table">
            <thead>
              <tr>
                <th>Item Details</th>
                <th class="num-col" style="width: 50px;">Qty</th>
                <th class="num-col" style="width: 90px;">Price</th>
                <th class="num-col" style="width: 100px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(it => `
                <tr>
                  <td>
                    <div style="font-weight: 700; color: #0f172a;">${it.name}</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${it.variantDetails}</div>
                  </td>
                  <td class="num-col" style="color: #334155;">${it.quantity}</td>
                  <td class="num-col" style="color: #334155;">KSh ${it.price.toLocaleString()}</td>
                  <td class="num-col" style="font-weight: 700; color: #0f172a;">KSh ${(it.price * it.quantity).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals-section">
            <table class="totals-table">
              <tr>
                <td style="color: #64748b;">Subtotal</td>
                <td class="num-col" style="font-weight: 600; color: #334155;">KSh ${subtotal.toLocaleString()}</td>
              </tr>
              ${shipping > 0 ? `
              <tr>
                <td style="color: #64748b;">Shipping</td>
                <td class="num-col" style="font-weight: 600; color: #334155;">KSh ${shipping.toLocaleString()}</td>
              </tr>
              ` : ''}
              ${tax > 0 ? `
              <tr>
                <td style="color: #64748b;">Tax (${settings.taxRate || 16}%)</td>
                <td class="num-col" style="font-weight: 600; color: #334155;">KSh ${tax.toLocaleString()}</td>
              </tr>
              ` : ''}
              ${discount > 0 ? `
              <tr>
                <td style="color: #64748b;">Discount</td>
                <td class="num-col" style="font-weight: 600; color: #ef4444;">-KSh ${discount.toLocaleString()}</td>
              </tr>
              ` : ''}
              <tr class="grand-total">
                <td>Total Paid</td>
                <td class="num-col">KSh ${order.totalAmount.toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <div class="footer-note">
            <div style="font-weight: 700; margin-bottom: 6px; text-transform: uppercase; color: #0f172a; letter-spacing: 0.5px;">Thank you for shopping with us!</div>
            <div>If you have any questions about this receipt, feel free to reach out to our team.</div>
            <div style="margin-top: 20px; font-size: 10px; color: #94a3b8;">Receipt generated on ${new Date().toLocaleString()} &bull; ${settings.shopName || "GoldenCare"}</div>
          </div>
        </div>
      </body>
    </html>
  `;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
  }, 250);
}
