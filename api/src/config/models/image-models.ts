import { usdToTokens, walletTokensFromProviderEur } from "../../lib/models-cost";
import { DOLLARS_TO_EUR_RATE, MARKUP_FACTOR } from "./pricing";

/** How AIML `/v1/images/generations` expects the reference image for this model */
export type AimlI2iSourceKey = "image" | "image_url" | "image_urls";

export type ImageModelDefinition = {
    id: string;
    name: string;
    provider: string;
    tokens_original: number;
    price_original: number;
    tokens: null;
    price: null;
    is_image_to_image: boolean;
    available: boolean;
    /** AIML wiring; omit when `id` matches AIML and defaults suffice */
    aiml_api?: {
        modelId?: string;
        i2i?: {
            /** Default `generations`. OpenAI GPT Image edits use multipart `/v1/images/edits`. */
            endpoint?: "generations" | "edits";
            sourceKey: AimlI2iSourceKey;
            negativeStyle: "inline" | "negative_prompt_field";
            mergedPromptMax?: number;
            promptMax?: number;
            negativeMax?: number;
        };
    };
};

const imageModels: ImageModelDefinition[] = [
    {
        id: "grok-imagine-image-pro",
        name: "xAI / Grok Imagine Image Pro",
        provider: "xAI",
        tokens_original: usdToTokens(0.091, false),
        price_original: 0.091 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "grok-imagine-image",
        name: "xAI / Grok Imagine",
        provider: "xAI",
        tokens_original: usdToTokens(0.026, false),
        price_original: 0.026 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "seadream-5-0-lite",
        name: "ByteDance / Seadream 5.0 Lite",
        provider: "ByteDance",
        tokens_original: usdToTokens(0.046, false),
        price_original: 0.046 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "nano-banana-2",
        name: "Google / Gemini 3.1 Flash Image (Nano Banana 2)",
        provider: "Google",
        tokens_original: usdToTokens(0.09, false),
        price_original: 0.09 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: true,
        aiml_api: {
            modelId: "google/gemini-3.1-flash-image-preview",
        },
    },
    {
        id: "nano-banana-2-edit",
        name: "Google / Gemini 3.1 Flash Image Edit (Nano Banana 2)",
        provider: "Google",
        tokens_original: usdToTokens(0.09, false),
        price_original: 0.09 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: true,
        available: true,
        aiml_api: {
            modelId: "google/gemini-3.1-flash-image-preview",
            i2i: { sourceKey: "image_urls", negativeStyle: "inline", mergedPromptMax: 4000 },
        },
    },
    {
        id: "nano-banana-2-lite",
        name: "Google / Gemini 3.1 Flash Lite Image (Nano Banana 2 Lite)",
        provider: "Google",
        tokens_original: usdToTokens(0.034, false),
        price_original: 0.034 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: true,
        aiml_api: {
            modelId: "google/gemini-3.1-flash-lite-image",
        },
    },
    {
        id: "nano-banana-2-lite-edit",
        name: "Google / Gemini 3.1 Flash Lite Image Edit (Nano Banana 2 Lite)",
        provider: "Google",
        tokens_original: usdToTokens(0.034, false),
        price_original: 0.034 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: true,
        available: true,
        aiml_api: {
            modelId: "google/gemini-3.1-flash-lite-image",
            i2i: { sourceKey: "image_urls", negativeStyle: "inline", mergedPromptMax: 4000 },
        },
    },
    {
        id: "wan-2-6",
        name: "Alibaba Cloud / Wan 2.6",
        provider: "Alibaba Cloud",
        tokens_original: usdToTokens(0.039, false),
        price_original: 0.039 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "flux-2-max-edit",
        name: "Black Forest Labs / FLUX.2 Max Edit",
        provider: "Black Forest Labs",
        tokens_original: usdToTokens(0.091, false),
        price_original: 0.091 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: true,
        available: true,
        aiml_api: {
            modelId: "blackforestlabs/flux-2-edit",
            i2i: { sourceKey: "image_urls", negativeStyle: "inline", mergedPromptMax: 4000 },
        },
    },
    {
        id: "blackforestlabs/flux-2-max",
        name: "Black Forest Labs / FLUX.2 Max",
        provider: "Black Forest Labs",
        tokens_original: usdToTokens(0.091, false),
        price_original: 0.091 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: true,
    },
    {
        id: "gpt-image-2",
        name: "OpenAI / GPT Image 2",
        provider: "OpenAI",
        tokens_original: usdToTokens(0.054, false),
        price_original: 0.054 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: true,
        aiml_api: {
            modelId: "openai/gpt-image-2",
        },
    },
    {
        id: "gpt-image-2-edit",
        name: "OpenAI / GPT Image 2 Edit",
        provider: "OpenAI",
        tokens_original: usdToTokens(0.095, false),
        price_original: 0.095 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: true,
        available: true,
        aiml_api: {
            modelId: "openai/gpt-image-2",
            i2i: {
                endpoint: "edits",
                sourceKey: "image",
                negativeStyle: "inline",
                mergedPromptMax: 32000,
            },
        },
    },
    {
        id: "gpt-image-1-5",
        name: "OpenAI / GPT Image 1.5",
        provider: "OpenAI",
        tokens_original: usdToTokens(0.08, false),
        price_original: 0.08 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: true,
        aiml_api: {
            modelId: "openai/gpt-image-1-5",
        },
    },
    {
        id: "gpt-image-1-5-edit",
        name: "OpenAI / GPT Image 1.5 Edit",
        provider: "OpenAI",
        tokens_original: usdToTokens(0.08, false),
        price_original: 0.08 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: true,
        available: true,
        aiml_api: {
            modelId: "openai/gpt-image-1-5",
            i2i: {
                endpoint: "edits",
                sourceKey: "image",
                negativeStyle: "inline",
                mergedPromptMax: 32000,
            },
        },
    },
    {
        id: "seedream-4-5",
        name: "ByteDance / Seedream 4.5",
        provider: "ByteDance",
        tokens_original: usdToTokens(0.052, false),
        price_original: 0.052 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "kling-image-o1",
        name: "Kling AI / Kling Image O1",
        provider: "Kling AI",
        tokens_original: usdToTokens(0.036, false),
        price_original: 0.036 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "z-image-turbo-lora",
        name: "Alibaba Cloud / Z-Image Turbo LoRA",
        provider: "Alibaba Cloud",
        tokens_original: usdToTokens(0.011, false),
        price_original: 0.011 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "z-image-turbo",
        name: "Alibaba Cloud / Z-Image Turbo",
        provider: "Alibaba Cloud",
        tokens_original: usdToTokens(0.007, false),
        price_original: 0.007 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "flux-2-lora",
        name: "Black Forest Labs / Flux 2 LoRA",
        provider: "Black Forest Labs",
        tokens_original: usdToTokens(0.027, false),
        price_original: 0.027 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "blackforestlabs/flux-2-pro",
        name: "Black Forest Labs / FLUX.2 [pro]",
        provider: "Black Forest Labs",
        tokens_original: usdToTokens(0.039, false),
        price_original: 0.039 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: true,
    },
    {
        id: "blackforestlabs/flux-2",
        name: "Black Forest Labs / FLUX.2",
        provider: "Black Forest Labs",
        tokens_original: usdToTokens(0.016, false),
        price_original: 0.016 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: true,
    },
    {
        id: "gemini-3-pro-image",
        name: "Google / Gemini 3 Pro Image (Nano Banana Pro)",
        provider: "Google",
        tokens_original: usdToTokens(0.195, false),
        price_original: 0.195 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: true,
        aiml_api: {
            modelId: "google/gemini-3-pro-image-preview",
        },
    },
    {
        id: "nano-banana-pro-edit",
        name: "Google / Gemini 3 Pro Image Edit (Nano Banana Pro)",
        provider: "Google",
        tokens_original: usdToTokens(0.195, false),
        price_original: 0.195 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: true,
        available: true,
        aiml_api: {
            modelId: "google/nano-banana-pro-edit",
            i2i: { sourceKey: "image_urls", negativeStyle: "inline", mergedPromptMax: 4000 },
        },
    },
    {
        id: "gpt-image-1-mini",
        name: "OpenAI / GPT Image 1 Mini",
        provider: "OpenAI",
        tokens_original: usdToTokens(0.676, false),
        price_original: 0.676 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: true,
        aiml_api: {
            modelId: "openai/gpt-image-1-mini",
        },
    },
    {
        id: "hunyuan-part",
        name: "Tencent / Hunyuan3D Part",
        provider: "Tencent",
        tokens_original: usdToTokens(0.052, false),
        price_original: 0.052 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "wan-2-2-t2i-flash",
        name: "Alibaba Cloud / Wan 2.2 Flash",
        provider: "Alibaba Cloud",
        tokens_original: usdToTokens(0.033, false),
        price_original: 0.033 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "wan-2-2-t2i-plus",
        name: "Alibaba Cloud / Wan 2.2 Plus",
        provider: "Alibaba Cloud",
        tokens_original: usdToTokens(0.065, false),
        price_original: 0.065 * DOLLARS_TO_EUR_RATE,
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "wan-2-5-t2i-preview",
        name: "Alibaba Cloud / Wan 2.5 Preview",
        provider: "Alibaba Cloud",
        price_original: 0.039 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.039, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "hunyuanimage-3-0",
        name: "Tencent / HunyuanImage 3.0",
        provider: "Tencent",
        price_original: 0.13 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.13, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "reve-remix-image",
        name: "Reve / Reve Remix Image",
        provider: "Reve",
        price_original: 0.052 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.052, false),
        tokens: null,
        price: null,
        is_image_to_image: true,
        available: true,
        aiml_api: {
            modelId: "reve/remix-edit-image",
            i2i: { sourceKey: "image_urls", negativeStyle: "inline", mergedPromptMax: 2560 },
        },
    },
    {
        id: "reve-edit-image",
        name: "Reve / Reve Edit Image",
        provider: "Reve",
        price_original: 0.052 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.052, false),
        tokens: null,
        price: null,
        is_image_to_image: true,
        available: true,
        aiml_api: {
            modelId: "reve/edit-image",
            i2i: { sourceKey: "image_url", negativeStyle: "inline", mergedPromptMax: 2560 },
        },
    },
    {
        id: "reve-create-image",
        name: "Reve / Reve Create Image",
        provider: "Reve",
        price_original: 0.031 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.031, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "qwen-image-edit",
        name: "Alibaba Cloud / Qwen Image Edit",
        provider: "Alibaba Cloud",
        price_original: 0.059 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.059, false),
        tokens: null,
        price: null,
        is_image_to_image: true,
        available: true,
        aiml_api: {
            modelId: "alibaba/qwen-image-edit",
            i2i: {
                sourceKey: "image",
                negativeStyle: "negative_prompt_field",
                promptMax: 800,
                negativeMax: 500,
            },
        },
    },
    {
        id: "flux-1-srpo-i2i",
        name: "Black Forest Labs / Flux SRPO Image‑to‑Image",
        provider: "Black Forest Labs",
        price_original: 0.033 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.033, false),
        tokens: null,
        price: null,
        is_image_to_image: true,
        available: true,
        aiml_api: {
            modelId: "flux/srpo/image-to-image",
            i2i: { sourceKey: "image_url", negativeStyle: "inline", mergedPromptMax: 4000 },
        },
    },
    {
        id: "flux-1-srpo-t2i",
        name: "Black Forest Labs / Flux SRPO",
        provider: "Black Forest Labs",
        price_original: 0.033 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.033, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "imagen-4-0-fast-generate-001",
        name: "Google / Imagen 4.0 Fast Generate",
        provider: "Google",
        price_original: 0.026 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.026, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: true,
        aiml_api: {
            modelId: "google/imagen-4.0-fast-generate-001",
        },
    },
    {
        id: "imagen-4-0-generate-001",
        name: "Google / Imagen 4.0 Generate",
        provider: "Google",
        price_original: 0.052 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.052, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: true,
        aiml_api: {
            modelId: "google/imagen4/preview",
        },
    },
    {
        id: "uso",
        name: "ByteDance / USO",
        provider: "ByteDance",
        price_original: 0.13 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.13, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "seedream-4-edit",
        name: "ByteDance / Seedream 4 Edit",
        provider: "ByteDance",
        price_original: 0.039 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.039, false),
        tokens: null,
        price: null,
        is_image_to_image: true,
        available: true,
        aiml_api: {
            modelId: "bytedance/seedream-v4-edit",
            i2i: { sourceKey: "image_urls", negativeStyle: "inline", mergedPromptMax: 4000 },
        },
    },
    {
        id: "seedream-4",
        name: "ByteDance / Seedream 4 Text-to-Image",
        provider: "ByteDance",
        price_original: 0.032 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.032, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "gemini-2-5-flash-image",
        name: "Google / Gemini 2.5 Flash Image (Nano Banana)",
        provider: "Google",
        price_original: 0.051 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.051, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: true,
        aiml_api: {
            modelId: "google/gemini-2.5-flash-image",
        },
    },
    {
        id: "gemini-2-5-flash-image-edit",
        name: "Google / Gemini 2.5 Flash Image Edit (Nano Banana)",
        provider: "Google",
        price_original: 0.051 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.051, false),
        tokens: null,
        price: null,
        is_image_to_image: true,
        available: true,
        aiml_api: {
            modelId: "google/gemini-2.5-flash-image-edit",
            i2i: { sourceKey: "image_urls", negativeStyle: "inline", mergedPromptMax: 4000 },
        },
    },
    {
        id: "qwen-image",
        name: "Alibaba Cloud / Qwen Image",
        provider: "Alibaba Cloud",
        price_original: 0.026 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.026, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: true
    },
    {
        id: "imagen-4-ultra",
        name: "Google / Imagen 4 Ultra",
        provider: "Google",
        price_original: 0.078 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.078, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "seedream-3-0",
        name: "ByteDance / Seedream 3.0 AI",
        provider: "ByteDance",
        price_original: 0.032 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.032, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "gpt-image-1",
        name: "OpenAI / GPT Image 1 Model",
        provider: "OpenAI",
        price_original: 0.175 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.175, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: true,
        aiml_api: {
            modelId: "openai/gpt-image-1",
        },
    },
    {
        id: "gpt-image-1-edit",
        name: "OpenAI / GPT Image 1 Edit",
        provider: "OpenAI",
        price_original: 0.175 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.175, false),
        tokens: null,
        price: null,
        is_image_to_image: true,
        available: true,
        aiml_api: {
            modelId: "openai/gpt-image-1",
            i2i: {
                endpoint: "edits",
                sourceKey: "image",
                negativeStyle: "inline",
                mergedPromptMax: 32000,
            },
        },
    },
    {
        id: "flux-1-kontext-pro",
        name: "Black Forest Labs / Flux.1 Kontext [pro]",
        provider: "Black Forest Labs",
        price_original: 0.052 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.052, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "flux-1-kontext-max",
        name: "Black Forest Labs / FLUX.1 Kontext [max]",
        provider: "Black Forest Labs",
        price_original: 0.104 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.104, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "imagen-4-preview",
        name: "Google / Imagen 4 Preview | Text to Image",
        provider: "Google",
        price_original: 0.052 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.052, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false,
        aiml_api: {
            modelId: "google/imagen4/preview",
        },
    },
    {
        id: "imagen-3-api",
        name: "Google / Imagen 3",
        provider: "Google",
        price_original: 0.052 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.052, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: true,
        aiml_api: {
            modelId: "google/imagen-3.0-generate-002",
        },
    },
    {
        id: "flux-pro/v1.1-ultra",
        name: "Black Forest Labs / Flux pro 1.1 ultra",
        provider: "Black Forest Labs",
        price_original: 0.078 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.078, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: true
    },
    {
        id: "recraft-v3",
        name: "RecraftAI / Recraft V3",
        provider: "RecraftAI",
        price_original: 0.052 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.052, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: true
    },
    {
        id: "stable-diffusion-3-5-large-api",
        name: "Stability AI / Stable Diffusion 3.5 Large",
        provider: "Stability AI",
        price_original: 0.085 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.085, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: true
    },
    {
        id: "flux-pro/v1.1",
        name: "Black Forest Labs / Flux pro 1.1",
        provider: "Black Forest Labs",
        price_original: 0.052 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.052, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: true
    },
    {
        id: "openai-dall-e-2-api",
        name: "OpenAI / OpenAI DALL·E 2",
        provider: "OpenAI",
        price_original: 0.026 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.026, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "stable-diffusion-3-api",
        name: "Stability AI / Stable Diffusion 3",
        provider: "Stability AI",
        price_original: 0.046 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.046, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "flux-realism-lora-api",
        name: "Black Forest Labs / Flux realism",
        provider: "Black Forest Labs",
        price_original: 0.046 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.046, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "flux-1-schnell-api",
        name: "Black Forest Labs / Flux Schnell",
        provider: "Black Forest Labs",
        price_original: 0.004 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.004, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "flux-1-dev-api",
        name: "Black Forest Labs / Flux dev",
        provider: "Black Forest Labs",
        price_original: 0.033 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.033, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: false
    },
    {
        id: "flux-pro",
        name: "Black Forest Labs / Flux pro",
        provider: "Black Forest Labs",
        price_original: 0.065 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.065, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: true
    },
    {
        id: "openai-dall-e-3",
        name: "OpenAI / OpenAI DALL·E 3",
        provider: "OpenAI",
        price_original: 0.052 * DOLLARS_TO_EUR_RATE,
        tokens_original: usdToTokens(0.052, false),
        tokens: null,
        price: null,
        is_image_to_image: false,
        available: true
    }
];


