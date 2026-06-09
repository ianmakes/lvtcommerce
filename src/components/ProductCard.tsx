import React from 'react';
import { Volume2 } from 'lucide-react';
import { Product, ShopSettings } from '../types';
import { speakText } from './VoiceHelper';

interface ProductCardProps {
  product: Product;
  settings: ShopSettings;
  onSelectProduct: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  settings,
  onSelectProduct,
}) => {
  // Format price
  const formattedPrice = product.basePrice.toLocaleString();

  // Determine if it has variants and show starting price
  const hasVariants = product.variants && product.variants.length > 0;
  const priceDisplay = hasVariants 
    ? `From ₦${formattedPrice}` 
    : `₦${formattedPrice}`;

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToSpeak = `${product.name}. Category: ${product.category}. Price: ${hasVariants ? 'starts from' : ''} ${product.basePrice} Naira. Description: ${product.description}`;
    speakText(textToSpeak, settings.voiceRate);
  };

  return (
    <article className="card prod-card">
      <div className="prod-img-container">
        <img 
          src={product.image || 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?w=500'} 
          alt={product.name} 
          className="prod-img"
          loading="lazy"
        />
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
        <span className="prod-badge">{product.category}</span>
        
        {/* Speaker helper button */}
        {settings.voiceAssistDefault && (
          <button
            onClick={handleSpeak}
            style={{
              background: 'var(--accent-light)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--accent-primary)',
            }}
            title="Read product details aloud"
            aria-label={`Read details of ${product.name} aloud`}
          >
            <Volume2 size={20} />
          </button>
        )}
      </div>

      <h3 className="prod-title">{product.name}</h3>
      <p className="prod-desc">{product.description}</p>
      
      <div className="prod-footer">
        <span className="prod-price">{priceDisplay}</span>
        <button 
          className="btn btn-primary"
          onClick={() => onSelectProduct(product)}
          style={{ minWidth: '150px' }}
        >
          View Details
        </button>
      </div>
    </article>
  );
};
