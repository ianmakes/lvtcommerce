import React from 'react';

export const PolicyPage: React.FC = () => {
  return (
    <div className="container" style={{ padding: '60px 0 80px', maxWidth: '800px', color: 'var(--color-ink)' }}>
      <span className="font-caption-md" style={{ textTransform: 'uppercase', fontWeight: 600 }}>GoldenCare Market Privacy Desk</span>
      <h1 className="font-heading-xl" style={{ marginTop: '8px', marginBottom: '32px', textTransform: 'uppercase', borderBottom: '2px solid var(--color-ink)', paddingBottom: '16px' }}>
        Privacy Policy
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', lineHeight: 1.6 }}>
        <section>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-mute)', display: 'block', marginBottom: '8px' }}>LAST UPDATED: JUNE 10, 2026</span>
          <p className="font-body-md">
            At GoldenCare Market, we value your trust and are committed to protecting your personal data. This privacy document outlines how we collect, process, and protect your information when you browse our systems, order support objects, or create buyer profiles.
          </p>
        </section>

        <section>
          <h2 className="font-heading-md" style={{ textTransform: 'uppercase', marginBottom: '12px' }}>1. Data Collection</h2>
          <p className="font-body-md" style={{ marginBottom: '10px' }}>
            We only collect information necessary to fulfill your orders and support your recovery progress. This includes:
          </p>
          <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
            <li><strong>Delivery Information:</strong> Full name, phone number, and street address for dispatch.</li>
            <li><strong>Fulfillment & Contact:</strong> Email address for invoices and tracking notifications.</li>
            <li><strong>Profile Settings:</strong> Optional preferences regarding emails and SMS alerts.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading-md" style={{ textTransform: 'uppercase', marginBottom: '12px' }}>2. Payment Processing Security</h2>
          <p className="font-body-md">
            All transaction payments are routed securely through our payment gateway, <strong>Paystack</strong>. GoldenCare Market never reads, writes, or stores credit/debit card numbers or M-Pesa PIN codes on our servers. All sensitive financial records are processed directly by Paystack's PCI-DSS compliant secure infrastructure.
          </p>
        </section>

        <section>
          <h2 className="font-heading-md" style={{ textTransform: 'uppercase', marginBottom: '12px' }}>3. Data Storage & Sharing</h2>
          <p className="font-body-md">
            Your profile details and order records are stored securely in our Firestore databases. We do not sell, rent, or trade your shopper details to any third-party marketing companies. Shopper details are only shared with licensed shipping partners and courier riders to complete physical delivery.
          </p>
        </section>

        <section style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: '24px', marginTop: '16px' }}>
          <p className="font-caption-sm" style={{ color: 'var(--text-mute)', margin: 0 }}>
            If you have questions regarding this document or wish to delete your account data, please contact our data safety desk at: <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>privacy@goldencare.com</span>.
          </p>
        </section>
      </div>
    </div>
  );
};
