// ARTexplorer — Quadray-Native Vertex Shader (ABCD Convention)
//
// Vertices arrive as ABCD Quadray coordinates (integers on CPU).
// The shader performs zero-sum normalization and basis conversion to XYZ on the GPU.
// No Cartesian conversion happens in Rust — precision preserved through CPU pipeline.
//
// ABCD Basis Vectors (Quadray → Cartesian):
//   A = (-1, -1, +1)  Yellow  [index 0, former QW]
//   B = (+1, +1, +1)  Red     [index 1, former QX]
//   C = (-1, +1, -1)  Blue    [index 2, former QY]
//   D = (+1, -1, -1)  Green   [index 3, former QZ]
//
// A = Yellow (NOT Red) — deliberate disambiguation from Cartesian X = Red.
// ABCD = 0123, no scramble. The 3021 rule is dead.

// Quadray ABCD basis conversion matrix: 4 columns (ABCD) → 3 rows (XYZ)
const BASIS: mat4x3<f32> = mat4x3<f32>(
    vec3<f32>(-1.0, -1.0,  1.0),   // A (Yellow)
    vec3<f32>( 1.0,  1.0,  1.0),   // B (Red)
    vec3<f32>(-1.0,  1.0, -1.0),   // C (Blue)
    vec3<f32>( 1.0, -1.0, -1.0),   // D (Green)
);

// Camera uniform — perspective projection * view matrix
struct Camera {
    view_proj: mat4x4<f32>,
};
@group(0) @binding(0) var<uniform> camera: Camera;

struct VertexInput {
    @location(0) quadray: vec4<f32>,  // ABCD coordinates (e.g., [1,0,0,0] = A-vertex)
    @location(1) color: vec3<f32>,    // RGB vertex color
};

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) color: vec3<f32>,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
    // Step 1: Zero-sum normalize — subtract average from each coordinate
    // [1,0,0,0] → [3/4, -1/4, -1/4, -1/4]
    let avg = (in.quadray.x + in.quadray.y + in.quadray.z + in.quadray.w) / 4.0;
    let normalized = in.quadray - vec4<f32>(avg);

    // Step 2: Convert ABCD → XYZ via basis matrix multiplication
    let position = BASIS * normalized;

    // Step 3: Apply camera transform (view + projection)
    var out: VertexOutput;
    out.clip_position = camera.view_proj * vec4<f32>(position, 1.0);
    out.color = in.color;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    return vec4<f32>(in.color, 1.0);
}
