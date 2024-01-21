
class UniformsExt {

	static vec = new Vec4();
	static orthoP = Mat4.ortho(-0.5, 0.5, -0.5, 0.5, -0.5, 0.5);

	static init = () => {
		Uniforms.externalIntLinks = [UniformsExt.linkInt];
		Uniforms.externalFloatLinks = [UniformsExt.linkFloat];
		Uniforms.externalVec2Links = [UniformsExt.linkVec2];
		Uniforms.externalVec3Links = [UniformsExt.linkVec3];
		Uniforms.externalVec4Links = [UniformsExt.linkVec4];
		Uniforms.externalMat4Links = [UniformsExt.linkMat4];
		Uniforms.externalTextureLinks = [UniformsExt.linkTex];
	}

	static linkInt = (object: BaseObject, mat: MaterialData, link: string): Null<i32> => {
		return null;
	}

	static linkFloat = (object: BaseObject, mat: MaterialData, link: string): Null<f32> => {
		switch (link) {
			case "_brushRadius": {
				///if (is_paint || is_sculpt)
				let decal = Context.raw.tool == WorkspaceTool.ToolDecal || Context.raw.tool == WorkspaceTool.ToolText;
				let decalMask = decal && Operator.shortcut(Config.keymap.decal_mask + "+" + Config.keymap.action_paint, ShortcutType.ShortcutDown);
				let brushDecalMaskRadius = Context.raw.brushDecalMaskRadius;
				if (Config.raw.brush_3d) {
					brushDecalMaskRadius *= Context.raw.paint2d ? 0.55 * UIView2D.panScale : 2.0;
				}
				let radius = decalMask ? brushDecalMaskRadius : Context.raw.brushRadius;
				let val = (radius * Context.raw.brushNodesRadius) / 15.0;
				let pen = Input.getPen();
				if (Config.raw.pressure_radius && pen.down()) {
					val *= pen.pressure * Config.raw.pressure_sensitivity;
				}
				let scale2d = (900 / Base.h()) * Config.raw.window_scale;

				if (Config.raw.brush_3d && !decal) {
					val *= Context.raw.paint2d ? 0.55 * scale2d * UIView2D.panScale : 2;
				}
				else {
					val *= scale2d; // Projection ratio
				}
				///end

				///if is_lab
				let radius = Context.raw.brushRadius;
				let val = radius / 15.0;
				let pen = Input.getPen();
				if (Config.raw.pressure_radius && pen.down()) {
					val *= pen.pressure * Config.raw.pressure_sensitivity;
				}
				val *= 2;
				///end

				return val;
			}
			case "_vignetteStrength": {
				return Config.raw.rp_vignette;
			}
			case "_grainStrength": {
				return Config.raw.rp_grain;
			}
			case "_coneOffset": {
				return Context.raw.vxaoOffset;
			}
			case "_coneAperture": {
				return Context.raw.vxaoAperture;
			}

			///if (is_paint || is_sculpt)
			case "_brushScaleX": {
				return 1 / Context.raw.brushScaleX;
			}
			case "_brushOpacity": {
				let val = Context.raw.brushOpacity * Context.raw.brushNodesOpacity;
				let pen = Input.getPen();
				if (Config.raw.pressure_opacity && pen.down()) {
					val *= pen.pressure * Config.raw.pressure_sensitivity;
				}
				return val;
			}
			case "_brushHardness": {
				let decal = Context.raw.tool == WorkspaceTool.ToolDecal || Context.raw.tool == WorkspaceTool.ToolText;
				let decalMask = Operator.shortcut(Config.keymap.decal_mask + "+" + Config.keymap.action_paint, ShortcutType.ShortcutDown);
				if (Context.raw.tool != WorkspaceTool.ToolBrush && Context.raw.tool != WorkspaceTool.ToolEraser && Context.raw.tool != WorkspaceTool.ToolClone && !decalMask) return 1.0;
				let val = Context.raw.brushHardness * Context.raw.brushNodesHardness;
				let pen = Input.getPen();
				if (Config.raw.pressure_hardness && pen.down()) {
					val *= pen.pressure * Config.raw.pressure_sensitivity;
				}
				if (Config.raw.brush_3d) {
					if (Context.raw.paint2d) {
						val *= 1.0 / UIView2D.panScale;
					}
					else {
						val *= val;
					}
				}
				return val;
			}
			case "_brushScale": {
				let fill = Context.raw.layer.fill_layer != null;
				let val = (fill ? Context.raw.layer.scale : Context.raw.brushScale) * Context.raw.brushNodesScale;
				return val;
			}
			case "_objectId": {
				return Project.paintObjects.indexOf(object as MeshObject);
			}
			///if is_paint
			case "_dilateRadius": {
				return UtilUV.dilatemap != null ? Config.raw.dilate_radius : 0.0;
			}
			///end
			case "_decalLayerDim": {
				return Context.raw.layer.decalMat.getScale().z * 0.5;
			}
			case "_pickerOpacity": {
				return Context.raw.pickedColor.opacity;
			}
			case "_pickerOcclusion": {
				return Context.raw.pickedColor.occlusion;
			}
			case "_pickerRoughness": {
				return Context.raw.pickedColor.roughness;
			}
			case "_pickerMetallic": {
				return Context.raw.pickedColor.metallic;
			}
			case "_pickerHeight": {
				return Context.raw.pickedColor.height;
			}
			///end
		}
		if (ParserMaterial.script_links != null) {
			for (let key of ParserMaterial.script_links.keys()) {
				let asciprt_links: any = ParserMaterial.script_links;
				let script = asciprt_links[key];
				let result = 0.0;
				if (script != "") {
					try {
						result = eval(script);
					}
					catch(e: any) {
						Console.log(e);
					}
				}
				return result;
			}
		}
		return null;
	}

