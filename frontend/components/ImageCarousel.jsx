'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './image-carousel.module.css';

export default function ImageCarousel({
  images = [],
  alt = '',
  className = '',
  imageClassName = '',
  aspectRatio = '4 / 3',
  showDots = true,
}) {
  const validImages = useMemo(() => (Array.isArray(images) ? images.filter(Boolean) : []), [images]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [validImages.length]);

  if (!validImages.length) {
    return null;
  }

  const currentImage = validImages[Math.min(activeIndex, validImages.length - 1)];
  const hasMultiple = validImages.length > 1;

  const goPrev = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveIndex((current) => (current - 1 + validImages.length) % validImages.length);
  };

  const goNext = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveIndex((current) => (current + 1) % validImages.length);
  };

  return (
    <div className={`${styles.carousel} ${className}`} style={{ aspectRatio }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={currentImage} alt={alt} className={`${styles.image} ${imageClassName}`} />

      {hasMultiple && (
        <>
          <button type="button" className={`${styles.navBtn} ${styles.navBtnLeft}`} onClick={goPrev} aria-label="Previous image">
            <ChevronLeft size={16} />
          </button>
          <button type="button" className={`${styles.navBtn} ${styles.navBtnRight}`} onClick={goNext} aria-label="Next image">
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {hasMultiple && showDots && (
        <div className={styles.dots}>
          {validImages.map((_, index) => (
            <button
              key={`${index}-${currentImage}`}
              type="button"
              className={`${styles.dot}${index === activeIndex ? ` ${styles.dotActive}` : ''}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setActiveIndex(index);
              }}
              aria-label={`Show image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
