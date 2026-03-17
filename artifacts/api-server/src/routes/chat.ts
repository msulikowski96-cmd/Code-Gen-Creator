import { Router, type IRouter } from "express";
import { ai } from "@workspace/integrations-gemini-ai";
import { db, generationHistoryTable } from "@workspace/db";

const router: IRouter = Router();

const GEMINI_MODEL = "gemini-3-flash-preview";

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

const SYSTEM_PROMPT = `You are an expert app developer and AI assistant. You can generate complete, production-ready applications based on user descriptions.

You support THREE generation modes:

---

## MODE 1: React Native Mobile App (iOS + Android)

When the user asks to build a mobile app, create a complete React Native (TypeScript) project.

Output files using this EXACT format for EACH file:

### FILE: <path/filename> | platform: <android|ios|shared> | language: <language>
\`\`\`<language>
<code here>
\`\`\`

Example files for a React Native app:
- ### FILE: App.tsx | platform: shared | language: tsx
- ### FILE: src/screens/HomeScreen.tsx | platform: shared | language: tsx
- ### FILE: src/components/Button.tsx | platform: shared | language: tsx
- ### FILE: src/navigation/AppNavigator.tsx | platform: shared | language: tsx
- ### FILE: package.json | platform: shared | language: json
- ### FILE: android/app/build.gradle | platform: android | language: gradle
- ### FILE: ios/Podfile | platform: ios | language: text

Always include:
1. App.tsx (root component with navigation)
2. At least 2-3 screens with realistic UI
3. package.json with all necessary dependencies
4. Basic navigation setup (React Navigation)
5. TypeScript types where needed

---

## MODE 2: Web App (React + TypeScript)

When the user asks to build a website or web app, create a complete React + TypeScript + Vite project.

Output files using the same format:
- ### FILE: src/App.tsx | platform: shared | language: tsx
- ### FILE: src/pages/HomePage.tsx | platform: shared | language: tsx
- ### FILE: src/components/Header.tsx | platform: shared | language: tsx
- ### FILE: src/index.css | platform: shared | language: css
- ### FILE: package.json | platform: shared | language: json
- ### FILE: index.html | platform: shared | language: xml

Always include:
1. App.tsx with routing
2. Multiple pages/components
3. CSS styling (modern, clean design)
4. package.json
5. Realistic, functional UI

---

## MODE 3: React Native Native Module / Component (advanced)

When the user specifically asks for a native module, TurboModule, Fabric component, or native bridge code, generate the TypeScript spec AND native implementation files.

File examples:
- ### FILE: NativeModule.ts | platform: shared | language: typescript  (TypeScript spec)
- ### FILE: NativeModuleImpl.java | platform: android | language: java
- ### FILE: NativeModuleImpl.kt | platform: android | language: kotlin
- ### FILE: NativeModule.h | platform: ios | language: objc
- ### FILE: NativeModule.mm | platform: ios | language: objc

---

## IMPORTANT RULES

1. ALWAYS generate real, working code — no placeholder comments like "// implement here"
2. Make the UI beautiful and modern (use Tailwind-style or inline styles)
3. Include realistic example data so the app looks complete
4. Choose the right mode based on what the user asked:
   - "app for iPhone/Android" → MODE 1
   - "website/web app" → MODE 2
   - "native module/TurboModule/Fabric" → MODE 3
5. Before generating files, write ONE short paragraph explaining what you will build
6. Generate at least 5-8 files for any app
7. Language values must be one of: tsx, jsx, typescript, javascript, java, kotlin, swift, objc, cpp, css, json, xml, gradle, markdown, text

---

## LANGUAGE REFERENCE

File extension → language value:
- .tsx → tsx
- .ts → typescript
- .jsx → jsx
- .js → javascript
- .java → java
- .kt → kotlin
- .swift → swift
- .m / .mm / .h → objc
- .cpp / .cc → cpp
- .css → css
- .json → json
- .xml / .html → xml
- .gradle → gradle
- .md → markdown
- other → text
`;

interface ParsedFile {
  filename: string;
  platform: "android" | "ios" | "shared";
  language: string;
  content: string;
}

function detectLanguageFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    tsx: "tsx", ts: "typescript", jsx: "jsx", js: "javascript",
    java: "java", kt: "kotlin", swift: "swift",
    m: "objc", mm: "objc", h: "objc",
    cpp: "cpp", cc: "cpp", c: "cpp",
    css: "css", json: "json", xml: "xml", html: "xml",
    gradle: "gradle", md: "markdown",
  };
  return map[ext] ?? "text";
}

function parseGeneratedFiles(text: string): ParsedFile[] {
  const files: ParsedFile[] = [];

  // Pattern: ### FILE: <path> | platform: <p> | language: <l>\n```<lang>\n<code>\n```
  const fileBlockRegex =
    /###\s*FILE:\s*([^\|]+)\s*\|\s*platform:\s*(android|ios|shared)\s*\|\s*language:\s*(\w+)\s*\n```(?:\w+)?\n([\s\S]*?)```/g;

  let match;
  while ((match = fileBlockRegex.exec(text)) !== null) {
    const filename = match[1].trim();
    const platform = match[2].trim() as "android" | "ios" | "shared";
    const language = match[3].trim();
    const content = match[4];

    files.push({ filename, platform, language, content });
  }

  return files;
}

function detectAppType(files: ParsedFile[]): { appName: string; specType: string; platform: string } {
  const hasAndroid = files.some((f) => f.platform === "android");
  const hasIos = files.some((f) => f.platform === "ios");
  const hasPackageJson = files.some((f) => f.filename === "package.json");
  const hasAppTsx = files.some((f) => f.filename === "App.tsx" || f.filename.endsWith("App.tsx"));

  // Try to extract app name from package.json
  let appName = "GeneratedApp";
  const pkgFile = files.find((f) => f.filename === "package.json");
  if (pkgFile) {
    const nameMatch = pkgFile.content.match(/"name"\s*:\s*"([^"]+)"/);
    if (nameMatch) appName = nameMatch[1];
  }

  let specType = "WebApp";
  let platform = "shared";

  if (hasAndroid || hasIos || hasAppTsx) {
    specType = "ReactNativeApp";
    if (hasAndroid && hasIos) platform = "both";
    else if (hasAndroid) platform = "android";
    else if (hasIos) platform = "ios";
    else platform = "shared";
  } else if (hasPackageJson) {
    specType = "WebApp";
    platform = "shared";
  }

  return { appName, specType, platform };
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

  const geminiContents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  let fullResponse = "";

  try {
    const stream = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: geminiContents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 32000,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ type: "token", content: text })}\n\n`);
      }
    }

    // Parse generated files from the response
    const files = parseGeneratedFiles(fullResponse);

    if (files.length > 0) {
      // Enrich language from filename if needed
      const enriched = files.map((f) => ({
        filename: f.filename,
        platform: f.platform,
        language: f.language || detectLanguageFromFilename(f.filename),
        content: f.content,
      }));

      const { appName, specType, platform } = detectAppType(enriched);

      const [record] = await db
        .insert(generationHistoryTable)
        .values({
          moduleName: appName,
          specType,
          platform,
          spec: messages[messages.length - 1]?.content ?? "",
          files: JSON.stringify(enriched),
          fileCount: enriched.length,
        })
        .returning();

      res.write(
        `data: ${JSON.stringify({
          type: "generated",
          id: record.id,
          moduleName: appName,
          specType,
          platform,
          files: enriched,
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
