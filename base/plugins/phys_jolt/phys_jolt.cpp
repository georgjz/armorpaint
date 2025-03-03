
#include "phys_jolt.h"
#include <Jolt/Jolt.h>
#include <Jolt/RegisterTypes.h>
#include <Jolt/Core/Factory.h>
#include <Jolt/Core/TempAllocator.h>
#include <Jolt/Core/JobSystemThreadPool.h>
#include <Jolt/Physics/PhysicsSettings.h>
#include <Jolt/Physics/PhysicsSystem.h>
#include <Jolt/Physics/Collision/Shape/BoxShape.h>
#include <Jolt/Physics/Collision/Shape/SphereShape.h>
#include <Jolt/Physics/Collision/Shape/MeshShape.h>
#include <Jolt/Physics/Collision/Shape/ConvexHullShape.h>
#include <Jolt/Physics/Collision/Shape/HeightFieldShape.h>
#include <Jolt/Physics/Body/BodyCreationSettings.h>
#include <Jolt/Physics/Body/MotionQuality.h>
#include <kinc/vector.h>
#include <kinc/quaternion.h>
#include "iron_array.h"

JPH_SUPPRESS_WARNINGS
using namespace JPH;
using namespace JPH::literals;

PhysicsSystem *physics_system;
TempAllocatorImpl *temp_allocator;
JobSystemThreadPool *job_system;
physics_pair_t ppair;

static void TraceImpl(const char *inFMT, ...) {
}

namespace Layers {
	static constexpr ObjectLayer NON_MOVING = 0;
	static constexpr ObjectLayer MOVING = 1;
	static constexpr ObjectLayer NUM_LAYERS = 2;
};

class ObjectLayerPairFilterImpl : public ObjectLayerPairFilter {
public:
	virtual bool ShouldCollide(ObjectLayer inObject1, ObjectLayer inObject2) const override {
		switch (inObject1) {
		case Layers::NON_MOVING:
			return inObject2 == Layers::MOVING;
		case Layers::MOVING:
			return true;
		default:
			return false;
		}
	}
};

namespace BroadPhaseLayers {
	static constexpr BroadPhaseLayer NON_MOVING(0);
	static constexpr BroadPhaseLayer MOVING(1);
	static constexpr uint NUM_LAYERS(2);
};

class BPLayerInterfaceImpl final : public BroadPhaseLayerInterface {
public:
	BPLayerInterfaceImpl() {
		mObjectToBroadPhase[Layers::NON_MOVING] = BroadPhaseLayers::NON_MOVING;
		mObjectToBroadPhase[Layers::MOVING] = BroadPhaseLayers::MOVING;
	}

	virtual uint GetNumBroadPhaseLayers() const override {
		return BroadPhaseLayers::NUM_LAYERS;
	}

	virtual BroadPhaseLayer GetBroadPhaseLayer(ObjectLayer inLayer) const override {
		return mObjectToBroadPhase[inLayer];
	}

	#if defined(JPH_EXTERNAL_PROFILE) || defined(JPH_PROFILE_ENABLED)
	virtual const char *GetBroadPhaseLayerName(BroadPhaseLayer inLayer) const override {
		return "";
	}
	#endif

	BroadPhaseLayer mObjectToBroadPhase[Layers::NUM_LAYERS];
};

class ObjectVsBroadPhaseLayerFilterImpl : public ObjectVsBroadPhaseLayerFilter {
public:
	virtual bool ShouldCollide(ObjectLayer inLayer1, BroadPhaseLayer inLayer2) const override {
		switch (inLayer1) {
		case Layers::NON_MOVING:
			return inLayer2 == BroadPhaseLayers::MOVING;
		case Layers::MOVING:
			return true;
		default:
			return false;
		}
	}
};

class MyContactListener : public ContactListener {
public:
	virtual ValidateResult OnContactValidate(const Body &inBody1, const Body &inBody2, RVec3Arg inBaseOffset, const CollideShapeResult &inCollisionResult) override {
		return ValidateResult::AcceptAllContactsForThisBodyPair;
	}

	virtual void OnContactAdded(const Body &inBody1, const Body &inBody2, const ContactManifold &inManifold, ContactSettings &ioSettings) override {
	}

	virtual void OnContactPersisted(const Body &inBody1, const Body &inBody2, const ContactManifold &inManifold, ContactSettings &ioSettings) override {
		ppair.pos_a_x = inManifold.GetWorldSpaceContactPointOn1(0).GetX();
		ppair.pos_a_y = inManifold.GetWorldSpaceContactPointOn1(0).GetY();
		ppair.pos_a_z = inManifold.GetWorldSpaceContactPointOn1(0).GetZ();
	}

	virtual void OnContactRemoved(const SubShapeIDPair &inSubShapePair) override {
		ppair.pos_a_x = ppair.pos_a_y = ppair.pos_a_z = 0;
	}
};

