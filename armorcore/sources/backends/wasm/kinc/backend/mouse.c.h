#include <kinc/mouse.h>

void kinc_internal_mouse_lock() {}

void kinc_internal_mouse_unlock(void) {}

bool kinc_mouse_can_lock(void) {
	return false;
}

void kinc_mouse_show() {}

void kinc_mouse_hide() {}

void kinc_mouse_set_position(int x, int y) {}

void kinc_mouse_get_position(int *x, int *y) {}
