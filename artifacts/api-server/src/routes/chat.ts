import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, generationHistoryTable } from "@workspace/db";
import {
  generateNativeModuleFiles,
  generateNativeComponentFiles,
} from "../lib/codegenEngine.js";

const router: IRouter = Router();

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function validateChatRequest(body: unknown): { messages: ChatMessage[] } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.messages) || b.messages.length === 0) return null;
  const messages: ChatMessage[] = [];
  for (const m of b.messages) {
    if (!m || typeof m !== "object") return null;
    const msg = m as Record<string, unknown>;
    if (typeof msg.content !== "string") return null;
    if (msg.role !== "user" && msg.role !== "assistant") return null;
    messages.push({ role: msg.role, content: msg.content });
  }
  return { messages };
}

const SYSTEM_PROMPT = `You are an expert React Native New Architecture engineer specializing in TurboModules (NativeModule) and Fabric Components (NativeComponent). You help developers generate TypeScript specification files for native modules and components.

When a user asks you to create, build, or generate a native module or component, you MUST:

1. First, briefly explain what you are going to create (1-2 sentences).
2. Then output a properly formatted TypeScript specification wrapped in a special code block.
3. Start the code block with a metadata comment line EXACTLY like this (no spaces around =):
   \`\`\`typescript
   // @codegen moduleName=<PascalCase> specType=<NativeModule|NativeComponent> platform=<android|ios|both>

4. Rules for the metadata comment:
   - moduleName must be PascalCase, e.g. "CameraModule", "BluetoothManager", "LocationService"
   - specType must be exactly "NativeModule" or "NativeComponent"
   - platform must be "android", "ios", or "both"

5. After the metadata comment, write the complete TypeScript spec:
   - For NativeModule: extends TurboModule with all methods typed
   - For NativeComponent: uses NativeComponentType with all props typed
   - Follow React Native New Architecture patterns strictly
   - Include all necessary imports from 'react-native'

Example for NativeModule:
\`\`\`typescript
// @codegen moduleName=StorageModule specType=NativeModule platform=both
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('StorageModule');
\`\`\`

Example for NativeComponent:
\`\`\`typescript
// @codegen moduleName=ProgressView specType=NativeComponent platform=both
import type { ViewProps } from 'react-native';
import type { Double } from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

interface NativeProps extends ViewProps {
  progress: Double;
  color?: string;
  trackColor?: string;
}

export default codegenNativeComponent<NativeProps>('ProgressView');
\`\`\`

After showing the spec, briefly mention what the generated files will include.

If the user asks general questions about React Native New Architecture, TurboModules, or Fabric, answer helpfully without generating code unless asked.

If the user asks to modify or improve a previous spec, generate the updated version in the same format.

Always be concise and focused. Do not add unnecessary explanations.`;

function extractCodegenSpec(text: string): {
  moduleName: string;
  specType: "NativeModule" | "NativeComponent";
  platform: "android" | "ios" | "both";
  spec: string;
} | null {
  // Match ```typescript blocks containing @codegen metadata
  const codeBlockRegex = /```typescript\s*\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const blockContent = match[1];
    const metaMatch = blockContent.match(
      /\/\/ @codegen moduleName=(\S+)\s+specType=(NativeModule|NativeComponent)\s+platform=(android|ios|both)/
    );

    if (metaMatch) {
      return {
        moduleName: metaMatch[1],
        specType: metaMatch[2] as "NativeModule" | "NativeComponent",
        platform: metaMatch[3] as "android" | "ios" | "both",
        spec: blockContent,
      };
    }
  }

  return null;
}

router.post("/codegen/chat", async (req, res): Promise<void> => {
  const parsed = validateChatRequest(req.body);
  if (!parsed) {
    res.status(400).json({ error: "Invalid request: messages array with role/content required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const { messages } = parsed;

  const chatMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  let fullResponse = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...chatMessages,
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ type: "token", content })}\n\n`);
      }
    }

    // Try to extract and run codegen from the response
    const extracted = extractCodegenSpec(fullResponse);
    if (extracted) {
      const { moduleName, specType, platform, spec } = extracted;

      let files;
      if (specType === "NativeModule") {
        files = generateNativeModuleFiles(moduleName, platform, spec);
      } else {
        files = generateNativeComponentFiles(moduleName, platform, spec);
      }

      // Save to history
      const [record] = await db
        .insert(generationHistoryTable)
        .values({
          moduleName,
          specType,
          platform,
          spec,
          files: JSON.stringify(files),
          fileCount: files.length,
        })
        .returning();

      res.write(
        `data: ${JSON.stringify({
          type: "generated",
          id: record.id,
          moduleName,
          specType,
          platform,
          files,
          generatedAt: record.generatedAt.toISOString(),
        })}\n\n`
      );
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
    res.end();
  }
});

export default router;