	static linkVec2 = (object: BaseObject, mat: MaterialData, link: string): Vec4 => {
		switch (link) {
			case "_gbufferSize": {
				UniformsExt.vec.set(0, 0, 0);
				let gbuffer2 = RenderPath.active.renderTargets.get("gbuffer2");
				UniformsExt.vec.set(gbuffer2.image.width, gbuffer2.image.height, 0);
				return UniformsExt.vec;
			}
			case "_cloneDelta": {
				UniformsExt.vec.set(Context.raw.cloneDeltaX, Context.raw.cloneDeltaY, 0);
				return UniformsExt.vec;
			}
			case "_texpaintSize": {
				UniformsExt.vec.set(Config.getTextureResX(), Config.getTextureResY(), 0);
				return UniformsExt.vec;
			}
			///if (is_paint || is_sculpt)
			case "_brushAngle": {
				let brushAngle = Context.raw.brushAngle + Context.raw.brushNodesAngle;
				let angle = Context.raw.layer.fill_layer != null ? Context.raw.layer.angle : brushAngle;
				angle *= (Math.PI / 180);
				let pen = Input.getPen();
				if (Config.raw.pressure_angle && pen.down()) {
					angle *= pen.pressure * Config.raw.pressure_sensitivity;
				}
				UniformsExt.vec.set(Math.cos(-angle), Math.sin(-angle), 0);
				return UniformsExt.vec;
			}
			///end
		}
		return null;
	}

	static linkVec3 = (object: BaseObject, mat: MaterialData, link: string): Vec4 => {
		let v: Vec4 = null;
		switch (link) {
			///if (is_paint || is_sculpt)
			case "_brushDirection": {
				v = Uniforms.helpVec;
				// Discard first paint for directional brush
				let allowPaint = Context.raw.prevPaintVecX != Context.raw.lastPaintVecX &&
								 Context.raw.prevPaintVecY != Context.raw.lastPaintVecY &&
								 Context.raw.prevPaintVecX > 0 &&
								 Context.raw.prevPaintVecY > 0;
				let x = Context.raw.paintVec.x;
				let y = Context.raw.paintVec.y;
				let lastx = Context.raw.prevPaintVecX;
				let lasty = Context.raw.prevPaintVecY;
				if (Context.raw.paint2d) {
					x = UniformsExt.vec2d(x);
					lastx = UniformsExt.vec2d(lastx);
				}
				let angle = Math.atan2(-y + lasty, x - lastx) - Math.PI / 2;
				v.set(Math.cos(angle), Math.sin(angle), allowPaint ? 1 : 0);
				Context.raw.prevPaintVecX = Context.raw.lastPaintVecX;
				Context.raw.prevPaintVecY = Context.raw.lastPaintVecY;
				return v;
			}
			case "_decalLayerLoc": {
				v = Uniforms.helpVec;
				v.set(Context.raw.layer.decalMat._30, Context.raw.layer.decalMat._31, Context.raw.layer.decalMat._32);
				return v;
			}
			case "_decalLayerNor": {
				v = Uniforms.helpVec;
				v.set(Context.raw.layer.decalMat._20, Context.raw.layer.decalMat._21, Context.raw.layer.decalMat._22).normalize();
				return v;
			}
			case "_pickerBase": {
				v = Uniforms.helpVec;
				v.set(
					color_get_rb(Context.raw.pickedColor.base) / 255,
					color_get_gb(Context.raw.pickedColor.base) / 255,
					color_get_bb(Context.raw.pickedColor.base) / 255
				);
				return v;
			}
			case "_pickerNormal": {
				v = Uniforms.helpVec;
				v.set(
					color_get_rb(Context.raw.pickedColor.normal) / 255,
					color_get_gb(Context.raw.pickedColor.normal) / 255,
					color_get_bb(Context.raw.pickedColor.normal) / 255
				);
				return v;
			}
			///if arm_physics
			case "_particleHit": {
				v = Uniforms.helpVec;
				v.set(Context.raw.particleHitX, Context.raw.particleHitY, Context.raw.particleHitZ);
				return v;
			}
			case "_particleHitLast": {
				v = Uniforms.helpVec;
				v.set(Context.raw.lastParticleHitX, Context.raw.lastParticleHitY, Context.raw.lastParticleHitZ);
				return v;
			}
			///end
			///end
		}

		return v;
	}

