
class History {

	static steps: TStep[];
	static undoI = 0; // Undo layer
	static undos = 0; // Undos available
	static redos = 0; // Redos available
	///if (is_paint || is_sculpt)
	static pushUndo = false; // Store undo on next paint
	static undoLayers: SlotLayer[] = null;
	///end
	///if is_sculpt
	static pushUndo2 = false;
	///end

	static undo = () => {
		if (History.undos > 0) {
			let active = History.steps.length - 1 - History.redos;
			let step = History.steps[active];

			if (step.name == tr("Edit Nodes")) {
				History.swapCanvas(step);
			}

			///if (is_paint || is_sculpt)
			else if (step.name == tr("New Layer") || step.name == tr("New Black Mask") || step.name == tr("New White Mask") || step.name == tr("New Fill Mask")) {
				Context.raw.layer = Project.layers[step.layer];
				Context.raw.layer.delete();
				Context.raw.layer = Project.layers[step.layer > 0 ? step.layer - 1 : 0];
			}
			else if (step.name == tr("New Group")) {
				Context.raw.layer = Project.layers[step.layer];
				// The layer below is the only layer in the group. Its layer masks are automatically unparented, too.
				Project.layers[step.layer - 1].parent = null;
				Context.raw.layer.delete();
				Context.raw.layer = Project.layers[step.layer > 0 ? step.layer - 1 : 0];
			}
			else if (step.name == tr("Delete Layer")) {
				let parent = step.layer_parent > 0 ? Project.layers[step.layer_parent - 1] : null;
				let l = new SlotLayer("", step.layer_type, parent);
				Project.layers.splice(step.layer, 0, l);
				Context.setLayer(l);
				History.undoI = History.undoI - 1 < 0 ? Config.raw.undo_steps - 1 : History.undoI - 1;
				let lay = History.undoLayers[History.undoI];
				l.swap(lay);
				l.maskOpacity = step.layer_opacity;
				l.blending = step.layer_blending;
				l.objectMask = step.layer_object;
				MakeMaterial.parseMeshMaterial();

				// Undo at least second time in order to avoid empty groups
				if (step.layer_type == LayerSlotType.SlotGroup) {
					Base.notifyOnNextFrame(() => {
						// 1. Undo deleting group masks
						let n = 1;
						while (History.steps[active - n].layer_type == LayerSlotType.SlotMask) {
							History.undo();
							++n;
						}
						// 2. Undo a mask to have a non empty group
						History.undo();
					});
				}
			}
			else if (step.name == tr("Clear Layer")) {
				History.undoI = History.undoI - 1 < 0 ? Config.raw.undo_steps - 1 : History.undoI - 1;
				let lay = History.undoLayers[History.undoI];
				Context.raw.layer.swap(lay);
				Context.raw.layerPreviewDirty = true;
			}
			else if (step.name == tr("Duplicate Layer")) {
				let children = Project.layers[step.layer].getRecursiveChildren();
				let position = step.layer + 1;
				if (children != null)
					position += children.length;

				Context.raw.layer = Project.layers[position];
				Context.raw.layer.delete();
			}
			else if (step.name == tr("Order Layers")) {
				let target = Project.layers[step.prev_order];
				Project.layers[step.prev_order] = Project.layers[step.layer];
				Project.layers[step.layer] = target;
			}
			else if (step.name == tr("Merge Layers")) {
				Context.raw.layer = Project.layers[step.layer];
				Context.raw.layer.delete();

				let parent = step.layer_parent > 0 ? Project.layers[step.layer_parent - 2] : null;
				let l = new SlotLayer("", step.layer_type, parent);
				Project.layers.splice(step.layer, 0, l);
				Context.setLayer(l);

				History.undoI = History.undoI - 1 < 0 ? Config.raw.undo_steps - 1 : History.undoI - 1;
				let lay = History.undoLayers[History.undoI];
				Context.raw.layer.swap(lay);

				l = new SlotLayer("", step.layer_type, parent);
				Project.layers.splice(step.layer + 1, 0, l);
				Context.setLayer(l);

				History.undoI = History.undoI - 1 < 0 ? Config.raw.undo_steps - 1 : History.undoI - 1;
				lay = History.undoLayers[History.undoI];
				Context.raw.layer.swap(lay);

				Context.raw.layer.maskOpacity = step.layer_opacity;
				Context.raw.layer.blending = step.layer_blending;
				Context.raw.layer.objectMask = step.layer_object;
				Context.raw.layersPreviewDirty = true;
				MakeMaterial.parseMeshMaterial();
			}
			else if (step.name == tr("Apply Mask")) {
				// First restore the layer(s)
				let maskPosition = step.layer;
				let currentLayer = null;
				// The layer at the old mask position is a mask, i.e. the layer had multiple masks before.
				if (Project.layers[maskPosition].isMask())
					currentLayer = Project.layers[maskPosition].parent;
				else if (Project.layers[maskPosition].isLayer() || Project.layers[maskPosition].isGroup())
					currentLayer = Project.layers[maskPosition];

				let layersToRestore = currentLayer.isGroup() ? currentLayer.getChildren() : [currentLayer];
				layersToRestore.reverse();

				for (let layer of layersToRestore) {
					// Replace the current layer's content with the old one
					Context.raw.layer = layer;
					History.undoI = History.undoI - 1 < 0 ? Config.raw.undo_steps - 1 : History.undoI - 1;
					let oldLayer = History.undoLayers[History.undoI];
					Context.raw.layer.swap(oldLayer);
				}

				// Now restore the applied mask
				History.undoI = History.undoI - 1 < 0 ? Config.raw.undo_steps - 1 : History.undoI - 1;
				let mask = History.undoLayers[History.undoI];
				Base.newMask(false, currentLayer, maskPosition);
				Context.raw.layer.swap(mask);
				Context.raw.layersPreviewDirty = true;
				Context.setLayer(Context.raw.layer);
			}
			else if (step.name == tr("Invert Mask")) {
				let _next = () => {
					Context.raw.layer = Project.layers[step.layer];
					Context.raw.layer.invertMask();
				}
				App.notifyOnInit(_next);
			}
			else if (step.name == "Apply Filter") {
				History.undoI = History.undoI - 1 < 0 ? Config.raw.undo_steps - 1 : History.undoI - 1;
				let lay = History.undoLayers[History.undoI];
				Context.setLayer(Project.layers[step.layer]);
				Context.raw.layer.swap(lay);
				Base.newMask(false, Context.raw.layer);
				Context.raw.layer.swap(lay);
				Context.raw.layerPreviewDirty = true;
			}
			else if (step.name == tr("To Fill Layer") || step.name == tr("To Fill Mask")) {
				Context.raw.layer.toPaintLayer();
				History.undoI = History.undoI - 1 < 0 ? Config.raw.undo_steps - 1 : History.undoI - 1;
				let lay = History.undoLayers[History.undoI];
				Context.raw.layer.swap(lay);
			}
			else if (step.name == tr("To Paint Layer") || step.name == tr("To Paint Mask")) {
				History.undoI = History.undoI - 1 < 0 ? Config.raw.undo_steps - 1 : History.undoI - 1;
				let lay = History.undoLayers[History.undoI];
				Context.raw.layer.swap(lay);
				Context.raw.layer.fill_layer = Project.materials[step.material];
			}
			else if (step.name == tr("Layer Opacity")) {
				Context.setLayer(Project.layers[step.layer]);
				let t = Context.raw.layer.maskOpacity;
				Context.raw.layer.maskOpacity = step.layer_opacity;
				step.layer_opacity = t;
				MakeMaterial.parseMeshMaterial();
			}
			else if (step.name == tr("Layer Blending")) {
				Context.setLayer(Project.layers[step.layer]);
				let t = Context.raw.layer.blending;
				Context.raw.layer.blending = step.layer_blending;
				step.layer_blending = t;
				MakeMaterial.parseMeshMaterial();
			}
			else if (step.name == tr("Delete Node Group")) {
				Project.materialGroups.splice(step.canvas_group, 0, { canvas: null, nodes: new Nodes() });
				History.swapCanvas(step);
			}
			else if (step.name == tr("New Material")) {
				Context.raw.material = Project.materials[step.material];
				step.canvas = Context.raw.material.canvas;
				Context.raw.material.delete();
			}
			else if (step.name == tr("Delete Material")) {
				Context.raw.material = new SlotMaterial(Project.materials[0].data);
				Project.materials.splice(step.material, 0, Context.raw.material);
				Context.raw.material.canvas = step.canvas;
				UINodes.canvasChanged();
				UINodes.getNodes().handle = new Handle();
				UINodes.hwnd.redraws = 2;
			}
			else if (step.name == tr("Duplicate Material")) {
				Context.raw.material = Project.materials[step.material];
				step.canvas = Context.raw.material.canvas;
				Context.raw.material.delete();
			}
			else { // Paint operation
				History.undoI = History.undoI - 1 < 0 ? Config.raw.undo_steps - 1 : History.undoI - 1;
				let lay = History.undoLayers[History.undoI];
				Context.selectPaintObject(Project.paintObjects[step.object]);
				Context.setLayer(Project.layers[step.layer]);
				Context.raw.layer.swap(lay);
				Context.raw.layerPreviewDirty = true;
			}
			///end

			History.undos--;
			History.redos++;
			Context.raw.ddirty = 2;

			///if (is_paint || is_sculpt)
			UIBase.hwnds[TabArea.TabSidebar0].redraws = 2;
			UIBase.hwnds[TabArea.TabSidebar1].redraws = 2;
			if (UIView2D.show) {
				UIView2D.hwnd.redraws = 2;
			}

			if (Config.raw.touch_ui) {
				// Refresh undo & redo buttons
				UIMenubar.menuHandle.redraws = 2;
			}
			///end
		}
	}

