# Image to 3D Model — H Series

**Base URL:** `https://openapi.tripo3d.ai/v3`

**Endpoint:** `POST /generation/image-to-model`

Generate a 3D model from an image. The system infers geometry and texture from the input.

## Request Parameters

### input

- **Type:** string
- **Required:** Required

Image source. The subject should be clearly visible with minimal occlusion. Accepts the following input types:**Choose exactly one** of the following — do not pass multiple types simultaneously.

- file_token — Upload an image via the [File Upload API](https://developers.tripo3d.ai/docs/files) first, then pass the returned token.
Example: `file_abc123`
- URL — A publicly accessible direct link to an image.
Example: `https://example.com/photo.png`
- task_id — The task ID from a previous image generation task (`text_to_image` or `image_to_image`). The system automatically extracts the output image.
Example: `task_abc123`



- Supported formats: `PNG`, `JPEG`, `WebP`
- Max file size: **20 MB**
- Recommended resolution: at least **256 × 256 px**. Subject should be clearly visible with a clean background and minimal occlusion.

### model

- **Type:** string
- **Required:** Required

AI model version.
- `v3.1-20260211` — latest, best quality.
- `v3.0-20250812` — stable, advanced features.
- `v2.5-20250123` — balanced.

### enable_image_autofix

- **Type:** boolean
- **Required:** Optional
- **Default:** `false`

Whether to automatically optimize the input image before generation. When enabled, the system will enhance low-resolution or low-quality images to improve 3D generation results. Default is false.
### texture_alignment

- **Type:** string
- **Required:** Optional
- **Default:** `original_image`

Texture alignment priority.
- `original_image` — prioritize matching the input image colors.
- `geometry` — prioritize matching the generated geometry.

### orientation

- **Type:** string
- **Required:** Optional
- **Default:** `default`

Model orientation.
- `default` — automatic orientation.
- `align_image` — align the model to the input image viewpoint.
Only effective when `texture` is `true`. Has no effect without texture enabled.

### face_limit

- **Type:** integer
- **Required:** Optional

Maximum polycount for the output mesh.


- If omitted, the model uses adaptive topology.
Upper limits by mode
| Mode | Standard | Ultra | 
| Triangle — v3.1 | **1,500,000** | **2,000,000** | 
| Triangle — v3.0 | **1,000,000** | **2,000,000** | 
| Triangle — v2.5 | **500,000** | / | 
| Quad (`quad: true`) | **150,000** | 


- Game-ready assets: **50,000 – 100,000**. Web/mobile: **10,000 – 50,000**.
- When `smart_low_poly: true`, face limits are fixed regardless of model version: Triangle **500 – 20,000**, Quad **500 – 10,000**.

### texture

- **Type:** boolean
- **Required:** Optional
- **Default:** `true`

Whether to generate texture maps for the model. Set to false to get a bare geometry without any textures. Default is true.
### pbr

- **Type:** boolean
- **Required:** Optional
- **Default:** `true`

Enable PBR material maps (`base_color`, `metallic`, `roughness`, `normal`).When `pbr` is set to `true`, `texture` will be automatically forced to `true`.

### texture_seed

- **Type:** integer
- **Required:** Optional

Random seed for texture generation. Using the same seed will produce identical textures. If not set, a random seed will be used each time. To get a model with different textures but the same geometry, keep model_seed unchanged and vary texture_seed.
### texture_quality

- **Type:** string
- **Required:** Optional
- **Default:** `standard`

Texture quality level.
- `standard` — balanced quality and speed.
- `detailed` — higher fidelity, slower generation.
- `extreme` — 8K textures, highest fidelity. Costs additional credits compared to detailed.

### geometry_quality

- **Type:** string
- **Required:** Optional
- **Default:** `standard`

Geometry quality level.
- `standard` — balanced quality and speed.
- `detailed` — Ultra mode, finer geometry detail.
Only effective for model version ≥ v3.0. Do NOT use this parameter with v2.5.

### auto_size

- **Type:** boolean
- **Required:** Optional
- **Default:** `false`

Whether to automatically scale the generated model to real-world dimensions. When enabled, the model size will be in meters, suitable for AR/VR or game engine scenes. Default is false.
### quad

- **Type:** boolean
- **Required:** Optional
- **Default:** `false`

Whether to output a quad mesh (four-sided polygons) instead of triangles. If `face_limit` is not set, the default face count will be 10,000.Enabling `quad` will force the output format to `FBX`.

### smart_low_poly

- **Type:** boolean
- **Required:** Optional
- **Default:** `false`

Whether to generate a low-poly model with hand-crafted, clean topology style. Best suited for simple, non-complex inputs. Complex models may occasionally fail. Default is false.
### generate_parts

- **Type:** boolean
- **Required:** Optional
- **Default:** `false`

Generate editable segmented parts.Not compatible with `texture=true`, `pbr=true`, or `quad=true`. To use this, set all three to `false`.

### compress

- **Type:** string
- **Required:** Optional

Compression type.
- `geometry` — meshopt compression for reduced file size.



- The following parameters are only valid when `model ≥ v3.0-20250812`: `texture_quality`, `geometry_quality`, `auto_size`, `quad`, `smart_low_poly`, `generate_parts`, `compress`.

### model_seed

- **Type:** integer
- **Required:** Optional

Random seed for geometry generation. Using the same seed with the same input will produce an identical 3D mesh. If not set, a random seed is used each time.
### export_uv

- **Type:** boolean
- **Required:** Optional
- **Default:** `true`

Controls UV unwrapping during generation. Set `false` for faster generation and smaller file size. UV unwrapping will be handled during texturing.

## Request Example

### From URL

```bash
curl --request POST \
  --url https://openapi.tripo3d.ai/v3/generation/image-to-model \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
  "input": "https://example.com/image.png",
  "model": "v3.1-20260211",
  "texture": true,
  "pbr": true,
  "texture_quality": "detailed"
}'
```

### With autofix

```bash
curl --request POST \
  --url https://openapi.tripo3d.ai/v3/generation/image-to-model \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
  "input": "file_abc123",
  "model": "v3.1-20260211",
  "enable_image_autofix": true,
  "orientation": "align_image"
}'
```


## Response Example

### Create task

```json
{
  "code": 0,
  "data": {
    "task_id": "task_abc123"
  }
}
```

### Task result

```json
{
  "code": 0,
  "data": {
    "task_id": "task_abc123",
    "type": "text_to_model",
    "status": "success",
    "progress": 100,
    "output": {
      "model_url": "https://cdn.tripo3d.ai/output/model_pbr.glb",
      "rendered_image_url": "https://cdn.tripo3d.ai/output/preview.png"
    },
    "credits_consumed": 100,
    "created_at": "2026-04-28T12:00:00Z",
    "completed_at": "2026-04-28T12:01:30Z"
  }
}
```
