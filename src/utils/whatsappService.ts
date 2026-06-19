import { Order, ShopSettings } from '../types';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

export function compileWhatsappMessage(
  template: string,
  order: Order,
  settings: ShopSettings,
  newStatus?: Order['orderStatus']
): string {
  let itemsText = '';
  if (order.items && order.items.length > 0) {
    itemsText = order.items.map(item => {
      const variantStr = item.variantDetails && item.variantDetails !== 'Standard Option' 
        ? ` (${item.variantDetails})` 
        : '';
      return `- ${item.quantity}x ${item.name}${variantStr} @ KSh ${item.price.toLocaleString()}`;
    }).join('\n');
  }

  const status = newStatus || order.orderStatus;
  const statusLabels: Record<string, string> = {
    'pending': 'Pending / Unpaid',
    'processing': 'Processing',
    'shipped': 'Shipped / Dispatched',
    'completed': 'Completed / Delivered',
    'cancelled': 'Cancelled',
    'refunded': 'Refunded'
  };
  const statusStr = statusLabels[status] || status;

  return template
    .replace(/\{\{shopName\}\}/g, settings.shopName || 'GoldenCare Market')
    .replace(/\{\{orderId\}\}/g, order.id)
    .replace(/\{\{customerName\}\}/g, order.customerName)
    .replace(/\{\{orderStatus\}\}/g, statusStr)
    .replace(/\{\{totalAmount\}\}/g, `KSh ${order.totalAmount.toLocaleString()}`)
    .replace(/\{\{customerAddress\}\}/g, order.customerAddress)
    .replace(/\{\{customerPhone\}\}/g, order.customerPhone)
    .replace(/\{\{items\}\}/g, itemsText);
}

export async function sendWhatsappMessage(
  order: Order,
  settings: ShopSettings,
  type: 'created' | 'status_updated',
  newStatus?: Order['orderStatus']
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!settings.whatsappEnabled) {
    return { success: false, error: 'WhatsApp delivery is disabled in settings.' };
  }

  const accessToken = settings.whatsappAccessToken;
  const phoneNumberId = settings.whatsappPhoneNumberId;

  if (!accessToken || !phoneNumberId) {
    const errorMsg = 'WhatsApp Meta Access Token or Phone Number ID is missing in settings.';
    await logWhatsappDelivery(order.id, order.customerPhone, 'Failed: missing credentials', errorMsg);
    return { success: false, error: errorMsg };
  }

  // Format recipient phone number
  let recipientPhone = order.customerPhone.replace(/\D/g, ''); // keep only digits
  if (recipientPhone.startsWith('0') && recipientPhone.length === 10) {
    // local number without country code, assume Kenya/local e.g. 254
    recipientPhone = '254' + recipientPhone.substring(1);
  }

  const defaultCreatedTemplate = `Hello {{customerName}},

Your order #{{orderId}} at {{shopName}} has been placed successfully! 🎉

*Order Summary:*
{{items}}

*Total Amount:* {{totalAmount}}
*Shipping Address:* {{customerAddress}}

Thank you for shopping with us!`;

  const defaultUpdatedTemplate = `Hello {{customerName}},

The status of your order #{{orderId}} at {{shopName}} has been updated to: *{{orderStatus}}*.

*Total Amount:* {{totalAmount}}

If you have any questions, feel free to reply to this message.`;

  const template = type === 'created' 
    ? (settings.whatsappTemplateOrderCreated || defaultCreatedTemplate)
    : (settings.whatsappTemplateStatusUpdated || defaultUpdatedTemplate);

  const messageContent = compileWhatsappMessage(template, order, settings, newStatus);

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhone,
        type: "text",
        text: {
          preview_url: false,
          body: messageContent
        }
      })
    });

    const data = await response.json();
    if (response.ok) {
      const messageId = data?.messages?.[0]?.id;
      await logWhatsappDelivery(order.id, order.customerPhone, 'success', messageContent, data);
      return { success: true, messageId };
    } else {
      const errorMsg = data?.error?.message || response.statusText || 'Unknown Meta API error';
      await logWhatsappDelivery(order.id, order.customerPhone, 'failed', messageContent, data);
      return { success: false, error: errorMsg };
    }
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    await logWhatsappDelivery(order.id, order.customerPhone, 'failed', messageContent, { error: errorMsg });
    return { success: false, error: errorMsg };
  }
}

export async function sendTestWhatsapp(
  testPhone: string,
  settings: ShopSettings
): Promise<void> {
  const accessToken = settings.whatsappAccessToken;
  const phoneNumberId = settings.whatsappPhoneNumberId;

  if (!accessToken || !phoneNumberId) {
    throw new Error('WhatsApp Meta Access Token or Phone Number ID is missing.');
  }

  let recipientPhone = testPhone.replace(/\D/g, '');
  if (recipientPhone.startsWith('0') && recipientPhone.length === 10) {
    recipientPhone = '254' + recipientPhone.substring(1);
  }

  const messageContent = `Test message from ${settings.shopName || 'GoldenCare Market'}. Your WhatsApp credentials are correctly configured! 🚀`;

  const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientPhone,
      type: "text",
      text: {
        preview_url: false,
        body: messageContent
      }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || response.statusText || 'Unknown Meta API error');
  }
}

async function logWhatsappDelivery(
  orderId: string,
  recipient: string,
  status: string,
  message: string,
  metaResponse?: any
) {
  try {
    const colRef = collection(db, "whatsapp_logs");
    await addDoc(colRef, {
      orderId,
      recipient,
      status,
      message,
      metaResponse: metaResponse ? JSON.stringify(metaResponse) : null,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Failed to write to whatsapp_logs collection:", err);
  }
}