	///if (is_paint || is_sculpt)
	static vec2d = (x: f32) => {
		// Transform from 3d viewport coord to 2d view coord
		Context.raw.paint2dView = false;
		let res = (x * Base.w() - Base.w()) / UIView2D.ww;
		Context.raw.paint2dView = true;
		return res;
	}
	///end

	static linkVec4 = (object: BaseObject, mat: MaterialData, link: string): Vec4 => {
		switch (link) {
			case "_inputBrush": {
				let down = Input.getMouse().down() || Input.getPen().down();
				UniformsExt.vec.set(Context.raw.paintVec.x, Context.raw.paintVec.y, down ? 1.0 : 0.0, 0.0);

				///if (is_paint || is_sculpt)
				if (Context.raw.paint2d) {
					UniformsExt.vec.x = UniformsExt.vec2d(UniformsExt.vec.x);
				}
				///end

				return UniformsExt.vec;
			}
			case "_inputBrushLast": {
				let down = Input.getMouse().down() || Input.getPen().down();
				UniformsExt.vec.set(Context.raw.lastPaintVecX, Context.raw.lastPaintVecY, down ? 1.0 : 0.0, 0.0);

				///if (is_paint || is_sculpt)
				if (Context.raw.paint2d) {
					UniformsExt.vec.x = UniformsExt.vec2d(UniformsExt.vec.x);
				}
				///end

				return UniformsExt.vec;
			}
			case "_envmapData": {
				UniformsExt.vec.set(Context.raw.envmapAngle, Math.sin(-Context.raw.envmapAngle), Math.cos(-Context.raw.envmapAngle), Scene.active.world.probe.raw.strength);
				return UniformsExt.vec;
			}
			case "_envmapDataWorld": {
				UniformsExt.vec.set(Context.raw.envmapAngle, Math.sin(-Context.raw.envmapAngle), Math.cos(-Context.raw.envmapAngle), Context.raw.showEnvmap ? Scene.active.world.probe.raw.strength : 1.0);
				return UniformsExt.vec;
			}
			///if (is_paint || is_sculpt)
			case "_stencilTransform": {
				UniformsExt.vec.set(Context.raw.brushStencilX, Context.raw.brushStencilY, Context.raw.brushStencilScale, Context.raw.brushStencilAngle);
				if (Context.raw.paint2d) UniformsExt.vec.x = UniformsExt.vec2d(UniformsExt.vec.x);
				return UniformsExt.vec;
			}
			case "_decalMask": {
				let decal = Context.raw.tool == WorkspaceTool.ToolDecal || Context.raw.tool == WorkspaceTool.ToolText;
				let decalMask = Operator.shortcut(Config.keymap.decal_mask + "+" + Config.keymap.action_paint, ShortcutType.ShortcutDown);
				let val = (Context.raw.brushRadius * Context.raw.brushNodesRadius) / 15.0;
				let scale2d = (900 / Base.h()) * Config.raw.window_scale;
				val *= scale2d; // Projection ratio
				UniformsExt.vec.set(Context.raw.decalX, Context.raw.decalY, decalMask ? 1 : 0, val);
				if (Context.raw.paint2d) UniformsExt.vec.x = UniformsExt.vec2d(UniformsExt.vec.x);
				return UniformsExt.vec;
			}
			///end
		}
		return null;
	}

	static linkMat4 = (object: BaseObject, mat: MaterialData, link: string): Mat4 => {
		switch (link) {
			///if (is_paint || is_sculpt)
			case "_decalLayerMatrix": { // Decal layer
				let camera = Scene.active.camera;
				let m = Uniforms.helpMat;
				m.setFrom(Context.raw.layer.decalMat);
				m.getInverse(m);
				m.multmat(UniformsExt.orthoP);
				return m;
			}
			///end
		}
		return null;
	}

