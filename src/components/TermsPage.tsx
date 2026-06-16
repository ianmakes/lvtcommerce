import React from 'react';
import { ShopSettings } from '../types';

interface TermsPageProps {
  settings: ShopSettings;
}

export const TermsPage: React.FC<TermsPageProps> = ({ settings }) => {
  const legalEmail = settings.adminEmail || `legal@${settings.shopName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

  return (
    <div className="container" style={{ padding: '60px 0 80px', maxWidth: '800px', color: 'var(--color-ink)' }}>
      <span className="font-caption-md" style={{ textTransform: 'uppercase', fontWeight: 600 }}>{settings.shopName} Legal Desk</span>
      <h1 className="font-heading-xl" style={{ marginTop: '8px', marginBottom: '32px', textTransform: 'uppercase', borderBottom: '2px solid var(--color-ink)', paddingBottom: '16px' }}>
        Terms & Conditions
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', lineHeight: 1.6 }}>
        <section>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-mute)', display: 'block', marginBottom: '8px' }}>LAST UPDATED: JUNE 10, 2026</span>
          <p className="font-body-md">
            Welcome to {settings.shopName}. These Terms & Conditions govern your access to and purchase of wellness objects on our storefront systems. By placing an order or registering a shopper account, you agree to these legal conditions in full.
          </p>
        </section>

        <section>
          <h2 className="font-heading-md" style={{ textTransform: 'uppercase', marginBottom: '12px' }}>1. Terms of Sale</h2>
          <p className="font-body-md">
            All prices are listed in Kenyan Shillings (KSh). We reserve the right to modify pricing, specifications, and availability of products without prior notice. An order confirmation email indicates receipt of payment—not acceptance of the order. In cases of catalog pricing errors or inventory stockouts, we reserve the right to cancel the transaction and issue a full refund.
          </p>
        </section>

        <section>
          <h2 className="font-heading-md" style={{ textTransform: 'uppercase', marginBottom: '12px' }}>2. Delivery and Shipments</h2>
          <p className="font-body-md">
            Shipment timeframes provided are estimates. We dispatch packages within Kenya using external logistics networks. Free delivery applies to order totals exceeding KSh 30,000. For orders below this threshold, a flat delivery fee of KSh 1,500 is applied. Risk of loss passes to the buyer upon courier delivery to the specified address.
          </p>
        </section>

        <section>
          <h2 className="font-heading-md" style={{ textTransform: 'uppercase', marginBottom: '12px' }}>3. Warranty & Returns Policy</h2>
          <p className="font-body-md">
            We provide a 3-Year Structural Warranty on all carbon fiber staff frames. Electronic parts, Bluetooth sensors, and heating elements are covered by a 1-Year/2-Year warranty as indicated on the product specifications. Returns are accepted within 30 days of shipment receipt. Items must be returned unused, inside their original premium packaging, and at the shopper's shipping expense.
          </p>
        </section>

        <section>
          <h2 className="font-heading-md" style={{ textTransform: 'uppercase', marginBottom: '12px' }}>4. Code of Conduct</h2>
          <p className="font-body-md">
            You agree not to attempt to reverse-engineer our smart capsules, bypass secure gateways, or post abusive or fraudulent reviews on our product reviews section.
          </p>
        </section>

        <section style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: '24px', marginTop: '16px' }}>
          <p className="font-caption-sm" style={{ color: 'var(--text-mute)', margin: 0 }}>
            If you have legal or compliance questions regarding these terms, please reach out to our legal desk at: <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{legalEmail}</span>.
          </p>
        </section>
      </div>
    </div>
  );
};
