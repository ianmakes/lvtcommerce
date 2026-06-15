import React from 'react';
import { ArrowRight } from 'lucide-react';
import { navigate } from '../Router';

export const AboutPage: React.FC = () => {
  return (
    <div style={{ backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)' }}>
      {/* Editorial Hero */}
      <section 
        className="campaign-hero" 
        style={{ 
          height: '450px', 
          marginBottom: '48px',
          backgroundImage: 'linear-gradient(to bottom, rgba(17,17,17,0.3) 0%, rgba(17,17,17,0.6) 100%), url(https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1600)' 
        }}
      >
        <div className="campaign-hero-inner">
          <div className="campaign-hero-content" style={{ paddingBottom: '0px' }}>
            <span style={{ fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--color-canvas)', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
              Our Mission & Legacy
            </span>
            <h1 className="font-display-campaign about-hero-title" style={{ marginBottom: '8px' }}>
              ABOUT GOLDENCARE
            </h1>
            <p className="font-body-md" style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '16px', maxWidth: '600px', marginBottom: '0' }}>
              We design recover-tech objects for athletic support. Zero decorative details, pure material engineering, and invisible digital utility.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container section-block" style={{ paddingBottom: '80px' }}>
        <div className="responsive-grid-main" style={{ marginBottom: '64px' }}>
          <div>
            <h2 className="font-heading-xl" style={{ textTransform: 'uppercase', marginBottom: '24px', borderBottom: '2px solid var(--color-ink)', paddingBottom: '12px' }}>
              Functional Recovery Architecture
            </h2>
            <p className="font-body-lg" style={{ lineHeight: 1.7, marginBottom: '20px', fontWeight: 500 }}>
              GoldenCare was founded on a singular premise: support equipment shouldn't look like medical waste. It should look, feel, and perform like premium athletic gear.
            </p>
            <p className="font-body-md" style={{ color: 'var(--text-charcoal)', lineHeight: 1.6, marginBottom: '20px' }}>
              Every product in our collection undergoes rigorous laboratory testing. We select high-strength 3K carbon fibers, aerospace aluminum, and medical-grade thermal insulation to construct daily wellness and mobility objects that align with active lifestyles.
            </p>
            <p className="font-body-md" style={{ color: 'var(--text-charcoal)', lineHeight: 1.6 }}>
              We merge this mechanical simplicity with discrete digital feedback—such as Bluetooth connectivity, capacitive LEDs, and smart vibratory alarms—so you can track recover status without the visual noise of traditional hardware interfaces.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', backgroundColor: 'var(--color-soft-cloud)', padding: '40px', border: '1px solid var(--color-hairline-soft)' }}>
            <div>
              <h3 className="font-heading-md" style={{ textTransform: 'uppercase', marginBottom: '12px' }}>Material Integrity</h3>
              <p className="font-body-md" style={{ color: 'var(--text-charcoal)', margin: 0 }}>
                We work exclusively with carbon-fiber weaves, shock-absorbing elastomers, and breathable plush fleeces.
              </p>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-hairline)', margin: 0 }} />
            <div>
              <h3 className="font-heading-md" style={{ textTransform: 'uppercase', marginBottom: '12px' }}>Digital Discretion</h3>
              <p className="font-body-md" style={{ color: 'var(--text-charcoal)', margin: 0 }}>
                No external screens, no blinking lights. Alarms and alerts are felt and acted upon seamlessly.
              </p>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-hairline)', margin: 0 }} />
            <div>
              <h3 className="font-heading-md" style={{ textTransform: 'uppercase', marginBottom: '12px' }}>Lifetime Support</h3>
              <p className="font-body-md" style={{ color: 'var(--text-charcoal)', margin: 0 }}>
                We engineer recovery gear to last a lifetime. All joints are replaceable and all materials are fully recyclable.
              </p>
            </div>
          </div>
        </div>

        {/* Action Link Banner */}
        <div style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <h3 className="font-heading-lg" style={{ textTransform: 'uppercase', margin: 0 }}>Ready to upgrade your recovery?</h3>
            <p className="font-body-md" style={{ color: 'var(--text-mute)', margin: '4px 0 0' }}>Explore the GC Engineered Recovery Catalog.</p>
          </div>
          <button 
            type="button"
            className="btn btn-primary" 
            onClick={() => navigate('/shop')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <span>Browse Catalog</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  );
};
