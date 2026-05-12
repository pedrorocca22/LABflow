import { useCallback, useRef } from 'react';
import { useLabflowStore } from '@/stores/useLabflowStore';

export function useWellSelection(svgRef) {
  const dragRef = useRef({ isActive: false, startX: 0, startY: 0 });

  const activeWellSelectionTarget = useLabflowStore((s) => s.activeWellSelectionTarget);
  const toggleSourceWell = useLabflowStore((s) => s.toggleSourceWell);
  const toggleDestWell = useLabflowStore((s) => s.toggleDestWell);
  const setDragSelection = useLabflowStore((s) => s.setDragSelection);

  const getMousePos = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    return {
      x: (e.clientX - ctm.e) / ctm.a,
      y: (e.clientY - ctm.f) / ctm.d,
    };
  }, [svgRef]);

  const handleMouseDown = useCallback(
    (e) => {
      if (!activeWellSelectionTarget) return;
      const pos = getMousePos(e);
      dragRef.current = { isActive: true, startX: pos.x, startY: pos.y };
      setDragSelection({ isActive: true, startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y });
      e.preventDefault();
    },
    [activeWellSelectionTarget, getMousePos, setDragSelection]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!dragRef.current.isActive) return;
      const pos = getMousePos(e);
      setDragSelection({ endX: pos.x, endY: pos.y });
    },
    [getMousePos, setDragSelection]
  );

  const handleMouseUp = useCallback(
    (e) => {
      if (!dragRef.current.isActive) return;
      dragRef.current.isActive = false;
      setDragSelection({ isActive: false });

      const dx = Math.abs(
        (useLabflowStore.getState().dragSelection.endX || 0) - dragRef.current.startX
      );
      const dy = Math.abs(
        (useLabflowStore.getState().dragSelection.endY || 0) - dragRef.current.startY
      );

      if (dx < 5 && dy < 5) {
        // Single click on a well
        const well = e.target.closest('[data-well-id]');
        if (well) {
          const wellId = well.dataset.wellId;
          if (activeWellSelectionTarget === 'sourceWells' || activeWellSelectionTarget === 'mixWells') {
            toggleSourceWell(wellId);
          } else {
            toggleDestWell(wellId);
          }
        }
      } else {
        // Box selection
        const rect = {
          x: Math.min(dragRef.current.startX, useLabflowStore.getState().dragSelection.endX || 0),
          y: Math.min(dragRef.current.startY, useLabflowStore.getState().dragSelection.endY || 0),
          width: dx,
          height: dy,
        };
        const svg = svgRef.current;
        if (!svg) return;
        const wells = svg.querySelectorAll('[data-well-id]');
        wells.forEach((well) => {
          const cx = parseFloat(well.getAttribute('cx'));
          const cy = parseFloat(well.getAttribute('cy'));
          if (cx >= rect.x && cx <= rect.x + rect.width && cy >= rect.y && cy <= rect.y + rect.height) {
            const wellId = well.dataset.wellId;
            if (activeWellSelectionTarget === 'sourceWells' || activeWellSelectionTarget === 'mixWells') {
              toggleSourceWell(wellId);
            } else {
              toggleDestWell(wellId);
            }
          }
        });
      }
    },
    [activeWellSelectionTarget, toggleSourceWell, toggleDestWell, setDragSelection, svgRef]
  );

  return { handleMouseDown, handleMouseMove, handleMouseUp };
}
