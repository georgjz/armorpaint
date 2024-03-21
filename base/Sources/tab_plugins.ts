
function tab_plugins_draw(htab: zui_handle_t) {
	let ui: zui_t = ui_base_ui;
	if (zui_tab(htab, tr("Plugins"))) {

		zui_begin_sticky();

		///if (is_paint || is_sculpt)
		zui_row([1 / 4]);
		///end
		///if is_lab
		zui_row([1 / 14]);
		///end

		if (zui_button(tr("Manager"))) {
			box_preferences_htab.position = 6; // Plugins
			box_preferences_show();
		}
		zui_end_sticky();

		// Draw plugins
		let values: plugin_t[] = map_to_array(plugin_map);
		for (let i: i32 = 0; i < values.length; ++i) {
			let p: plugin_t = values[i];
			if (p.draw_ui != null) {
				p.draw_ui(ui);
			}
		}
	}
}