import type { WheelEvent } from 'react';

export function handleContainedWheel(event: WheelEvent<HTMLElement>) {
    const element = event.currentTarget;
    if (element.scrollHeight <= element.clientHeight || event.deltaY === 0) return;

    const maxScroll = element.scrollHeight - element.clientHeight;
    const canScrollDown = event.deltaY > 0 && element.scrollTop < maxScroll;
    const canScrollUp = event.deltaY < 0 && element.scrollTop > 0;
    if (!canScrollDown && !canScrollUp) return;

    event.preventDefault();
    element.scrollTop = Math.max(0, Math.min(maxScroll, element.scrollTop + event.deltaY));
}
