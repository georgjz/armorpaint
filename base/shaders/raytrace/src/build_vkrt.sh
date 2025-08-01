./dxc -Zpr -Fo ../raytrace_brute_core.spirv -T lib_6_4 ./raytrace_brute.hlsl -spirv -fvk-use-scalar-layout -fspv-target-env="vulkan1.3" -fvk-u-shift 10 all -fvk-b-shift 11 all
./dxc -Zpr -Fo ../raytrace_brute_full.spirv -T lib_6_4 ./raytrace_brute.hlsl -spirv -fvk-use-scalar-layout -fspv-target-env="vulkan1.3" -fvk-u-shift 10 all -fvk-b-shift 11 all -D _FULL
./dxc -Zpr -Fo ../raytrace_brute_forge_core.spirv -T lib_6_4 ./raytrace_brute.hlsl -spirv -fvk-use-scalar-layout -fspv-target-env="vulkan1.3" -fvk-u-shift 10 all -fvk-b-shift 11 all -D _FORGE
./dxc -Zpr -Fo ../raytrace_brute_forge_full.spirv -T lib_6_4 ./raytrace_brute.hlsl -spirv -fvk-use-scalar-layout -fspv-target-env="vulkan1.3" -fvk-u-shift 10 all -fvk-b-shift 11 all -D _FORGE -D _FULL
./dxc -Zpr -Fo ../raytrace_bake_ao.spirv -T lib_6_4 ./raytrace_bake_ao.hlsl -spirv -fvk-use-scalar-layout -fspv-target-env="vulkan1.3" -fvk-u-shift 10 all -fvk-b-shift 11 all
./dxc -Zpr -Fo ../raytrace_bake_light.spirv -T lib_6_4 ./raytrace_bake_light.hlsl -spirv -fvk-use-scalar-layout -fspv-target-env="vulkan1.3" -fvk-u-shift 10 all -fvk-b-shift 11 all
./dxc -Zpr -Fo ../raytrace_bake_bent.spirv -T lib_6_4 ./raytrace_bake_bent.hlsl -spirv -fvk-use-scalar-layout -fspv-target-env="vulkan1.3" -fvk-u-shift 10 all -fvk-b-shift 11 all
./dxc -Zpr -Fo ../raytrace_bake_thick.spirv -T lib_6_4 ./raytrace_bake_thick.hlsl -spirv -fvk-use-scalar-layout -fspv-target-env="vulkan1.3" -fvk-u-shift 10 all -fvk-b-shift 11 all
