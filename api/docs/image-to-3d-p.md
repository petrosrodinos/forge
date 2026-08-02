# Image to 3D Model — P Series

**Base URL:** `https://openapi.tripo3d.ai/v3`

**Endpoint:** `POST /generation/image-to-model`

Generate a 3D model from an image using P Series. Optimized for low-poly output with clean topology.

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

P Series model version.
- `P1-20260311` — optimized for low-poly generation.

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

### model_seed

- **Type:** integer
- **Required:** Optional

Random seed for geometry generation. Using the same seed with the same input will produce an identical 3D mesh. If not set, a random seed is used each time.
### face_limit

- **Type:** integer
- **Required:** Optional

Maximum polycount for the output mesh.


- Supported range: **50 – 20,000**
- If omitted, adaptively determined.
For best quality: simple models start from **150** faces, complex models start from **250** faces. Lower values may result in poor generation quality.

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

### auto_size

- **Type:** boolean
- **Required:** Optional
- **Default:** `false`

Whether to automatically scale the generated model to real-world dimensions. When enabled, the model size will be in meters, suitable for AR/VR or game engine scenes. Default is false.
### compress

- **Type:** string
- **Required:** Optional

Compression type.
- `geometry` — meshopt compression for reduced file size.



- The following parameters are only valid when `model ≥ v3.0-20250812`: `texture_quality`, `geometry_quality`, `auto_size`, `quad`, `smart_low_poly`, `generate_parts`, `compress`.

### export_uv

- **Type:** boolean
- **Required:** Optional
- **Default:** `true`

Controls UV unwrapping. Set `false` for faster generation and smaller file size.

## Request Example

### P Series

```bash
curl --request POST \
  --url https://openapi.tripo3d.ai/v3/generation/image-to-model \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
  "input": "https://example.com/image.png",
  "model": "P1-20260311",
  "face_limit": 5000,
  "texture": true,
  "pbr": true
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
