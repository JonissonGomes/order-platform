import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

// Google Gemini API configuration
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

const assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("GEMINI_API_KEY is not configured. Set BUILT_IN_FORGE_API_KEY environment variable.");
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

// Convert messages to Gemini format
const convertMessagesToGemini = (messages: Message[]) => {
  return messages.map(msg => {
    const normalized = normalizeMessage(msg);
    
    // Gemini uses 'parts' instead of 'content'
    let parts: any[] = [];
    
    if (typeof normalized.content === "string") {
      parts = [{ text: normalized.content }];
    } else if (Array.isArray(normalized.content)) {
      parts = normalized.content.map(part => {
        if (part.type === "text") {
          return { text: part.text };
        } else if (part.type === "image_url") {
          return {
            inlineData: {
              mimeType: "image/jpeg", // Default, should be extracted from URL if possible
              data: part.image_url.url, // In production, should fetch and base64 encode
            }
          };
        }
        return { text: JSON.stringify(part) };
      });
    }
    
    return {
      role: normalized.role === "assistant" ? "model" : normalized.role,
      parts,
    };
  });
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    maxTokens,
    max_tokens,
  } = params;

  // Convert messages to Gemini format
  const geminiContents = convertMessagesToGemini(messages);

  const payload: Record<string, unknown> = {
    contents: geminiContents,
  };

  // Add generation config
  const generationConfig: Record<string, unknown> = {};
  
  if (maxTokens || max_tokens) {
    generationConfig.maxOutputTokens = maxTokens || max_tokens;
  } else {
    generationConfig.maxOutputTokens = 32768;
  }

  if (generationConfig.maxOutputTokens) {
    payload.generationConfig = generationConfig;
  }

  // Add tools if provided
  if (tools && tools.length > 0) {
    payload.tools = tools.map(tool => ({
      functionDeclarations: [{
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      }]
    }));
  }

  // Handle tool choice
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice && normalizedToolChoice !== "auto" && normalizedToolChoice !== "none") {
    if (normalizedToolChoice !== "auto" && "function" in normalizedToolChoice) {
      payload.toolConfig = {
        functionCallingConfig: {
          mode: "ANY",
          allowedFunctionNames: [normalizedToolChoice.function.name],
        }
      };
    }
  }

  // Handle response format
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    if (normalizedResponseFormat.type === "json_object") {
      generationConfig.responseMimeType = "application/json";
    } else if (normalizedResponseFormat.type === "json_schema") {
      generationConfig.responseMimeType = "application/json";
      generationConfig.responseSchema = normalizedResponseFormat.json_schema.schema;
    }
    payload.generationConfig = generationConfig;
  }

  const apiKey = ENV.forgeApiKey;
  const url = `${GEMINI_API_URL}?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gemini API call failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  const geminiResponse = await response.json() as any;

  // Convert Gemini response to InvokeResult format
  const result: InvokeResult = {
    id: geminiResponse.candidates?.[0]?.finishReason || "unknown",
    created: Date.now(),
    model: "gemini-2.0-flash-exp",
    choices: geminiResponse.candidates?.map((candidate: any, index: number) => ({
      index,
      message: {
        role: "assistant" as Role,
        content: candidate.content?.parts?.map((part: any) => part.text).join("") || "",
      },
      finish_reason: candidate.finishReason || null,
    })) || [],
    usage: geminiResponse.usageMetadata ? {
      prompt_tokens: geminiResponse.usageMetadata.promptTokenCount || 0,
      completion_tokens: geminiResponse.usageMetadata.candidatesTokenCount || 0,
      total_tokens: geminiResponse.usageMetadata.totalTokenCount || 0,
    } : undefined,
  };

  return result;
}
