export type ImageFormat = "webp" | "jpeg" | "png";

export type ModelVersion =
  | "v3.1-20260211"
  | "v3.0-20250812"
  | "v2.5-20250123"
  | "P1-20260311";

export type StandardModelVersion =
  | "v3.1-20260211"
  | "v3.0-20250812"
  | "v2.5-20250123"
  | "P1-20260311";

export type AnimateRigModelVersion = "v2.5-20260210" | "v1.0-20240301";

export type RigType =
  | "biped"
  | "quadruped"
  | "hexapod"
  | "octopod"
  | "avian"
  | "serpentine"
  | "aquatic";

export type AnimationType =
  | "preset:idle"
  | "preset:walk"
  | "preset:run"
  | "preset:dive"
  | "preset:climb"
  | "preset:jump"
  | "preset:slash"
  | "preset:shoot"
  | "preset:hurt"
  | "preset:fall"
  | "preset:turn"
  | "preset:quadruped:walk"
  | "preset:hexapod:walk"
  | "preset:octopod:walk"
  | "preset:serpentine:march"
  | "preset:aquatic:march";

export type CompressType = "" | "geometry";

export type StyleOption =
  | "person:person2cartoon"
  | "animal:venom"
  | "object:clay"
  | "object:steampunk"
  | "object:christmas"
  | "object:barbie"
  | "gold"
  | "ancient_bronze";

export type TaskStatus =
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "cancelled";

export type File =
  | { type: string; file_token: string }
  | { type: string; url: string }
  | { type: string; object: { bucket: string; key: string } };

export type TextureQuality = "standard" | "detailed" | "extreme";
export type GeometryQuality = "standard" | "detailed";

export interface TextureParams {
  texture?: boolean;
  pbr?: boolean;
  texture_quality?: TextureQuality;
  texture_alignment?: "original_image" | "geometry";
}

export interface BaseModelParams {
  model?: ModelVersion;
  model_version?: ModelVersion;
  face_limit?: number;
  auto_size?: boolean;
  quad?: boolean;
  geometry_quality?: GeometryQuality;
  enable_image_autofix?: boolean;
  export_uv?: boolean;
  compress?: CompressType;
  smart_low_poly?: boolean;
  generate_parts?: boolean;
}

export type MultiviewInputSlot =
  | string
  | { front: string }
  | { left: string }
  | { back: string }
  | { right: string }
  | { task_id: string };

export interface TexturePrompt {
  text?: string;
  image?: File;
  style_image?: File;
}

export interface TextToModelRequest extends BaseModelParams, TextureParams {
  type: "text_to_model";
  prompt: string;
  negative_prompt?: string;
  text_seed?: number;
  model_seed?: number;
  texture_seed?: number;
  style?: StyleOption;
}

export interface TextToImageRequest {
  type: "text_to_image";
  prompt: string;
  negative_prompt?: string;
}

export interface ImageToModelRequest extends BaseModelParams, TextureParams {
  type: "image_to_model";
  input?: string;
  file?: File;
  model_seed?: number;
  texture_seed?: number;
  style?: StyleOption;
  orientation?: "align_image" | "default";
}

export interface MultiviewToModelRequest extends BaseModelParams, TextureParams {
  type: "multiview_to_model";
  inputs?: MultiviewInputSlot[];
  files?: File[];
  mode?: "LEFT" | "RIGHT";
  orthographic_projection?: boolean;
  model_seed?: number;
  texture_seed?: number;
  style?: StyleOption;
  orientation?: "align_image" | "default";
}

export interface TextureModelRequest extends TextureParams {
  type: "texture_model";
  original_model_task_id: string;
  model_seed?: number;
  texture_seed?: number;
  compress?: CompressType;
  model_version?: "v2.5-20250123" | "v3.0-20250812";
  part_names?: string[];
  bake?: boolean;
  texture_prompt?: TexturePrompt;
}

export interface RefineModelRequest {
  type: "refine_model";
  draft_model_task_id: string;
}

