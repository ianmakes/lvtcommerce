import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Order, ShopSettings } from '../types';

/**
 * Compiles a dynamic HTML email based on settings preferences
 */
export function compileEmailTemplate(
  type: 'order_customer' | 'order_admin' | 'order_status',
  order: Order,
  settings: ShopSettings,
  newStatus?: Order['orderStatus']
): { subject: string; html: string } {
  // Get template settings
  const prefix = type === 'order_customer' ? 'Customer' : type === 'order_admin' ? 'Admin' : 'Status';
  
  const subjectTemplate = (settings as any)[`emailTemplate${prefix}Subject`] || 
    (type === 'order_customer' ? 'Order Confirmation #{{orderId}} - {{shopName}}' :
     type === 'order_admin' ? 'Alert: New Order #{{orderId}} Received' :
     'Update on Order #{{orderId}} - {{shopName}}');
     
  const headerText = (settings as any)[`emailTemplate${prefix}Header`] || 
    (type === 'order_customer' ? 'Thank You for Your Order!' :
     type === 'order_admin' ? 'New Customer Order' :
     'Order Status Updated');

  const introText = (settings as any)[`emailTemplate${prefix}Intro`] || 
    (type === 'order_customer' ? 'Hi {{customerName}},\n\nWe have received your order #{{orderId}} and are currently processing it. Here are the details of your order:' :
     type === 'order_admin' ? 'An order #{{orderId}} has been placed on {{shopName}} by {{customerName}} ({{customerPhone}}). Details:' :
     'Hi {{customerName}},\n\nThe status of your order #{{orderId}} has been updated to: **{{orderStatus}}**.');

  const footerText = (settings as any)[`emailTemplate${prefix}Footer`] || 
    (type === 'order_customer' ? 'If you have any questions or concerns, please contact our support team. Thank you for choosing {{shopName}}!' :
     type === 'order_admin' ? 'Please log in to the administrator portal to process this order.' :
     'Thank you for shopping with us! If you need any assistance, feel free to reply to this email.');

  const layout = (settings as any)[`emailTemplate${prefix}Layout`] || (type === 'order_admin' ? 'minimalist' : 'modern-gradient');
  const themeColor = (settings as any)[`emailTemplate${prefix}Color`] || (type === 'order_admin' ? '#0f172a' : '#1a237e');
  const includeItems = (settings as any)[`emailTemplate${prefix}IncludeItems`] !== false;

  const replaceTags = (text: string) => {
    return text
      .replace(/\{\{shopName\}\}/g, settings.shopName || 'GoldenCare Market')
      .replace(/\{\{orderId\}\}/g, order.id)
      .replace(/\{\{customerName\}\}/g, order.customerName)
      .replace(/\{\{orderStatus\}\}/g, newStatus || order.orderStatus)
      .replace(/\{\{totalAmount\}\}/g, `KSh ${order.totalAmount.toLocaleString()}`)
      .replace(/\{\{customerAddress\}\}/g, order.customerAddress)
      .replace(/\{\{customerPhone\}\}/g, order.customerPhone);
  };

  const subject = replaceTags(subjectTemplate);
  const header = replaceTags(headerText);
  const introHtml = replaceTags(introText).replace(/\n/g, '<br/>');
  const footerHtml = replaceTags(footerText).replace(/\n/g, '<br/>');

  // Generate Items Table HTML
  let itemsTableHtml = '';
  if (includeItems && order.items && order.items.length > 0) {
    let tableRows = '';
    order.items.forEach(item => {
      tableRows += `
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 12px 0; font-weight: 500; color: #2d3748; text-align: left;">
            ${item.name}
            ${item.variantDetails && item.variantDetails !== 'Standard Option' ? `<br/><span style="font-size: 12px; color: #718096;">${item.variantDetails}</span>` : ''}
          </td>
          <td style="padding: 12px 0; text-align: center; color: #2d3748;">${item.quantity}</td>
          <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #2d3748;">KSh ${item.price.toLocaleString()}</td>
        </tr>
      `;
    });

    itemsTableHtml = `
      <div style="margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="border-bottom: 2px solid #e2e8f0; color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
              <th style="padding: 8px 0; font-weight: 600; text-align: left;">Product</th>
              <th style="padding: 8px 0; text-align: center; font-weight: 600;">Qty</th>
              <th style="padding: 8px 0; text-align: right; font-weight: 600;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 16px 0 8px; text-align: right; color: #718096;">Subtotal:</td>
              <td style="padding: 16px 0 8px; text-align: right; font-weight: 600; color: #2d3748;">KSh ${(order.subtotal || order.totalAmount).toLocaleString()}</td>
            </tr>
            ${order.shippingFee ? `
            <tr>
              <td colspan="2" style="padding: 8px 0; text-align: right; color: #718096;">Shipping:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #2d3748;">KSh ${order.shippingFee.toLocaleString()}</td>
            </tr>` : ''}
            ${order.taxAmount ? `
            <tr>
              <td colspan="2" style="padding: 8px 0; text-align: right; color: #718096;">Tax (VAT):</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #2d3748;">KSh ${order.taxAmount.toLocaleString()}</td>
            </tr>` : ''}
            <tr style="border-top: 1px solid #e2e8f0;">
              <td colspan="2" style="padding: 16px 0; text-align: right; font-weight: 700; font-size: 16px; color: #2d3748;">Total Amount:</td>
              <td style="padding: 16px 0; text-align: right; font-weight: 700; font-size: 16px; color: ${themeColor};">KSh ${order.totalAmount.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  // Generate full HTML based on layout
  let finalHtml = '';
  const logoSection = settings.logoUrl 
    ? `<div style="text-align: center; margin-bottom: 24px;"><img src="${settings.logoUrl}" alt="${settings.shopName}" style="max-height: 50px;"/></div>`
    : '';

  if (layout === 'minimalist') {
    finalHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #2d3748; padding: 30px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        ${logoSection}
        <h2 style="font-size: 20px; font-weight: 700; color: #1a202c; border-bottom: 1px solid #edf2f7; padding-bottom: 12px; margin-top: 0;">${header}</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #4a5568;">${introHtml}</p>
        ${itemsTableHtml}
        <div style="background-color: #f7fafc; padding: 15px; border-radius: 6px; margin: 24px 0; font-size: 13px; line-height: 1.5;">
          <strong>Shipping Details:</strong><br/>
          Name: ${order.customerName}<br/>
          Address: ${order.customerAddress}<br/>
          Phone: ${order.customerPhone}
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #718096; border-top: 1px solid #edf2f7; padding-top: 20px; margin-bottom: 0;">${footerHtml}</p>
        <div style="text-align: center; font-size: 12px; color: #a0aec0; margin-top: 30px;">
          © ${new Date().getFullYear()} ${settings.shopName || 'GoldenCare Market'}. All rights reserved.
        </div>
      </div>
    `;
  } else if (layout === 'dark-mode') {
    finalHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; padding: 40px 20px; color: #f8fafc;">
        <div style="background-color: #1e293b; color: #f8fafc; padding: 30px; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #334155; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);">
          ${logoSection}
          <h2 style="font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 0; border-bottom: 1px solid #334155; padding-bottom: 15px; text-align: center;">${header}</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-top: 20px;">${introHtml}</p>
          
          ${itemsTableHtml
            .replace(/color:\s*#2d3748/g, 'color: #f1f5f9')
            .replace(/color:\s*#718096/g, 'color: #94a3b8')
            .replace(/border-bottom:\s*1px solid #edf2f7;/g, 'border-bottom: 1px solid #334155;')
            .replace(/border-bottom:\s*2px solid #e2e8f0;/g, 'border-bottom: 2px solid #475569;')
            .replace(/border-top:\s*1px solid #e2e8f0;/g, 'border-top: 1px solid #334155;')
          }
          
          <div style="background-color: #0f172a; padding: 15px; border-radius: 8px; margin: 24px 0; font-size: 13px; line-height: 1.5; border: 1px solid #334155;">
            <strong style="color: #ffffff;">Shipping Details:</strong><br/>
            Name: ${order.customerName}<br/>
            Address: ${order.customerAddress}<br/>
            Phone: ${order.customerPhone}
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; border-top: 1px solid #334155; padding-top: 20px; margin-bottom: 0;">${footerHtml}</p>
          <div style="text-align: center; font-size: 12px; color: #64748b; margin-top: 30px;">
            © ${new Date().getFullYear()} ${settings.shopName || 'GoldenCare Market'}. All rights reserved.
          </div>
        </div>
      </div>
    `;
  } else if (layout === 'warm-cozy') {
    finalHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fffaf0; padding: 40px 20px;">
        <div style="background-color: #ffffff; color: #4a5568; padding: 30px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 2px solid #feebc8; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          ${logoSection}
          <div style="text-align: center; background-color: #fef3c7; color: #d97706; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
            <h2 style="font-size: 22px; font-weight: 800; margin: 0;">${header}</h2>
          </div>
          <p style="font-size: 15px; line-height: 1.6; color: #4a5568;">${introHtml}</p>
          ${itemsTableHtml}
          <div style="background-color: #fffaf0; padding: 15px; border-radius: 10px; margin: 24px 0; font-size: 13px; line-height: 1.5; border: 1px dashed #fbd38d;">
            <strong>Shipping Details:</strong><br/>
            Name: ${order.customerName}<br/>
            Address: ${order.customerAddress}<br/>
            Phone: ${order.customerPhone}
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #718096; border-top: 1px solid #edf2f7; padding-top: 20px; margin-bottom: 0;">${footerHtml}</p>
          <div style="text-align: center; font-size: 12px; color: #a0aec0; margin-top: 30px;">
            © ${new Date().getFullYear()} ${settings.shopName || 'GoldenCare Market'}. All rights reserved.
          </div>
        </div>
      </div>
    `;
  } else {
    // Default: modern-gradient
    finalHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; padding: 40px 20px;">
        <div style="background-color: #ffffff; color: #2d3748; padding: 0; max-width: 600px; margin: 0 auto; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);">
          <div style="background: linear-gradient(135deg, ${themeColor} 0%, #0d47a1 100%); padding: 30px; text-align: center; color: #ffffff;">
            ${settings.logoUrl ? `<img src="${settings.logoUrl}" alt="${settings.shopName}" style="max-height: 40px; margin-bottom: 10px;"/>` : ''}
            <h1 style="font-size: 24px; font-weight: 700; margin: 0; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.15);">${header}</h1>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 15px; line-height: 1.6; color: #4a5568; margin-top: 0;">${introHtml}</p>
            ${itemsTableHtml}
            
            <div style="background-color: #f7fafc; padding: 15px; border-radius: 6px; margin: 24px 0; font-size: 13px; line-height: 1.5; border-left: 4px solid ${themeColor};">
              <strong style="color: #2d3748;">Shipping Details:</strong><br/>
              Name: ${order.customerName}<br/>
              Address: ${order.customerAddress}<br/>
              Phone: ${order.customerPhone}
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; color: #718096; border-top: 1px solid #edf2f7; padding-top: 20px; margin-bottom: 0;">${footerHtml}</p>
          </div>
          <div style="background-color: #edf2f7; padding: 20px; text-align: center; font-size: 12px; color: #718096;">
            © ${new Date().getFullYear()} ${settings.shopName || 'GoldenCare Market'}. All rights reserved.
          </div>
        </div>
      </div>
    `;
  }

  return { subject, html: finalHtml };
}

/**
 * Dispatched when a new order is completed (customer confirmation & admin alerts)
 */
export async function sendOrderEmails(order: Order, settings: ShopSettings) {
  // 1. Send Order Confirmation to Customer
  const customerEmail = order.buyerEmail;
  if (customerEmail && customerEmail.includes('@')) {
    try {
      const { subject, html } = compileEmailTemplate('order_customer', order, settings);
      await deliverEmail({
        to: customerEmail,
        subject,
        html,
        settings,
        orderId: order.id,
        type: 'order_customer'
      });
    } catch (err) {
      console.error("Failed to send customer order email:", err);
    }
  }

  // 2. Send Order Alert to Admin
  const adminEmail = settings.adminEmail;
  if (adminEmail && adminEmail.includes('@')) {
    try {
      const { subject, html } = compileEmailTemplate('order_admin', order, settings);
      await deliverEmail({
        to: adminEmail,
        subject,
        html,
        settings,
        orderId: order.id,
        type: 'order_admin'
      });
    } catch (err) {
      console.error("Failed to send admin order alert:", err);
    }
  }
}

/**
 * Dispatched when an order status is updated
 */
export async function sendOrderStatusEmail(order: Order, settings: ShopSettings, newStatus: Order['orderStatus']) {
  const customerEmail = order.buyerEmail;
  if (customerEmail && customerEmail.includes('@')) {
    try {
      const { subject, html } = compileEmailTemplate('order_status', order, settings, newStatus);
      await deliverEmail({
        to: customerEmail,
        subject,
        html,
        settings,
        orderId: order.id,
        type: 'order_status'
      });
    } catch (err) {
      console.error("Failed to send order status update email:", err);
    }
  }
}

/**
 * Delivers email using Resend API (or simulates SMTP) and logs to Firestore
 */
async function deliverEmail({
  to,
  subject,
  html,
  settings,
  orderId,
  type
}: {
  to: string;
  subject: string;
  html: string;
  settings: ShopSettings;
  orderId: string;
  type: 'order_customer' | 'order_admin' | 'order_status';
}) {
  const emailId = `mail-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  // Create an email record structure
  const emailRecord = {
    id: emailId,
    to,
    subject,
    html,
    orderId,
    type,
    sentAt: new Date().toISOString(),
    provider: settings.emailProvider || 'resend',
    status: 'Pending',
    error: null as string | null
  };

  try {
    if (settings.emailProvider === 'resend' && settings.resendApiKey) {
      const fromAddress = settings.emailFromAddress || 'onboarding@resend.dev';
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddress,
          to,
          subject,
          html
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Resend API response was not OK: ${response.status} - ${errText}`);
      }
      emailRecord.status = 'Success';
      console.log(`Email successfully dispatched via Resend to ${to}.`);
    } else {
      // SMTP or other provider
      emailRecord.status = 'SMTP_Logged';
      emailRecord.error = 'SMTP is not supported directly from browser JS. Email details logged in Firestore for backend processor.';
      console.warn("Direct SMTP delivery is not supported in client-side React. Logged email to Firestore.");
    }
  } catch (error: any) {
    emailRecord.status = 'Failed';
    emailRecord.error = error.message || String(error);
    console.error("Email delivery failed:", error);
    throw error;
  } finally {
    // Save to Firestore logs
    try {
      await setDoc(doc(db, "sent_emails", emailId), emailRecord);
    } catch (err) {
      console.error("Failed to write sent_email record to Firestore:", err);
    }
  }
}