export type ImageModel = Omit<ImageModelDefinition, "tokens" | "price"> & { tokens: number; price: number };

export const ImageModels: ImageModel[] = imageModels.map((model) => ({
    ...model,
    /** Matches one ceiling on provider EUR × token rate × markup (not `ceil(providerTokens) * markup`). */
    tokens: walletTokensFromProviderEur(model.price_original),
    price: model.price_original * MARKUP_FACTOR,
}));

/** Deprecated ids still sent by clients or stored on variants — map to current `ImageModels[].id`. */
const LEGACY_IMAGE_MODEL_IDS: Record<string, string> = {
    "flux-2-pro-text-to-image": "blackforestlabs/flux-2-pro",
    "flux-2-text-to-image": "blackforestlabs/flux-2",
    "flux-2-max": "blackforestlabs/flux-2-max",
    "flux-1-pro-api": "flux-pro",
    "flux-1-1-pro-api": "flux-pro/v1.1",
    "flux-1-1-pro-ultra-api": "flux-pro/v1.1-ultra",
    "openai/gpt-image-2": "gpt-image-2",
    "openai/gpt-image-1": "gpt-image-1",
    "openai/gpt-image-1-5": "gpt-image-1-5",
    "openai/gpt-image-1-mini": "gpt-image-1-mini",
    "google/nano-banana-2": "nano-banana-2",
    "google/gemini-3-1-flash-image-preview": "nano-banana-2",
    "google/gemini-3.1-flash-image-preview": "nano-banana-2",
    "google/gemini-3.1-flash-image": "nano-banana-2",
    "google/gemini-3-1-flash-lite-image": "nano-banana-2-lite",
    "google/gemini-3.1-flash-lite-image": "nano-banana-2-lite",
    "google/nano-banana-pro": "gemini-3-pro-image",
    "google/gemini-3-pro-image-preview": "gemini-3-pro-image",
    "google/nano-banana-pro-edit": "nano-banana-pro-edit",
    "google/gemini-3-pro-image-preview-edit": "nano-banana-pro-edit",
    "gemini-3-pro-image-preview/edit": "nano-banana-pro-edit",
    "gemini-2.5-flash-image/edit": "gemini-2-5-flash-image-edit",
    "google/gemini-2.5-flash-image-edit": "gemini-2-5-flash-image-edit",
    "google/gemini-2.5-flash-image": "gemini-2-5-flash-image",
    "google/imagen4/preview": "imagen-4-0-generate-001",
    "google/imagen-4.0-fast-generate-001": "imagen-4-0-fast-generate-001",
    "google/imagen-3.0-generate-002": "imagen-3-api",
};

export function canonicalImageModelId(modelId: string): string {
    const t = modelId.trim();
    return LEGACY_IMAGE_MODEL_IDS[t] ?? t;
}

/** AIML `/v1/images/generations` model string (`aiml_api.modelId` when set). */
export function resolveAimlImageModelId(modelId: string): string {
    const id = canonicalImageModelId(modelId);
    const cfg = ImageModels.find((m) => m.id === id);
    return cfg?.aiml_api?.modelId ?? id;
}

export function aimlImageUsesEditsEndpoint(modelId: string): boolean {
    const id = canonicalImageModelId(modelId);
    return ImageModels.find((m) => m.id === id)?.aiml_api?.i2i?.endpoint === "edits";
}