export interface AnimatePrerigcheckRequest {
  type: "animate_prerigcheck";
  original_model_task_id: string;
}

export interface AnimateRigRequest {
  type: "animate_rig";
  original_model_task_id: string;
  out_format?: "glb" | "fbx";
  topology?: "bip" | "quad";
  rig_type?: RigType;
  spec?: "mixamo" | "tripo";
  model_version?: AnimateRigModelVersion;
}

export interface AnimateRetargetRequest {
  type: "animate_retarget";
  original_model_task_id: string;
  out_format?: "glb" | "fbx";
  animation?: AnimationType;
  animations?: AnimationType[];
  bake_animation?: boolean;
  export_with_geometry?: boolean;
}

export interface StylizeModelRequest {
  type: "stylize_model";
  style: "lego" | "voxel" | "voronoi" | "minecraft";
  original_model_task_id: string;
  block_size?: number;
}

export interface ConvertModelRequest {
  type: "convert_model";
  format: "GLTF" | "USDZ" | "FBX" | "OBJ" | "STL" | "3MF";
  original_model_task_id: string;
  quad?: boolean;
  force_symmetry?: boolean;
  face_limit?: number;
  flatten_bottom?: boolean;
  flatten_bottom_threshold?: number;
  texture_size?: number;
  texture_format?:
    | "BMP"
    | "DPX"
    | "HDR"
    | "JPEG"
    | "OPEN_EXR"
    | "PNG"
    | "TARGA"
    | "TIFF"
    | "WEBP";
  pivot_to_center_bottom?: boolean;
  with_animation?: boolean;
  pack_uv?: boolean;
  bake?: boolean;
  part_names?: string[];
}

export interface MeshSegmentationRequest {
  type: "mesh_segmentation";
  original_model_task_id: string;
}

export interface MeshCompletionRequest {
  type: "mesh_completion";
  original_model_task_id: string;
  part_names?: string[];
}

export interface HighPolyToLowPolyRequest {
  type: "highpoly_to_lowpoly";
  original_model_task_id: string;
  quad: boolean;
  face_limit?: number;
  bake?: boolean;
  part_names?: string[];
}

export type CreateTaskRequest =
  | TextToModelRequest
  | TextToImageRequest
  | ImageToModelRequest
  | MultiviewToModelRequest
  | TextureModelRequest
  | RefineModelRequest
  | AnimatePrerigcheckRequest
  | AnimateRigRequest
  | AnimateRetargetRequest
  | StylizeModelRequest
  | ConvertModelRequest
  | MeshSegmentationRequest
  | MeshCompletionRequest
  | HighPolyToLowPolyRequest;

export type CreateTaskType = CreateTaskRequest["type"];

export interface TaskOutput {
  model_url?: string;
  rendered_image_url?: string;
  generated_image_url?: string;
  rendered_video_url?: string;
  rendered_sequence_url?: string;
  multiview_basecolor_url?: string;
  riggable?: boolean;
  rig_type?: RigType | string;
}

export interface Task {
  task_id: string;
  type: string;
  status: TaskStatus;
  input: Record<string, unknown>;
  output: TaskOutput;
  progress: number;
  error_code?: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
  credits_consumed?: number;
}

export interface Balance {
  balance: number;
  frozen: number;
}

export interface StsTokenResponse {
  s3_host: string;
  resource_bucket: string;
  resource_uri: string;
  session_token: string;
  sts_ak: string;
  sts_sk: string;
  file_token?: string;
}

export interface SuccessResponse<T = Record<string, unknown>> {
  code: 0;
  status?: "success";
  data: T;
}

export interface ErrorResponse {
  code: number;
  status?: "error";
  message: string;
  suggestion: string;
  request_id?: string;
}

export interface CreateTaskResponse {
  code: 0;
  status?: "success";
  data: { task_id: string; type?: string; status?: TaskStatus };
}

export interface GetStsTokenResponse {
  code: 0;
  status?: "success";
  data: StsTokenResponse;
}