	static redo = () => {
		if (History.redos > 0) {
			let active = History.steps.length - History.redos;
			let step = History.steps[active];

			if (step.name == tr("Edit Nodes")) {
				History.swapCanvas(step);
			}

			///if (is_paint || is_sculpt)
			else if (step.name == tr("New Layer") || step.name == tr("New Black Mask") || step.name == tr("New White Mask") || step.name == tr("New Fill Mask")) {
				let parent = step.layer_parent > 0 ? Project.layers[step.layer_parent - 1] : null;
				let l = new SlotLayer("", step.layer_type, parent);
				Project.layers.splice(step.layer, 0, l);
				if (step.name == tr("New Black Mask")) {
					Base.notifyOnNextFrame(() => {
						l.clear(0x00000000);
					});
				}
				else if (step.name == tr("New White Mask")) {
					Base.notifyOnNextFrame(() => {
						l.clear(0xffffffff);
					});
				}
				else if (step.name == tr("New Fill Mask")) {
					Base.notifyOnNextFrame(() => {
						Context.raw.material = Project.materials[step.material];
						l.toFillLayer();
					});
				}
				Context.raw.layerPreviewDirty = true;
				Context.setLayer(l);
			}
			else if (step.name == tr("New Group")) {
				let l = Project.layers[step.layer - 1];
				let group = Base.newGroup();
				array_remove(Project.layers, group);
				Project.layers.splice(step.layer, 0, group);
				l.parent = group;
				Context.setLayer(group);
			}
			else if (step.name == tr("Delete Layer")) {
				Context.raw.layer = Project.layers[step.layer];
				History.swapActive();
				Context.raw.layer.delete();

				// Redoing the last delete would result in an empty group
				// Redo deleting all group masks + the group itself
				if (step.layer_type == LayerSlotType.SlotLayer && History.steps.length >= active + 2 && (History.steps[active + 1].layer_type == LayerSlotType.SlotGroup || History.steps[active + 1].layer_type == LayerSlotType.SlotMask)) {
					let n = 1;
					while (History.steps[active + n].layer_type == LayerSlotType.SlotMask) {
						++n;
					}
					Base.notifyOnNextFrame(() => {
						for (let i = 0; i < n; ++i) History.redo();
					});
				}
			}
			else if (step.name == tr("Clear Layer")) {
				Context.raw.layer = Project.layers[step.layer];
				History.swapActive();
				Context.raw.layer.clear();
				Context.raw.layerPreviewDirty = true;
			}
			else if (step.name == tr("Duplicate Layer")) {
				Context.raw.layer = Project.layers[step.layer];
				let _next = () => {
					Base.duplicateLayer(Context.raw.layer);
				}
				Base.notifyOnNextFrame(_next);
			}
			else if (step.name == tr("Order Layers")) {
				let target = Project.layers[step.prev_order];
				Project.layers[step.prev_order] = Project.layers[step.layer];
				Project.layers[step.layer] = target;
			}
			else if (step.name == tr("Merge Layers")) {
				Context.raw.layer = Project.layers[step.layer + 1];
				App.notifyOnInit(History.redoMergeLayers);
				App.notifyOnInit(Base.mergeDown);
			}
			else if (step.name == tr("Apply Mask")) {
				Context.raw.layer = Project.layers[step.layer];
					if (Context.raw.layer.isGroupMask()) {
						let group = Context.raw.layer.parent;
						let layers = group.getChildren();
						layers.splice(0, 0, Context.raw.layer);
						History.copyMergingLayers2(layers);
					}
					else History.copyMergingLayers2([Context.raw.layer, Context.raw.layer.parent]);

				let _next = () => {
					Context.raw.layer.applyMask();
					Context.setLayer(Context.raw.layer);
					Context.raw.layersPreviewDirty = true;
				}
				Base.notifyOnNextFrame(_next);
			}
			else if (step.name == tr("Invert Mask")) {
				let _next = () => {
					Context.raw.layer = Project.layers[step.layer];
					Context.raw.layer.invertMask();
				}
				App.notifyOnInit(_next);
			}
			else if (step.name == tr("Apply Filter")) {
				let lay = History.undoLayers[History.undoI];
				Context.setLayer(Project.layers[step.layer]);
				Context.raw.layer.swap(lay);
				Base.newMask(false, lay);
				Context.raw.layer.swap(lay);
				Context.raw.layerPreviewDirty = true;
				History.undoI = (History.undoI + 1) % Config.raw.undo_steps;
			}
			else if (step.name == tr("To Fill Layer") || step.name == tr("To Fill Mask")) {
				let lay = History.undoLayers[History.undoI];
				Context.raw.layer.swap(lay);
				Context.raw.layer.fill_layer = Project.materials[step.material];
				History.undoI = (History.undoI + 1) % Config.raw.undo_steps;
			}
			else if (step.name == tr("To Paint Layer") || step.name == tr("To Paint Mask")) {
				Context.raw.layer.toPaintLayer();
				let lay = History.undoLayers[History.undoI];
				Context.raw.layer.swap(lay);
				History.undoI = (History.undoI + 1) % Config.raw.undo_steps;
			}
			else if (step.name == tr("Layer Opacity")) {
				Context.setLayer(Project.layers[step.layer]);
				let t = Context.raw.layer.maskOpacity;
				Context.raw.layer.maskOpacity = step.layer_opacity;
				step.layer_opacity = t;
				MakeMaterial.parseMeshMaterial();
			}
			else if (step.name == tr("Layer Blending")) {
				Context.setLayer(Project.layers[step.layer]);
				let t = Context.raw.layer.blending;
				Context.raw.layer.blending = step.layer_blending;
				step.layer_blending = t;
				MakeMaterial.parseMeshMaterial();
			}
			else if (step.name == tr("Delete Node Group")) {
				History.swapCanvas(step);
				array_remove(Project.materialGroups, Project.materialGroups[step.canvas_group]);
			}
			else if (step.name == tr("New Material")) {
				Context.raw.material = new SlotMaterial(Project.materials[0].data);
				Project.materials.splice(step.material, 0, Context.raw.material);
				Context.raw.material.canvas = step.canvas;
				UINodes.canvasChanged();
				UINodes.getNodes().handle = new Handle();
				UINodes.hwnd.redraws = 2;
			}
			else if (step.name == tr("Delete Material")) {
				Context.raw.material = Project.materials[step.material];
				step.canvas = Context.raw.material.canvas;
				Context.raw.material.delete();
			}
			else if (step.name == tr("Duplicate Material")) {
				Context.raw.material = new SlotMaterial(Project.materials[0].data);
				Project.materials.splice(step.material, 0, Context.raw.material);
				Context.raw.material.canvas = step.canvas;
				UINodes.canvasChanged();
				UINodes.getNodes().handle = new Handle();
				UINodes.hwnd.redraws = 2;
			}
			else { // Paint operation
				let lay = History.undoLayers[History.undoI];
				Context.selectPaintObject(Project.paintObjects[step.object]);
				Context.setLayer(Project.layers[step.layer]);
				Context.raw.layer.swap(lay);
				Context.raw.layerPreviewDirty = true;
				History.undoI = (History.undoI + 1) % Config.raw.undo_steps;
			}
			///end

			History.undos++;
			History.redos--;
			Context.raw.ddirty = 2;

			///if (is_paint || is_sculpt)
			UIBase.hwnds[TabArea.TabSidebar0].redraws = 2;
			UIBase.hwnds[TabArea.TabSidebar1].redraws = 2;
			if (UIView2D.show) UIView2D.hwnd.redraws = 2;

			if (Config.raw.touch_ui) {
				// Refresh undo & redo buttons
				UIMenubar.menuHandle.redraws = 2;
			}
			///end
		}
	}

