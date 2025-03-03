#pragma once

#include <kinc/global.h>
#include <kinc/g5_pipeline.h>
#include <kinc/backend/g5_compute.h>

typedef struct kinc_g5_compute_shader {
	kinc_g5_compute_shader_impl impl;
} kinc_g5_compute_shader;

void kinc_g5_compute_shader_init(kinc_g5_compute_shader *shader, void *source, int length);
void kinc_g5_compute_shader_destroy(kinc_g5_compute_shader *shader);
kinc_g5_constant_location_t kinc_g5_compute_shader_get_constant_location(kinc_g5_compute_shader *shader, const char *name);
kinc_g5_texture_unit_t kinc_g5_compute_shader_get_texture_unit(kinc_g5_compute_shader *shader, const char *name);