	static linkTex = (object: BaseObject, mat: MaterialData, link: string): Image => {
		switch (link) {
			case "_texpaint_undo": {
				///if (is_paint || is_sculpt)
				let i = History.undoI - 1 < 0 ? Config.raw.undo_steps - 1 : History.undoI - 1;
				return RenderPath.active.renderTargets.get("texpaint_undo" + i).image;
				///end

				///if is_lab
				return null;
				///end
			}
			case "_texpaint_nor_undo": {
				///if (is_paint || is_sculpt)
				let i = History.undoI - 1 < 0 ? Config.raw.undo_steps - 1 : History.undoI - 1;
				return RenderPath.active.renderTargets.get("texpaint_nor_undo" + i).image;
				///end

				///if is_lab
				return null;
				///end
			}
			case "_texpaint_pack_undo": {
				///if (is_paint || is_sculpt)
				let i = History.undoI - 1 < 0 ? Config.raw.undo_steps - 1 : History.undoI - 1;
				return RenderPath.active.renderTargets.get("texpaint_pack_undo" + i).image;
				///end

				///if is_lab
				return null;
				///end
			}

			case "_ltcMat": {
				if (ConstData.ltcMatTex == null) ConstData.initLTC();
				return ConstData.ltcMatTex;
			}
			case "_ltcMag": {
				if (ConstData.ltcMagTex == null) ConstData.initLTC();
				return ConstData.ltcMagTex;
			}

			///if (is_paint || is_sculpt)
			case "_texcolorid": {
				if (Project.assets.length == 0) return RenderPath.active.renderTargets.get("empty_white").image;
				else return Project.getImage(Project.assets[Context.raw.colorIdHandle.position]);
			}
			case "_textexttool": { // Opacity map for text
				return Context.raw.textToolImage;
			}
			case "_texbrushmask": {
				return Context.raw.brushMaskImage;
			}
			case "_texbrushstencil": {
				return Context.raw.brushStencilImage;
			}
			case "_texparticle": {
				return RenderPath.active.renderTargets.get("texparticle").image;
			}
			///end

			///if is_paint
			case "_texuvmap": {
				if (!UtilUV.uvmapCached) {
					let _init = () => {
						UtilUV.cacheUVMap();
					}
					App.notifyOnInit(_init);
				}
				return UtilUV.uvmap;
			}
			case "_textrianglemap": {
				if (!UtilUV.trianglemapCached) {
					let _init = () => {
						UtilUV.cacheTriangleMap();
					}
					App.notifyOnInit(_init);
				}
				return UtilUV.trianglemap;
			}
			case "_texuvislandmap": {
				let _init = () => {
					UtilUV.cacheUVIslandMap();
				}
				App.notifyOnInit(_init);
				return UtilUV.uvislandmapCached ? UtilUV.uvislandmap : RenderPath.active.renderTargets.get("empty_black").image;
			}
			case "_texdilatemap": {
				return UtilUV.dilatemap;
			}
			///end
		}

		if (link.startsWith("_texpaint_pack_vert")) {
			let tid = link.substr(link.length - 1);
			return RenderPath.active.renderTargets.get("texpaint_pack" + tid).image;
		}

		if (link.startsWith("_texpaint_vert")) {
			///if (is_paint || is_sculpt)
			let tid = Number(link.substr(link.length - 1));
			return tid < Project.layers.length ? Project.layers[tid].texpaint : null;
			///end

			///if is_lab
			return BrushOutputNode.inst.texpaint;
			///end
		}
		if (link.startsWith("_texpaint_nor")) {
			///if is_paint
			let tid = Number(link.substr(link.length - 1));
			return tid < Project.layers.length ? Project.layers[tid].texpaint_nor : null;
			///end

			///if is_lab
			return BrushOutputNode.inst.texpaint_nor;
			///end
		}
		if (link.startsWith("_texpaint_pack")) {
			///if is_paint
			let tid = Number(link.substr(link.length - 1));
			return tid < Project.layers.length ? Project.layers[tid].texpaint_pack : null;
			///end

			///if is_lab
			return BrushOutputNode.inst.texpaint_pack;
			///end
		}
		if (link.startsWith("_texpaint")) {
			///if (is_paint || is_sculpt)
			let tid = Number(link.substr(link.length - 1));
			return tid < Project.layers.length ? Project.layers[tid].texpaint : null;
			///end

			///if is_lab
			return BrushOutputNode.inst.texpaint;
			///end
		}

		///if (is_paint || is_sculpt)
		if (link.startsWith("_texblur_")) {
			let id = link.substr(9);
			return Context.raw.nodePreviews != null ? Context.raw.nodePreviews.get(id) : RenderPath.active.renderTargets.get("empty_black").image;
		}
		if (link.startsWith("_texwarp_")) {
			let id = link.substr(9);
			return Context.raw.nodePreviews != null ? Context.raw.nodePreviews.get(id) : RenderPath.active.renderTargets.get("empty_black").image;
		}
		if (link.startsWith("_texbake_")) {
			let id = link.substr(9);
			return Context.raw.nodePreviews != null ? Context.raw.nodePreviews.get(id) : RenderPath.active.renderTargets.get("empty_black").image;
		}
		///end

		return null;
	}
}