	static reset = () => {
		///if (is_paint || is_sculpt)
		History.steps = [{name: tr("New"), layer: 0, layer_type: LayerSlotType.SlotLayer, layer_parent: -1, object: 0, material: 0, brush: 0}];
		///end
		///if is_lab
		History.steps = [{name: tr("New")}];
		///end

		History.undos = 0;
		History.redos = 0;
		History.undoI = 0;
	}

	///if (is_paint || is_sculpt)
	static editNodes = (canvas: TNodeCanvas, canvas_type: i32, canvas_group: Null<i32> = null) => {
	///end
	///if is_lab
	static editNodes = (canvas: TNodeCanvas, canvas_group: Null<i32> = null) => {
	///end
		let step = History.push(tr("Edit Nodes"));
		step.canvas_group = canvas_group;
		///if (is_paint || is_sculpt)
		step.canvas_type = canvas_type;
		///end
		step.canvas = JSON.parse(JSON.stringify(canvas));
	}

	///if (is_paint || is_sculpt)
	static paint = () => {
		let isMask = Context.raw.layer.isMask();
		History.copyToUndo(Context.raw.layer.id, History.undoI, isMask);

		History.pushUndo = false;
		History.push(tr(UIToolbar.toolNames[Context.raw.tool]));
	}

	static newLayer = () => {
		History.push(tr("New Layer"));
	}

	static newBlackMask = () => {
		History.push(tr("New Black Mask"));
	}

	static newWhiteMask = () => {
		History.push(tr("New White Mask"));
	}

	static newFillMask = () => {
		History.push(tr("New Fill Mask"));
	}

	static newGroup = () => {
		History.push(tr("New Group"));
	}

	static duplicateLayer = () => {
		History.push(tr("Duplicate Layer"));
	}

	static deleteLayer = () => {
		History.swapActive();
		History.push(tr("Delete Layer"));
	}

	static clearLayer = () => {
		History.swapActive();
		History.push(tr("Clear Layer"));
	}

	static orderLayers = (prevOrder: i32) => {
		let step = History.push(tr("Order Layers"));
		step.prev_order = prevOrder;
	}

	static mergeLayers = () => {
		History.copyMergingLayers();

		let step = History.push(tr("Merge Layers"));
		step.layer -= 1; // Merge down
		if (Context.raw.layer.hasMasks()) {
			step.layer -= Context.raw.layer.getMasks().length;
		}
		History.steps.shift(); // Merge consumes 2 steps
		History.undos--;
		// TODO: use undo layer in App.mergeDown to save memory
	}

	static applyMask = () => {
		if (Context.raw.layer.isGroupMask()) {
			let group = Context.raw.layer.parent;
			let layers = group.getChildren();
			layers.splice(0, 0, Context.raw.layer);
			History.copyMergingLayers2(layers);
		}
		else History.copyMergingLayers2([Context.raw.layer, Context.raw.layer.parent]);
		History.push(tr("Apply Mask"));
	}


	static invertMask = () => {
		History.push(tr("Invert Mask"));
	}

	// @:keep
	static applyFilter = () => {
		History.copyToUndo(Context.raw.layer.id, History.undoI, true);
		History.push(tr("Apply Filter"));
	}

	static toFillLayer = () => {
		History.copyToUndo(Context.raw.layer.id, History.undoI, false);
		History.push(tr("To Fill Layer"));
	}

	static toFillMask = () => {
		History.copyToUndo(Context.raw.layer.id, History.undoI, true);
		History.push(tr("To Fill Mask"));
	}

	static toPaintLayer = () => {
		History.copyToUndo(Context.raw.layer.id, History.undoI, false);
		History.push(tr("To Paint Layer"));
	}

	static toPaintMask = () => {
		History.copyToUndo(Context.raw.layer.id, History.undoI, true);
		History.push(tr("To Paint Mask"));
	}

	static layerOpacity = () => {
		History.push(tr("Layer Opacity"));
	}

	// static layerObject = () => {
	// 	History.push("Layer Object");
	// }

	static layerBlending = () => {
		History.push(tr("Layer Blending"));
	}

	static newMaterial = () => {
		let step = History.push(tr("New Material"));
		step.canvas_type = 0;
		step.canvas = JSON.parse(JSON.stringify(Context.raw.material.canvas));
	}

	static deleteMaterial = () => {
		let step = History.push(tr("Delete Material"));
		step.canvas_type = 0;
		step.canvas = JSON.parse(JSON.stringify(Context.raw.material.canvas));
	}

	static duplicateMaterial = () => {
		let step = History.push(tr("Duplicate Material"));
		step.canvas_type = 0;
		step.canvas = JSON.parse(JSON.stringify(Context.raw.material.canvas));
	}

	static deleteMaterialGroup = (group: TNodeGroup) => {
		let step = History.push(tr("Delete Node Group"));
		step.canvas_type = CanvasType.CanvasMaterial;
		step.canvas_group = Project.materialGroups.indexOf(group);
		step.canvas = JSON.parse(JSON.stringify(group.canvas));
	}
	///end

	static push = (name: string): TStep => {
		///if (krom_windows || krom_linux || krom_darwin)
		let filename = Project.filepath == "" ? UIFiles.filename : Project.filepath.substring(Project.filepath.lastIndexOf(Path.sep) + 1, Project.filepath.length - 4);
		System.title = filename + "* - " + Manifest.title;
		///end

		if (Config.raw.touch_ui) {
			// Refresh undo & redo buttons
			UIMenubar.menuHandle.redraws = 2;
		}

		if (History.undos < Config.raw.undo_steps) History.undos++;
		if (History.redos > 0) {
			for (let i = 0; i < History.redos; ++i) History.steps.pop();
			History.redos = 0;
		}

		///if (is_paint || is_sculpt)
		let opos = Project.paintObjects.indexOf(Context.raw.paintObject);
		let lpos = Project.layers.indexOf(Context.raw.layer);
		let mpos = Project.materials.indexOf(Context.raw.material);
		let bpos = Project.brushes.indexOf(Context.raw.brush);

		History.steps.push({
			name: name,
			layer: lpos,
			layer_type: Context.raw.layer.isMask() ? LayerSlotType.SlotMask : Context.raw.layer.isGroup() ? LayerSlotType.SlotGroup : LayerSlotType.SlotLayer,
			layer_parent: Context.raw.layer.parent == null ? -1 : Project.layers.indexOf(Context.raw.layer.parent),
			object: opos,
			material: mpos,
			brush: bpos,
			layer_opacity: Context.raw.layer.maskOpacity,
			layer_object: Context.raw.layer.objectMask,
			layer_blending: Context.raw.layer.blending
		});
		///end

		///if is_lab
		History.steps.push({
			name: name
		});
		///end

		while (History.steps.length > Config.raw.undo_steps + 1) History.steps.shift();
		return History.steps[History.steps.length - 1];
	}

	///if (is_paint || is_sculpt)
	static redoMergeLayers = () => {
		History.copyMergingLayers();
	}

	static copyMergingLayers = () => {
		let lay = Context.raw.layer;
		History.copyToUndo(lay.id, History.undoI, Context.raw.layer.isMask());

		let below = Project.layers.indexOf(lay) - 1;
		lay = Project.layers[below];
		History.copyToUndo(lay.id, History.undoI, Context.raw.layer.isMask());
	}

	static copyMergingLayers2 = (layers: SlotLayer[]) => {
		for (let layer of layers)
		History.copyToUndo(layer.id, History.undoI, layer.isMask());
	}

	static swapActive = () => {
		let undoLayer = History.undoLayers[History.undoI];
		undoLayer.swap(Context.raw.layer);
		History.undoI = (History.undoI + 1) % Config.raw.undo_steps;
	}

	static copyToUndo = (fromId: i32, toId: i32, isMask: bool) => {
		let path = RenderPath.active;

		///if is_sculpt
		isMask = true;
		///end

		if (isMask) {
			path.setTarget("texpaint_undo" + toId);
			path.bindTarget("texpaint" + fromId, "tex");
			// path.drawShader("shader_datas/copy_pass/copyR8_pass");
			path.drawShader("shader_datas/copy_pass/copy_pass");
		}
		else {
			path.setTarget("texpaint_undo" + toId, ["texpaint_nor_undo" + toId, "texpaint_pack_undo" + toId]);
			path.bindTarget("texpaint" + fromId, "tex0");
			path.bindTarget("texpaint_nor" + fromId, "tex1");
			path.bindTarget("texpaint_pack" + fromId, "tex2");
			path.drawShader("shader_datas/copy_mrt3_pass/copy_mrt3_pass");
		}
		History.undoI = (History.undoI + 1) % Config.raw.undo_steps;
	}
	///end

	static getCanvasOwner = (step: TStep): any => {
		///if (is_paint || is_sculpt)
		return step.canvas_group == null ?
			Project.materials[step.material] :
			Project.materialGroups[step.canvas_group];
		///end

		///if is_lab
		return null;
		///end
	}

	static swapCanvas = (step: TStep) => {
		///if (is_paint || is_sculpt)
		if (step.canvas_type == 0) {
			let _canvas = History.getCanvasOwner(step).canvas;
			History.getCanvasOwner(step).canvas = step.canvas;
			step.canvas = _canvas;
			Context.raw.material = Project.materials[step.material];
		}
		else {
			let _canvas = Project.brushes[step.brush].canvas;
			Project.brushes[step.brush].canvas = step.canvas;
			step.canvas = _canvas;
			Context.raw.brush = Project.brushes[step.brush];
		}
		///end

		///if is_lab
		let _canvas = History.getCanvasOwner(step).canvas;
		History.getCanvasOwner(step).canvas = step.canvas;
		step.canvas = _canvas;
		///end

		UINodes.canvasChanged();
		UINodes.getNodes().handle = new Handle();
		UINodes.hwnd.redraws = 2;
	}
}

type TStep = {
	name: string;
	canvas?: TNodeCanvas; // Node history
	canvas_group?: i32;
	///if (is_paint || is_sculpt)
	layer: i32;
	layer_type: LayerSlotType;
	layer_parent: i32;
	object: i32;
	material: i32;
	brush: i32;
	layer_opacity?: f32;
	layer_object?: i32;
	layer_blending?: i32;
	prev_order?: i32; // Previous layer position
	canvas_type?: i32;
	///end
}