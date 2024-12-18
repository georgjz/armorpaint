
let sim_running: bool = false;
let sim_transforms: mat4_box_t[];

function sim_init() {
    physics_world_create();
}

function sim_update() {

	render_path_raytrace_ready = false;

    if (sim_running) {
        // if (render_path_raytrace_frame != 1) {
            // return;
        // }

        let world: physics_world_t = physics_world_active;
	    physics_world_update(world);

        iron_delay_idle_sleep();

        // let record: bool = true;
        let record: bool = false;
        if (record) {
            let rt: render_target_t = map_get(render_path_render_targets, "taa");
            let pixels: buffer_t = image_get_pixels(rt._image);
            ///if (arm_metal || arm_vulkan)
            export_arm_bgra_swap(pixels);
            ///end
            iron_mp4_encode(pixels);
        }
    }
}

function sim_play() {
    sim_running = true;
    let rt: render_target_t = map_get(render_path_render_targets, "taa");
    iron_mp4_begin("/home/lubos/Desktop/test.mp4", rt._image.width, rt._image.height);

    // Save transforms
    sim_transforms = [];
    let pos: mesh_object_t[] = project_paint_objects;
    for (let i: i32 = 0; i < pos.length; ++i) {
        let m: mat4_box_t = { v: pos[i].base.transform.local };
        array_push(sim_transforms, m);
    }
}

function sim_stop() {
    sim_running = false;
    iron_mp4_end();

    // Restore transforms
    let pos: mesh_object_t[] = project_paint_objects;
    for (let i: i32 = 0; i < pos.length; ++i) {
        transform_set_matrix(pos[i].base.transform, sim_transforms[i].v);

        let pb: physics_body_t = map_get(physics_body_object_map, pos[i].base.uid);
        if (pb != null) {
            physics_body_sync_transform(pb);
        }
    }
}

function sim_add(o: object_t, shape: physics_shape_t, mass: f32) {
    let body: physics_body_t = physics_body_create();
    body.shape = shape;
    body.mass = mass;
    physics_body_init(body, o);
}

function sim_duplicate() {
    // Mesh
    let so: mesh_object_t = context_raw.selected_object.ext;
    let dup: mesh_object_t = scene_add_mesh_object(so.data, so.materials, so.base.parent);
    transform_set_matrix(dup.base.transform, so.base.transform.local);
    array_push(project_paint_objects, dup);
    dup.base.name = so.base.name;

    app_notify_on_next_frame(function() {
        util_mesh_merge();
    });

    // Physics
    let pb: physics_body_t = map_get(physics_body_object_map, so.base.uid);
    if (pb != null) {
        let pbdup: physics_body_t = physics_body_create();
        pbdup.shape = pb.shape;
        pbdup.mass = pb.mass;
        physics_body_init(pbdup, dup.base);
    }
}
