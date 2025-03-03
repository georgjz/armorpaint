#pragma once

#include <kinc/global.h>

#include <stdbool.h>

/*! \file mouse.h
    \brief Provides mouse-support.
*/

#define KINC_MOUSE_LEFT 0
#define KINC_MOUSE_RIGHT 1
#define KINC_MOUSE_MIDDLE 2
// eg backward sidebutton
#define KINC_MOUSE_EXTRA1 3
// eg forward sidebutton
#define KINC_MOUSE_EXTRA2 4

void kinc_mouse_set_press_callback(void (*value)(int /*button*/, int /*x*/, int /*y*/, void * /*data*/), void *data);
void kinc_mouse_set_release_callback(void (*value)(int /*button*/, int /*x*/, int /*y*/, void * /*data*/), void *data);
void kinc_mouse_set_move_callback(void (*value)(int /*x*/, int /*y*/, int /*movement_x*/, int /*movement_y*/, void * /*data*/),
                                            void *data);
void kinc_mouse_set_scroll_callback(void (*value)(int /*delta*/, void * /*data*/), void *data);
bool kinc_mouse_can_lock(void);
bool kinc_mouse_is_locked(void);
void kinc_mouse_lock();
void kinc_mouse_unlock(void);
void kinc_mouse_set_cursor(int cursor);
void kinc_mouse_show(void);
void kinc_mouse_hide(void);
void kinc_mouse_set_position(int x, int y);
void kinc_mouse_get_position(int *x, int *y);

void kinc_internal_mouse_trigger_press(int button, int x, int y);
void kinc_internal_mouse_trigger_release(int button, int x, int y);
void kinc_internal_mouse_trigger_move(int x, int y);
void kinc_internal_mouse_trigger_scroll(int delta);
void kinc_internal_mouse_lock();
void kinc_internal_mouse_unlock(void);
void kinc_internal_mouse_window_activated();
void kinc_internal_mouse_window_deactivated();

#ifdef KINC_IMPLEMENTATION_ROOT
#define KINC_IMPLEMENTATION
#endif

#ifdef KINC_IMPLEMENTATION

#undef KINC_IMPLEMENTATION
#include <kinc/window.h>
#define KINC_IMPLEMENTATION

#include <memory.h>
#include <stddef.h>

static void (*mouse_press_callback)(int /*button*/, int /*x*/, int /*y*/, void * /*data*/) = NULL;
static void *mouse_press_callback_data = NULL;
static void (*mouse_release_callback)(int /*button*/, int /*x*/, int /*y*/, void * /*data*/) = NULL;
static void *mouse_release_callback_data = NULL;
static void (*mouse_move_callback)(int /*x*/, int /*y*/, int /*movementX*/, int /*movementY*/, void * /*data*/) = NULL;
static void *mouse_move_callback_data = NULL;
static void (*mouse_scroll_callback)(int /*delta*/, void * /*data*/) = NULL;
static void *mouse_scroll_callback_data = NULL;

void kinc_mouse_set_press_callback(void (*value)(int /*button*/, int /*x*/, int /*y*/, void * /*data*/), void *data) {
	mouse_press_callback = value;
	mouse_press_callback_data = data;
}

void kinc_mouse_set_release_callback(void (*value)(int /*button*/, int /*x*/, int /*y*/, void * /*data*/), void *data) {
	mouse_release_callback = value;
	mouse_release_callback_data = data;
}

void kinc_mouse_set_move_callback(void (*value)(int /*x*/, int /*y*/, int /*movement_x*/, int /*movement_y*/, void * /*data*/), void *data) {
	mouse_move_callback = value;
	mouse_move_callback_data = data;
}

void kinc_mouse_set_scroll_callback(void (*value)(int /*delta*/, void * /*data*/), void *data) {
	mouse_scroll_callback = value;
	mouse_scroll_callback_data = data;
}

void kinc_internal_mouse_trigger_release(int button, int x, int y) {
	if (mouse_release_callback != NULL) {
		mouse_release_callback(button, x, y, mouse_release_callback_data);
	}
}

void kinc_internal_mouse_trigger_scroll(int delta) {
	if (mouse_scroll_callback != NULL) {
		mouse_scroll_callback(delta, mouse_scroll_callback_data);
	}
}

void kinc_internal_mouse_window_activated() {
	if (kinc_mouse_is_locked()) {
		kinc_internal_mouse_lock();
	}
}
void kinc_internal_mouse_window_deactivated() {
	if (kinc_mouse_is_locked()) {
		kinc_internal_mouse_unlock();
	}
}

static bool moved = false;
static bool locked = false;
static int preLockWindow = 0;
static int preLockX = 0;
static int preLockY = 0;
static int centerX = 0;
static int centerY = 0;
static int lastX = 0;
static int lastY = 0;

void kinc_internal_mouse_trigger_press(int button, int x, int y) {
	lastX = x;
	lastY = y;
	if (mouse_press_callback != NULL) {
		mouse_press_callback(button, x, y, mouse_press_callback_data);
	}
}

void kinc_internal_mouse_trigger_move(int x, int y) {
	int movementX = 0;
	int movementY = 0;
	if (kinc_mouse_is_locked()) {
		movementX = x - centerX;
		movementY = y - centerY;
		if (movementX != 0 || movementY != 0) {
			kinc_mouse_set_position(centerX, centerY);
			x = centerX;
			y = centerY;
		}
	}
	else if (moved) {
		movementX = x - lastX;
		movementY = y - lastY;
	}
	moved = true;

	lastX = x;
	lastY = y;
	if (mouse_move_callback != NULL && (movementX != 0 || movementY != 0)) {
		mouse_move_callback(x, y, movementX, movementY, mouse_move_callback_data);
	}
}

bool kinc_mouse_is_locked(void) {
	return locked;
}

void kinc_mouse_lock() {
	if (!kinc_mouse_can_lock()) {
		return;
	}
	locked = true;
	kinc_internal_mouse_lock();
	kinc_mouse_get_position(&preLockX, &preLockY);
	centerX = kinc_window_width() / 2;
	centerY = kinc_window_height() / 2;
	kinc_mouse_set_position(centerX, centerY);
}

void kinc_mouse_unlock(void) {
	if (!kinc_mouse_can_lock()) {
		return;
	}
	moved = false;
	locked = false;
	kinc_internal_mouse_unlock();
	kinc_mouse_set_position(preLockX, preLockY);
}

#endif