typedef enum {
	physics_shape_BOX = 0,
	physics_shape_SPHERE = 1,
	physics_shape_HULL = 2,
	physics_shape_TERRAIN = 3,
	physics_shape_MESH = 4,
} physics_shape_t;

BPLayerInterfaceImpl broad_phase_layer_interface;
ObjectVsBroadPhaseLayerFilterImpl object_vs_broadphase_layer_filter;
ObjectLayerPairFilterImpl object_vs_object_layer_filter;

void _jolt_world_create() {
	RegisterDefaultAllocator();
	Trace = TraceImpl;
	Factory::sInstance = new Factory();
	RegisterTypes();

	temp_allocator = new TempAllocatorImpl(10 * 1024 * 1024);
	// job_system = new JobSystemThreadPool(cMaxPhysicsJobs, cMaxPhysicsBarriers, thread::hardware_concurrency() - 1);
	job_system = new JobSystemThreadPool(cMaxPhysicsJobs, cMaxPhysicsBarriers, 0);

	const uint cMaxBodies = 1024;
	const uint cNumBodyMutexes = 0;
	const uint cMaxBodyPairs = 1024;
	const uint cMaxContactConstraints = 1024;

	physics_system = new PhysicsSystem();
	physics_system->Init(cMaxBodies, cNumBodyMutexes, cMaxBodyPairs, cMaxContactConstraints,
		broad_phase_layer_interface, object_vs_broadphase_layer_filter, object_vs_object_layer_filter);

	MyContactListener *contact_listener = new MyContactListener();
	physics_system->SetContactListener(contact_listener);

	physics_system->SetGravity(Vec3(0.0, 0.0, -9.81));
}

void _jolt_world_update() {
	#ifdef is_forge
	const int cCollisionSteps = 2;
	#else
	const int cCollisionSteps = 1;
	#endif
	const float cDeltaTime = 1.0f / 60.0f;
	physics_system->Update(cDeltaTime, cCollisionSteps, temp_allocator, job_system);
}

void _jolt_world_destroy() {
	// body_interface.RemoveBody(sphere_id);
	// body_interface.DestroyBody(sphere_id);
	// body_interface.RemoveBody(floor->GetID());
	// body_interface.DestroyBody(floor->GetID());
	UnregisterTypes();
	delete Factory::sInstance;
	Factory::sInstance = nullptr;
}

void *_jolt_body_create(int shape, float mass, float dimx, float dimy, float dimz, float x, float y, float z, void *f32a_triangles) {
	BodyInterface &body_interface = physics_system->GetBodyInterface();
	Body *body;
	ShapeSettings::ShapeResult result;

	// float convex_radius = 0.05f;
	float convex_radius = 0.0f;

	// if (convex_radius > 0.0) {
	// 	if (dimx <= 0.2) dimx = 0.21;
	// 	if (dimy <= 0.2) dimy = 0.21;
	// 	if (dimz <= 0.2) dimz = 0.21;
	// }

	if (shape == physics_shape_BOX) {
		BoxShapeSettings shape_settings(RVec3(dimx / 2.0, dimy / 2.0, dimz / 2.0), convex_radius);
		shape_settings.SetEmbedded();
		result = shape_settings.Create();
	}
	else if (shape == physics_shape_SPHERE) {
		SphereShapeSettings shape_settings(dimx / 2.0);
		shape_settings.SetEmbedded();
		result = shape_settings.Create();
	}
	else if (shape == physics_shape_HULL) {
		f32_array_t *f32a = (f32_array_t *)f32a_triangles;

		JPH::Array<JPH::Vec3> points;
		points.reserve(f32a->length / 3);
		for (int i = 0; i < f32a->length / 9; ++i) {
			Vec3 v1(f32a->buffer[i * 9    ], f32a->buffer[i * 9 + 1], f32a->buffer[i * 9 + 2]);
			Vec3 v2(f32a->buffer[i * 9 + 3], f32a->buffer[i * 9 + 4], f32a->buffer[i * 9 + 5]);
			Vec3 v3(f32a->buffer[i * 9 + 6], f32a->buffer[i * 9 + 7], f32a->buffer[i * 9 + 8]);
			points.push_back(v1);
			points.push_back(v2);
			points.push_back(v3);
		}

		ConvexHullShapeSettings shape_settings(points, convex_radius);
		shape_settings.SetEmbedded();
		result = shape_settings.Create();
	}
	else if (shape == physics_shape_TERRAIN) {
		f32_array_t *f32a = (f32_array_t *)f32a_triangles;

		// HeightFieldShapeSettings shape_settings();
		// shape_settings.SetEmbedded();
		// result = shape_settings.Create();
	}
	else {
		// Mesh
		f32_array_t *f32a = (f32_array_t *)f32a_triangles;
		TriangleList triangles;
		triangles.reserve(f32a->length / 9);
		for (int i = 0; i < f32a->length / 9; ++i) {
			Float3 v1(f32a->buffer[i * 9    ], f32a->buffer[i * 9 + 1], f32a->buffer[i * 9 + 2]);
			Float3 v2(f32a->buffer[i * 9 + 3], f32a->buffer[i * 9 + 4], f32a->buffer[i * 9 + 5]);
			Float3 v3(f32a->buffer[i * 9 + 6], f32a->buffer[i * 9 + 7], f32a->buffer[i * 9 + 8]);
			triangles.push_back(Triangle(v1, v2, v3));
		}

		MeshShapeSettings shape_settings(triangles);
		shape_settings.SetEmbedded();
		result = shape_settings.Create();
	}

	ShapeRefC shape_c = result.Get();
	BodyCreationSettings settings(shape_c, RVec3(x, y, z), Quat::sIdentity(), mass == 0 ? EMotionType::Static : EMotionType::Dynamic,
		mass == 0 ? Layers::NON_MOVING : Layers::MOVING);

#ifdef is_forge
	settings.mAllowSleeping = false;
#endif

	// if (ccd) {
	if (shape != physics_shape_MESH) {
		settings.mMotionQuality = EMotionQuality::LinearCast;

		MassProperties mass_prop;
		mass_prop.ScaleToMass(mass);
		settings.mMassPropertiesOverride = mass_prop;

		settings.mOverrideMassProperties = EOverrideMassProperties::CalculateInertia;
	}

	body = body_interface.CreateBody(settings);
	body_interface.AddBody(body->GetID(), EActivation::Activate);

	return body;
}

