// app/api/generate-sop/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

// Import your long prompt (use String.raw in that file to avoid backtick hassles)
import { SOP_PROMPT } from "../../prompt";

// Keep types lightweight on the server
type EncodedFile = { filename: string; dataUrl: string; mime: string };
type GeneratePayload = {
  model?: string;
  input: {
    pdf: EncodedFile | null;
    video: EncodedFile | null;
    transcriptText: string | null;
  };
};

// Your strict schema, in the Responses API "json_schema" format
const STRICT_SOP_JSON_SCHEMA = {
  name: "manufacturing_sop",
  schema: {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    required: ["Initial Setup: Required Tools and Materials", "Steps"],
    properties: {
      "Initial Setup: Required Tools and Materials": {
        type: "array",
        items: {
          type: "object",
          required: ["Category", "Part Number/Specification", "Description", "Quantity"],
          properties: {
            Category: { type: "string" },
            "Part Number/Specification": { type: "string" },
            Description: { type: "string" },
            Quantity: { type: "integer", minimum: 1 }
          }
        }
      },
      Steps: {
        type: "array",
        items: {
          type: "object",
          required: ["Purpose/Scope", "Tools and Materials", "Timestamp", "Procedure", "Image Suggestions", "Quality Checks"],
          properties: {
            "Purpose/Scope": { type: "string" },
            "Tools and Materials": {
              type: "array",
              items: {
                type: "object",
                required: ["Category", "Part Number/Specification", "Description", "Quantity"],
                properties: {
                  Category: { type: "string" },
                  "Part Number/Specification": { type: "string" },
                  Description: { type: "string" },
                  Quantity: { type: "integer", minimum: 1 }
                }
              }
            },
            Timestamp: {
              type: "object",
              required: ["Start", "End"],
              properties: {
                Start: { type: "string", pattern: "^[0-9]{1,2}:[0-5][0-9]$" },
                End:  { type: "string", pattern: "^[0-9]{1,2}:[0-5][0-9]$" }
              }
            },
            Procedure: { type: "array", items: { type: "string" }, minItems: 1 },
            "Image Suggestions": {
              type: "array",
              items: { type: "string", pattern: "^[0-9]{1,2}:[0-5][0-9]$" },
              minItems: 1
            },
            "Quality Checks": { type: "array", items: { type: "string" }, minItems: 1 }
          }
        }
      }
    }
  }
} as const;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GeneratePayload;

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!, // KEEP THIS SERVER-SIDE
    });

    // Optional: upload pdf/video to Files for retrieval via file_search
    const attachments: { file_id: string; tools: Array<{ type: "file_search" }> }[] = [];

    // one-liner: dataUrl -> Blob
    if (body.input.pdf) {
      const blob = await (await fetch(body.input.pdf.dataUrl)).blob();
      const file = await toFile(blob, body.input.pdf.filename, { type: body.input.pdf.mime });
      const uploaded = await client.files.create({ file, purpose: "assistants" });
      attachments.push({ file_id: uploaded.id, tools: [{ type: "file_search" }] });
    }

    if (body.input.video) {
      const blob = await (await fetch(body.input.video.dataUrl)).blob();
      const file = await toFile(blob, body.input.video.filename, { type: body.input.video.mime });
      const uploaded = await client.files.create({ file, purpose: "assistants" });
      attachments.push({ file_id: uploaded.id, tools: [{ type: "file_search" }] });
    }

    // Build the Responses API input
    const input: any[] = [
      { role: "system", content: [{ type: "input_text", text: SOP_PROMPT }] },
      {
        role: "user",
        content: [
          { type: "input_text", text: "Use only the provided video transcript and any attached files." },
          ...(body.input.transcriptText ? [{ type: "input_text", text: body.input.transcriptText }] : [])
        ],
        ...(attachments.length ? { attachments } : {})
      }
    ];

    const response = await client.responses.create({
      model: body.model || "gpt-4o-mini",
      input,
      response_format: {
        type: "json_schema",
        json_schema: STRICT_SOP_JSON_SCHEMA
      }
    })as unknown as Parameters<typeof client.responses.create>[0];

    // Expect pure JSON from the model; parse and return
    const text = (response as any).output_text as string;
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message ?? "Unexpected error" }, { status: 500 });
  }
}
