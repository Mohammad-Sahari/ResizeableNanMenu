const resizingClass = "drawer-is-resizing";

export function attach(handle, dotNetHelper, options) {
    const minWidth = options?.minWidth ?? 200;
    const maxWidth = options?.maxWidth ?? 600;
    const minMainContentWidth = options?.minMainContentWidth ?? 360;
    const defaultWidth = options?.defaultWidth ?? 300;
    const cssVar = options?.cssVariable ?? "--mud-drawer-width-left";

    const drawer = handle.closest(".mud-drawer");
    const layout = handle.closest(".mud-layout");
    if (!drawer || !layout) {
        return { dispose() { } };
    }

    const transitionTargets = [
        drawer,
        layout.querySelector(".mud-main-content"),
        layout.querySelector(".mud-appbar")
    ].filter(Boolean);

    let dragging = false;
    let startX = 0;
    let startWidth = 0;
    let currentWidth = 0;
    let activePointerId = null;

    currentWidth = getLayoutWidth();

    function getMaxWidth() {
        return Math.max(minWidth, Math.min(maxWidth, window.innerWidth - minMainContentWidth));
    }

    function getLayoutWidth() {
        const fromVar = parseFloat(getComputedStyle(layout).getPropertyValue(cssVar));
        if (!Number.isNaN(fromVar) && fromVar > 0) {
            return fromVar;
        }

        return drawer.getBoundingClientRect().width;
    }

    function clamp(width) {
        return Math.min(getMaxWidth(), Math.max(minWidth, width));
    }

    function applyWidth(width) {
        currentWidth = clamp(width);
        layout.style.setProperty(cssVar, `${currentWidth}px`);
        return currentWidth;
    }

    function setResizing(isResizing) {
        layout.classList.toggle(resizingClass, isResizing);
        document.body.style.cursor = isResizing ? "col-resize" : "";
        document.body.style.userSelect = isResizing ? "none" : "";
        for (const element of transitionTargets) {
            element.style.transition = isResizing ? "none" : "";
        }
    }

    function notify(width) {
        return dotNetHelper.invokeMethodAsync("OnDrawerResized", width);
    }

    function onPointerDown(event) {
        if (event.button !== 0) {
            return;
        }

        event.preventDefault();
        dragging = true;
        activePointerId = event.pointerId;
        startX = event.clientX;
        startWidth = getLayoutWidth();
        handle.setPointerCapture(event.pointerId);
        setResizing(true);
    }

    function onPointerMove(event) {
        if (!dragging || event.pointerId !== activePointerId) {
            return;
        }

        applyWidth(startWidth + (event.clientX - startX));
    }

    function onPointerUp(event) {
        if (!dragging || (event.pointerId !== undefined && event.pointerId !== activePointerId)) {
            return;
        }

        dragging = false;
        activePointerId = null;
        setResizing(false);

        if (handle.hasPointerCapture?.(event.pointerId)) {
            handle.releasePointerCapture(event.pointerId);
        }

        notify(applyWidth(getLayoutWidth()));
    }

    function onDblClick(event) {
        event.preventDefault();
        notify(applyWidth(defaultWidth));
    }

    function onKeyDown(event) {
        const step = event.shiftKey ? 50 : 10;
        let next = currentWidth;

        if (event.key === "ArrowLeft") {
            next = currentWidth - step;
        } else if (event.key === "ArrowRight") {
            next = currentWidth + step;
        } else if (event.key === "Home") {
            next = minWidth;
        } else if (event.key === "End") {
            next = getMaxWidth();
        } else {
            return;
        }

        event.preventDefault();
        notify(applyWidth(next));
    }

    function onWindowResize() {
        const max = getMaxWidth();
        if (currentWidth > max) {
            notify(applyWidth(max));
        }
    }

    handle.tabIndex = 0;
    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerUp);
    handle.addEventListener("pointercancel", onPointerUp);
    handle.addEventListener("dblclick", onDblClick);
    handle.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onWindowResize);

    return {
        dispose() {
            handle.removeEventListener("pointerdown", onPointerDown);
            handle.removeEventListener("pointermove", onPointerMove);
            handle.removeEventListener("pointerup", onPointerUp);
            handle.removeEventListener("pointercancel", onPointerUp);
            handle.removeEventListener("dblclick", onDblClick);
            handle.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("resize", onWindowResize);
            setResizing(false);
        }
    };
}
