import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const VirtualScrollList = ({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
  loadMore,
  hasNextPage = false,
  isLoadingMore = false
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef(null);
  
  const totalHeight = items.length * itemHeight;
  
  // Calculate visible range with overscan
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);
  
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      offsetY: (startIndex + index) * itemHeight
    }));
  }, [items, visibleRange, itemHeight]);
  
  const handleScroll = useCallback((event) => {
    const scrollTop = event.target.scrollTop;
    setScrollTop(scrollTop);
    
    if (onScroll) {
      onScroll(event);
    }
    
    // Infinite loading
    if (hasNextPage && !isLoadingMore && loadMore) {
      const scrollHeight = event.target.scrollHeight;
      const clientHeight = event.target.clientHeight;
      const threshold = 200; // Load more when 200px from bottom
      
      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        loadMore();
      }
    }
  }, [onScroll, hasNextPage, isLoadingMore, loadMore]);
  
  // Scroll to specific item
  const scrollToItem = useCallback((index, behavior = 'smooth') => {
    if (scrollElementRef.current) {
      const offsetY = index * itemHeight;
      scrollElementRef.current.scrollTo({
        top: offsetY,
        behavior
      });
    }
  }, [itemHeight]);
  
  // Expose scroll methods
  useEffect(() => {
    if (scrollElementRef.current) {
      scrollElementRef.current.scrollToItem = scrollToItem;
    }
  }, [scrollToItem]);
  
  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, offsetY }) => (
          <div
            key={item.id || index}
            style={{
              position: 'absolute',
              top: offsetY,
              left: 0,
              right: 0,
              height: itemHeight
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
        
        {/* Loading indicator for infinite scroll */}
        {isLoadingMore && (
          <div
            style={{
              position: 'absolute',
              top: totalHeight,
              left: 0,
              right: 0,
              height: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced version with dynamic item heights
export const DynamicVirtualScrollList = ({
  items,
  estimateItemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll
}) => {
  const [itemHeights, setItemHeights] = useState(new Map());
  const [scrollTop, setScrollTop] = useState(0);
  const itemRefs = useRef(new Map());
  
  // Measure item heights
  const measureItem = useCallback((index, element) => {
    if (element) {
      const height = element.getBoundingClientRect().height;
      setItemHeights(prev => new Map(prev).set(index, height));
    }
  }, []);
  
  // Calculate positions and visible range
  const { totalHeight, visibleRange, itemPositions } = useMemo(() => {
    let totalHeight = 0;
    const itemPositions = [];
    
    for (let i = 0; i < items.length; i++) {
      itemPositions[i] = totalHeight;
      const height = itemHeights.get(i) || estimateItemHeight(items[i], i);
      totalHeight += height;
    }
    
    // Find visible range
    let startIndex = 0;
    let endIndex = items.length - 1;
    
    for (let i = 0; i < itemPositions.length; i++) {
      if (itemPositions[i] + (itemHeights.get(i) || estimateItemHeight(items[i], i)) >= scrollTop) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
    }
    
    for (let i = startIndex; i < itemPositions.length; i++) {
      if (itemPositions[i] > scrollTop + containerHeight) {
        endIndex = Math.min(items.length - 1, i + overscan);
        break;
      }
    }
    
    return { totalHeight, visibleRange: { startIndex, endIndex }, itemPositions };
  }, [items, itemHeights, scrollTop, containerHeight, overscan, estimateItemHeight]);
  
  const handleScroll = useCallback((event) => {
    setScrollTop(event.target.scrollTop);
    if (onScroll) onScroll(event);
  }, [onScroll]);
  
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      offsetY: itemPositions[startIndex + index]
    }));
  }, [items, visibleRange, itemPositions]);
  
  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, offsetY }) => (
          <div
            key={item.id || index}
            ref={(el) => measureItem(index, el)}
            style={{
              position: 'absolute',
              top: offsetY,
              left: 0,
              right: 0
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VirtualScrollList;