void _jolt_body_apply_impulse(void *b, float x, float y, float z) {
	BodyInterface &body_interface = physics_system->GetBodyInterface();
	Body *body = (Body *)b;
	body_interface.AddImpulse(body->GetID(), Vec3(x, y, z));
}

void _jolt_body_get_pos(void *b, void *p) {
	BodyInterface &body_interface = physics_system->GetBodyInterface();
	Body *body = (Body *)b;
	RVec3 position = body_interface.GetCenterOfMassPosition(body->GetID());
	kinc_vector4_t *v = (kinc_vector4_t *)p;
	v->x = position.GetX();
	v->y = position.GetY();
	v->z = position.GetZ();
}

void _jolt_body_get_rot(void *b, void *r) {
	BodyInterface &body_interface = physics_system->GetBodyInterface();
	Body *body = (Body *)b;
	Quat rotation = body_interface.GetRotation(body->GetID());
	kinc_quaternion_t *q = (kinc_quaternion_t *)r;
	q->x = rotation.GetX();
	q->y = rotation.GetY();
	q->z = rotation.GetZ();
	q->w = rotation.GetW();
}

void _jolt_body_sync_transform(void *b, vec4_t p, quat_t r) {
	BodyInterface &body_interface = physics_system->GetBodyInterface();
	Body *body = (Body *)b;
	body_interface.SetPositionAndRotation(body->GetID(), RVec3(p.x, p.y, p.z), Quat(r.x, r.y, r.z, r.w), EActivation::Activate);
	body_interface.SetLinearVelocity(body->GetID(), RVec3(0, 0, 0));
	body_interface.SetAngularVelocity(body->GetID(), RVec3(0, 0, 0));
}

void _jolt_body_remove(void *b) {
	BodyInterface &body_interface = physics_system->GetBodyInterface();
	Body *body = (Body *)b;
	body_interface.RemoveBody(body->GetID());
}

extern "C" {
    void jolt_world_create() {
        _jolt_world_create();
    }

	void jolt_world_update() {
        _jolt_world_update();
    }

	physics_pair_t *jolt_world_get_contact_pairs() {
		return &ppair;
	}

	void jolt_world_destroy() {
        _jolt_world_destroy();
    }

	void *jolt_body_create(int shape, float mass, float dimx, float dimy, float dimz, float x, float y, float z, void *f32a_triangles) {
		return _jolt_body_create(shape, mass, dimx, dimy, dimz, x, y, z, f32a_triangles);
	}

	void jolt_body_apply_impulse(void *body, float x, float y, float z) {
		_jolt_body_apply_impulse(body, x, y, z);
	}

	void jolt_body_get_pos(void *b, void *p) {
		_jolt_body_get_pos(b, p);
	}

	void jolt_body_get_rot(void *b, void *r) {
		_jolt_body_get_rot(b, r);
	}

	void jolt_body_sync_transform(void *b, vec4_t p, quat_t r) {
		_jolt_body_sync_transform(b, p, r);
	}

	void jolt_body_remove(void *b) {
		_jolt_body_remove(b);
	}
}
